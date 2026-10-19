import {
  type AgentEngine,
  type AgentEvent,
  type AgentRunRequest,
  type AgentStep,
  type AtsReport,
  type JobTarget,
  type ResumeDocument,
  type TemplateId,
  computeCompleteness,
  countWords,
  detectIndustry,
  estimatePages,
  extractJobKeywords,
  hydrateResumeDocument,
  recommendTemplate,
} from '@arbor/shared'
import { newId } from '../lib/http'
import { scoreResume } from '../lib/ats'
import { openRouterConfigured, stream, type ChatMessage, type ToolCall } from './openrouter'
import { TOOL_SPECS, executeTool, makeDraft, condenseDocument, type Draft } from './tools'
import { buildSummary, runOfflineAgent } from './offline'
import { env } from '../env'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type RunInput = AgentRunRequest & {
  document: ResumeDocument
  templateId: TemplateId
  jobTarget: JobTarget | null
  model?: string | null
}

const SYSTEM_PROMPT = `You are **Arbor**, a world-class career strategist: part senior technical recruiter, part executive resume writer, part ATS engineer. You produce resumes that survive parsers AND convince humans in 7 seconds.

Operating rules:
1. You edit the resume through TOOLS. Never just describe changes — call the write tools.
2. Never invent employers, dates, degrees or metrics the user did not imply. When a number is unknown, write it as a placeholder: [X]% or [N].
3. Every bullet: strong past-tense verb first, no "responsible for", no first person, 12–24 words, concrete artifact + measurable outcome.
4. Quantify relentlessly: %, counts, time saved, revenue, latency, volume, team size.
5. Mirror the language of the job description when it is truthful for the candidate.
6. No buzzwords: no "team player", "hard-working", "go-getter", "synergy", "ninja".
7. Group skills the way a recruiter scans them (Languages / Frontend / Cloud & DevOps / ...).
8. Keep it to 1 page under 10 years of experience, 2 pages above.
9. Call score_resume before you finalize. If the score is below 80, fix the top issues and score again.
10. Finish with finalize(notes) listing what you changed, then give a 3–5 line human summary of the strategy.

Tone: direct, specific, senior. No filler, no apologies, no markdown headings unless the user asks.`

function buildUserPrompt(input: RunInput): string {
  const parts: string[] = []
  parts.push(`TASK: ${input.kind.toUpperCase()}`)
  if (input.targetRole) parts.push(`Target role: ${input.targetRole}`)
  if (input.industry) parts.push(`Industry: ${input.industry}`)
  if (input.seniority) parts.push(`Seniority: ${input.seniority}`)
  if (input.yearsExperience) parts.push(`Years of experience: ${input.yearsExperience}`)
  if (input.locale) parts.push(`Locale/market: ${input.locale}`)
  if (input.skills?.trim()) parts.push(`\nRAW SKILLS & NOTES FROM THE CANDIDATE:\n"""\n${input.skills.trim().slice(0, 6000)}\n"""`)
  if (input.jobDescription?.trim())
    parts.push(`\nJOB DESCRIPTION:\n"""\n${input.jobDescription.trim().slice(0, 8000)}\n"""`)
  if (input.instructions?.trim()) parts.push(`\nEXTRA INSTRUCTIONS: ${input.instructions.trim().slice(0, 1500)}`)
  parts.push(`\nCURRENT RESUME (JSON):\n${JSON.stringify(condenseDocument(input.document)).slice(0, 12000)}`)
  parts.push(
    `\nWork through it: inspect_resume → industry_keywords → write the sections → score_resume → fix → finalize.`,
  )
  return parts.join('\n')
}

/* ------------------------------------------------------------------ */
/* Streaming helper for the offline engine (feels live, costs nothing)  */
/* ------------------------------------------------------------------ */

async function* streamText(text: string, chunkSize = 3, delay = 12): AsyncGenerator<AgentEvent> {
  const words = text.split(/(\s+)/)
  let buffer = ''
  for (const w of words) {
    buffer += w
    if (buffer.length >= chunkSize) {
      yield { type: 'token', text: buffer }
      buffer = ''
      await sleep(delay)
    }
  }
  if (buffer) yield { type: 'token', text: buffer }
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export async function* runAgent(input: RunInput): AsyncGenerator<AgentEvent> {
  const runId = newId('run')
  const startedAt = Date.now()
  const steps: AgentStep[] = []
  const engine: AgentEngine = openRouterConfigured() ? 'openrouter' : 'nova-offline'
  const model = input.model || env.openrouterModel

  yield { type: 'run:start', runId, kind: input.kind, model: engine === 'openrouter' ? model : 'nova-offline', engine }

  if (engine === 'openrouter') {
    try {
      yield* runLlmAgent(input, runId, steps)
      yield {
        type: 'run:end',
        runId,
        status: 'completed',
        durationMs: Date.now() - startedAt,
        steps,
      }
      return
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The model provider failed'
      yield { type: 'error', message: `${message} — falling back to the offline Nova engine.`, recoverable: true }
    }
  }

  yield* runOffline(input, runId, steps)
  yield { type: 'run:end', runId, status: 'completed', durationMs: Date.now() - startedAt, steps }
}

/* ------------------------------- LLM ------------------------------- */

async function* runLlmAgent(input: RunInput, runId: string, steps: AgentStep[]): AsyncGenerator<AgentEvent> {
  const draft: Draft = makeDraft(input.document, input.templateId, input.jobTarget)
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(input) },
  ]

  let inputTokens = 0
  let outputTokens = 0
  let costUsd: number | null = null
  let finalText = ''
  let rounds = 0
  const maxRounds = 8

  while (rounds < maxRounds) {
    rounds += 1
    let toolCalls: ToolCall[] = []
    let text = ''

    for await (const ev of stream({
      model: input.model || env.openrouterModel,
      messages,
      tools: TOOL_SPECS,
      toolChoice: rounds === maxRounds ? 'none' : 'auto',
      temperature: 0.35,
      maxTokens: 4000,
    })) {
      if (ev.type === 'token') {
        text += ev.text
        yield { type: 'token', text: ev.text }
      } else if (ev.type === 'tool_calls') {
        toolCalls = ev.calls
      } else if (ev.type === 'error') {
        throw new Error(ev.message)
      } else if (ev.type === 'done') {
        if (ev.usage) {
          inputTokens += ev.usage.promptTokens
          outputTokens += ev.usage.completionTokens
          costUsd = ev.usage.costUsd ?? costUsd
        }
        if (ev.usage) {
          yield { type: 'usage', inputTokens: ev.usage.promptTokens, outputTokens: ev.usage.completionTokens, costUsd: ev.usage.costUsd }
        }
      }
    }

    if (!toolCalls.length) {
      finalText = text
      break
    }

    messages.push({
      role: 'assistant',
      content: text || null,
      tool_calls: toolCalls,
    })

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {}
      try {
        args = call.function.arguments ? (JSON.parse(call.function.arguments) as Record<string, unknown>) : {}
      } catch {
        args = {}
      }
      const toolCall = {
        id: call.id,
        name: call.function.name,
        args,
        state: 'active' as const,
        label: `Calling ${call.function.name}`,
        startedAt: Date.now(),
      }
      yield { type: 'tool:start', call: toolCall }

      const result = executeTool(call.function.name, args, draft)
      const endedAt = Date.now()
      const ended = { ...toolCall, state: (result.ok ? 'done' : 'error') as 'done' | 'error', result: result.data, endedAt }
      yield { type: 'tool:end', call: ended }

      const step: AgentStep = {
        id: `${runId}_s${steps.length}`,
        index: steps.length,
        title: result.label,
        detail: call.function.name === 'score_resume' ? `Score ${(result.data as { score?: number })?.score ?? '?'}/100` : undefined,
        state: 'done',
        tool: ended,
      }
      steps.push(step)
      yield { type: 'step', step }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result.data).slice(0, 12000),
      })

      if (draft.changed) {
        yield { type: 'patch', document: draft.document, note: result.label }
        draft.changed = false
      }
    }
  }

  // Safety net: if the model never wrote a summary, fill one in.
  if (!draft.document.summary.trim()) {
    const industry = detectIndustry(`${input.targetRole ?? ''} ${input.skills ?? ''} ${draft.document.profile.headline}`)
    draft.document.summary = buildSummary({
      industry,
      role: input.targetRole ?? draft.document.profile.headline,
      years: input.yearsExperience ?? 0,
      tech: draft.document.skills.flatMap((s) => s.items),
    })
  }

  const jobTarget: JobTarget | null =
    draft.jobTarget ??
    (input.jobDescription?.trim()
      ? {
          role: input.targetRole ?? '',
          industry: input.industry ?? detectIndustry(input.jobDescription).label,
          seniority: (input.seniority as JobTarget['seniority']) ?? 'mid',
          company: '',
          jobDescription: input.jobDescription.slice(0, 20000),
          keywords: extractJobKeywords(input.jobDescription, 35),
        }
      : null)

  draft.jobTarget = jobTarget
  const ats = scoreResume(draft.document, jobTarget)
  yield { type: 'ats', report: ats }
  yield { type: 'patch', document: draft.document, note: 'Final polish' }
  yield {
    type: 'message',
    role: 'assistant',
    text:
      finalText.trim() ||
      `Done — ATS ${ats.score}/100 (${ats.grade}). ${ats.suggestions.slice(0, 2).join(' ')}`,
  }
}

/* ----------------------------- Offline ------------------------------ */

async function* runOffline(input: RunInput, runId: string, steps: AgentStep[]): AsyncGenerator<AgentEvent> {
  const result = runOfflineAgent(
    {
      kind: input.kind,
      skills: input.skills,
      targetRole: input.targetRole,
      industry: input.industry,
      seniority: input.seniority,
      jobDescription: input.jobDescription,
      yearsExperience: input.yearsExperience,
      instructions: input.instructions,
      templateId: input.templateId,
      document: input.document,
    },
    input.document,
  )

  for (const s of result.steps) {
    s.state = 'active'
    yield { type: 'step', step: { ...s, id: `${runId}_s${steps.length}`, index: steps.length } }
    await sleep(140)
    s.state = 'done'
    steps.push({ ...s, id: `${runId}_s${steps.length}`, index: steps.length })
    yield { type: 'step', step: { ...s, id: `${runId}_s${steps.length - 1}`, index: steps.length - 1 } }
  }

  yield { type: 'patch', document: result.document, note: 'Draft generated' }
  yield { type: 'ats', report: result.ats }

  const doc = result.document
  const completeness = computeCompleteness(doc)
  const narrative = [
    `I built a ${result.templateId} layout for a ${result.jobTarget?.role || input.targetRole || doc.profile.headline || 'your target role'} profile in ${result.jobTarget?.industry || 'your field'}.`,
    `ATS score: ${result.ats.score}/100 (${result.ats.grade}) — keywords ${result.ats.breakdown.keywords}, impact ${result.ats.breakdown.impact}, structure ${result.ats.breakdown.structure}.`,
    `Length: ${countWords(doc)} words (~${estimatePages(doc)} page${estimatePages(doc) > 1 ? 's' : ''}), profile ${completeness.score}% complete.`,
  ]
  if (result.ats.suggestions.length) narrative.push(`Next: ${result.ats.suggestions.slice(0, 3).join(' ')}`)
  for (const m of result.messages) narrative.push(m)

  const text = narrative.join(' ')
  yield { type: 'message', role: 'assistant', text: '' }
  yield* streamText(text)
  yield { type: 'usage', inputTokens: 0, outputTokens: 0, costUsd: 0 }
}

/* ------------------------------------------------------------------ */
/* Sync helper for non-streaming endpoints                              */
/* ------------------------------------------------------------------ */

export function runAgentSync(input: RunInput) {
  const result = runOfflineAgent(
    {
      kind: input.kind,
      skills: input.skills,
      targetRole: input.targetRole,
      industry: input.industry,
      seniority: input.seniority,
      jobDescription: input.jobDescription,
      yearsExperience: input.yearsExperience,
      templateId: input.templateId,
      document: input.document,
    },
    input.document,
  )
  return result
}

export { scoreResume, hydrateResumeDocument, recommendTemplate }
