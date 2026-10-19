import { and, desc, eq, sql } from 'drizzle-orm'
import { Router } from 'express'
import {
  type AgentEvent,
  type AgentRunKind,
  type JobTarget,
  type ResumeDocument,
  type TemplateId,
  computeCompleteness,
  detectIndustry,
  hydrateResumeDocument,
  jobTargetSchema,
} from '@arbor/shared'
import { getDb } from '../db/client'
import { agentRuns, resumes } from '../db/schema'
import { ApiError, asyncHandler, newId } from '../lib/http'
import { requireAuth } from '../auth/middleware'
import { runAgent } from '../agent/orchestrator'
import { listModels, openRouterConfigured, SUGGESTED_MODELS } from '../agent/openrouter'
import { hub } from '../realtime/hub'
import { logActivity } from '../services/activity'
import { pushStats } from '../services/stats'
import { env } from '../env'
import { scoreResume } from '../lib/ats'

const router = Router()

router.use(requireAuth)

const VALID_KINDS: AgentRunKind[] = ['generate', 'tailor', 'rewrite', 'summary', 'interview', 'review']

function parseRunRequest(body: unknown) {
  const raw = (body ?? {}) as Record<string, unknown>
  const kind = VALID_KINDS.includes(raw.kind as AgentRunKind) ? (raw.kind as AgentRunKind) : 'generate'
  return {
    kind,
    resumeId: typeof raw.resumeId === 'string' ? raw.resumeId : null,
    skills: typeof raw.skills === 'string' ? raw.skills : '',
    targetRole: typeof raw.targetRole === 'string' ? raw.targetRole : '',
    industry: typeof raw.industry === 'string' ? raw.industry : '',
    seniority: typeof raw.seniority === 'string' ? raw.seniority : 'mid',
    jobDescription: typeof raw.jobDescription === 'string' ? raw.jobDescription : '',
    yearsExperience: typeof raw.yearsExperience === 'number' ? raw.yearsExperience : undefined,
    instructions: typeof raw.instructions === 'string' ? raw.instructions : '',
    templateId: (typeof raw.templateId === 'string' ? raw.templateId : null) as TemplateId | null,
    document: raw.document ? (hydrateResumeDocument(raw.document) as ResumeDocument) : null,
    model: typeof raw.model === 'string' ? raw.model : null,
    locale: typeof raw.locale === 'string' ? raw.locale : 'en',
  }
}

function interviewQuestions(doc: ResumeDocument, role: string): string[] {
  const c = computeCompleteness(doc)
  const industry = detectIndustry(`${role} ${doc.profile.headline} ${doc.skills.flatMap((s) => s.items).join(' ')}`)
  const questions = [
    `What exact title are you targeting next, and in which country/market?`,
    `Give me 3 numbers from your current role — a metric you moved, a volume you handled, a team size.`,
    `Which of these are genuinely yours? ${industry.keywords.slice(0, 8).join(', ')}`,
    `What is the single project you want a recruiter to remember?`,
  ]
  for (const check of c.checks.filter((x) => !x.ok).slice(0, 3)) questions.push(check.hint)
  return questions
}

/* ------------------------------------------------------------------ */
/* Streaming run (NDJSON)                                              */
/* ------------------------------------------------------------------ */

router.post(
  '/run',
  asyncHandler(async (req, res) => {
    const input = parseRunRequest(req.body)
    const { db } = await getDb()

    // Free-plan guardrail
    const [today] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(agentRuns)
      .where(
        sql`${agentRuns.userId} = ${req.user!.id} and ${agentRuns.createdAt} >= date_trunc('day', now())`,
      )
    if ((today?.c ?? 0) >= env.limits.agentRunsPerDay) {
      throw ApiError.tooMany(`Free plan includes ${env.limits.agentRunsPerDay} agent runs per day.`)
    }

    // Resolve the working document
    let document: ResumeDocument = input.document ?? (hydrateResumeDocument(null) as ResumeDocument)
    let templateId: TemplateId = input.templateId ?? 'aurora'
    let jobTarget: JobTarget | null = null

    if (input.resumeId) {
      const [row] = await db
        .select()
        .from(resumes)
        .where(and(eq(resumes.id, input.resumeId), eq(resumes.userId, req.user!.id)))
        .limit(1)
      if (!row) throw ApiError.notFound('Resume not found')
      // The client always ships its live editor state — that wins over the
      // stored copy so the agent never resurrects stale content.
      document = input.document ?? (hydrateResumeDocument(row.document) as ResumeDocument)
      templateId = (input.templateId ?? row.templateId) as TemplateId
      jobTarget = (row.jobTarget as JobTarget | null) ?? null
    }

    if (input.jobDescription.trim()) {
      jobTarget = jobTargetSchema.parse({
        ...(jobTarget ?? {}),
        role: input.targetRole || jobTarget?.role || '',
        industry: input.industry || jobTarget?.industry || '',
        seniority: input.seniority || 'mid',
        jobDescription: input.jobDescription,
      }) as JobTarget
    }

    const runId = newId('run')
    await db.insert(agentRuns).values({
      id: runId,
      userId: req.user!.id,
      resumeId: input.resumeId,
      kind: input.kind,
      engine: openRouterConfigured() ? 'openrouter' : 'nova-offline',
      model: openRouterConfigured() ? input.model || env.openrouterModel : 'nova-offline',
      status: 'running',
      input: { targetRole: input.targetRole, industry: input.industry, skillsLength: input.skills.length },
    })

    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    const started = Date.now()
    const steps: AgentEvent[] = []
    let finalDocument: ResumeDocument | null = null
    let finalAts = null as Awaited<ReturnType<typeof scoreResume>> | null
    let finalTemplate = templateId
    let usage = { inputTokens: 0, outputTokens: 0, costUsd: null as number | null }
    let engineUsed: 'openrouter' | 'nova-offline' = openRouterConfigured() ? 'openrouter' : 'nova-offline'
    let modelUsed = engineUsed === 'openrouter' ? input.model || env.openrouterModel : 'nova-offline'
    let errored = false

    const send = (event: AgentEvent) => {
      res.write(`${JSON.stringify(event)}\n`)
      hub.broadcastToUser(req.user!.id, { type: 'agent:event', runId, event })
    }

    try {
      if (input.kind === 'interview') {
        const questions = interviewQuestions(document, input.targetRole)
        send({ type: 'run:start', runId, kind: input.kind, model: 'rules', engine: 'nova-offline' })
        for (const q of questions) {
          send({ type: 'message', role: 'assistant', text: `• ${q}` })
        }
        send({
          type: 'run:end',
          runId,
          status: 'completed',
          durationMs: Date.now() - started,
          steps: questions.map((q, i) => ({ id: `${runId}_q${i}`, index: i, title: 'Question', detail: q, state: 'done' as const })),
        })
      } else {
        for await (const event of runAgent({ ...input, document, templateId, jobTarget })) {
          steps.push(event)
          send(event)
          if (event.type === 'patch') finalDocument = event.document
          if (event.type === 'ats') finalAts = event.report
          if (event.type === 'usage') {
            usage = {
              inputTokens: usage.inputTokens + event.inputTokens,
              outputTokens: usage.outputTokens + event.outputTokens,
              costUsd: event.costUsd ?? usage.costUsd,
            }
          }
          if (event.type === 'run:start') {
            engineUsed = event.engine
            modelUsed = event.model
          }
          if (event.type === 'error' && !event.recoverable) errored = true
        }
      }
    } catch (err) {
      errored = true
      const message = err instanceof Error ? err.message : 'The agent failed'
      send({ type: 'error', message, recoverable: false })
    } finally {
      // Persist the outcome
      const durationMs = Date.now() - started
      if (finalDocument && input.resumeId) {
        const ats = finalAts ?? scoreResume(finalDocument, jobTarget)
        await db
          .update(resumes)
          .set({
            document: finalDocument,
            templateId: finalTemplate,
            atsReport: ats,
            jobTarget,
            updatedAt: new Date(),
          })
          .where(eq(resumes.id, input.resumeId))
        hub.broadcastToResume(
          input.resumeId,
          {
            type: 'resume:updated',
            resumeId: input.resumeId,
            by: 'Arbor agent',
            at: new Date().toISOString(),
          },
          req.user!.id,
        )
        await logActivity(req.user!.id, 'agent.run', `Agent updated your resume — ATS ${ats.score}/100`, {
          resumeId: input.resumeId,
          atsScore: ats.score,
        })
      }

      await db
        .update(agentRuns)
        .set({
          status: errored ? 'failed' : 'completed',
          steps: steps.filter((s) => s.type === 'step').map((s: any) => s.step),
          result: finalDocument ? { templateId: finalTemplate, ats: finalAts?.score ?? null } : null,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          durationMs,
          engine: engineUsed,
          model: modelUsed,
          finishedAt: new Date(),
        })
        .where(eq(agentRuns.id, runId))

      void pushStats(req.user!.id)
      res.end()
    }
  }),
)

/* ------------------------------------------------------------------ */
/* Non-streaming helpers                                               */
/* ------------------------------------------------------------------ */

router.post(
  '/quick',
  asyncHandler(async (req, res) => {
    const input = parseRunRequest(req.body)
    const { runAgentSync } = await import('../agent/orchestrator')
    const result = runAgentSync({
      ...input,
      document: input.document ?? (hydrateResumeDocument(null) as ResumeDocument),
      templateId: input.templateId ?? 'aurora',
      jobTarget: null,
    })
    res.json({
      document: result.document,
      templateId: result.templateId,
      ats: result.ats,
      steps: result.steps,
      messages: result.messages,
    })
  }),
)

router.get(
  '/runs',
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    const rows = await db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.userId, req.user!.id))
      .orderBy(desc(agentRuns.createdAt))
      .limit(25)
    res.json({
      runs: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        engine: r.engine,
        model: r.model,
        status: r.status,
        durationMs: r.durationMs,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        createdAt: r.createdAt.toISOString(),
        finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
      })),
    })
  }),
)

router.get(
  '/models',
  asyncHandler(async (_req, res) => {
    const models = openRouterConfigured() ? await listModels() : SUGGESTED_MODELS
    res.json({
      configured: openRouterConfigured(),
      default: env.openrouterModel,
      fallback: env.openrouterFallbackModel || null,
      models,
    })
  }),
)

router.get('/config', (_req, res) => {
  res.json({
    engine: openRouterConfigured() ? 'openrouter' : 'nova-offline',
    configured: openRouterConfigured(),
    defaultModel: env.openrouterModel,
    models: SUGGESTED_MODELS,
    limits: env.limits,
  })
})

export default router
