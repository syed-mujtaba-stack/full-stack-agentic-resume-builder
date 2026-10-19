import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { Router } from 'express'
import {
  type AtsReport,
  type JobTarget,
  type ResumeDocument,
  type ResumeRecord,
  type ResumeSummary,
  type TemplateId,
  computeCompleteness,
  countWords,
  createResumeSchema,
  extractJobKeywords,
  duplicateResumeSchema,
  emptyResumeDocument,
  hydrateResumeDocument,
  jobTargetSchema,
  resumeDocumentSchema,
  slugify,
  updateResumeSchema,
} from '@arbor/shared'
import { getDb } from '../db/client'
import { activities, resumeVersions, resumes, type ResumeRow } from '../db/schema'
import { ApiError, asyncHandler, newId, param, parseBody } from '../lib/http'
import { requireAuth } from '../auth/middleware'
import { scoreResume } from '../lib/ats'
import { hub } from '../realtime/hub'
import { logActivity } from '../services/activity'
import { pushStats } from '../services/stats'
import { env } from '../env'

const router = Router()

router.use(requireAuth)

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function toRecord(row: ResumeRow): ResumeRecord {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    templateId: row.templateId as TemplateId,
    document: hydrateResumeDocument(row.document) as ResumeDocument,
    jobTarget: (row.jobTarget as JobTarget | null) ?? null,
    atsReport: (row.atsReport as AtsReport | null) ?? null,
    isPublic: row.isPublic,
    publicSlug: row.publicSlug,
    views: row.views,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toSummary(row: ResumeRow): ResumeSummary {
  const doc = hydrateResumeDocument(row.document) as ResumeDocument
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    templateId: row.templateId as TemplateId,
    jobTarget: (row.jobTarget as JobTarget | null) ?? null,
    isPublic: row.isPublic,
    publicSlug: row.publicSlug,
    views: row.views,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    atsScore: (row.atsReport as AtsReport | null)?.score ?? null,
    completeness: computeCompleteness(doc).score,
    words: countWords(doc),
  }
}

async function loadOwned(id: string, userId: string): Promise<ResumeRow> {
  const { db } = await getDb()
  const [row] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId), isNull(resumes.deletedAt)))
    .limit(1)
  if (!row) throw ApiError.notFound('Resume not found')
  return row
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    const rows = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.userId, req.user!.id), isNull(resumes.deletedAt)))
      .orderBy(desc(resumes.updatedAt))
      .limit(200)
    res.json({ resumes: rows.map(toSummary) })
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = parseBody(createResumeSchema, req.body ?? {})
    const { db } = await getDb()

    const count = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(resumes)
      .where(and(eq(resumes.userId, req.user!.id), isNull(resumes.deletedAt)))
    if ((count[0]?.c ?? 0) >= env.limits.resumes) {
      throw ApiError.tooMany(`Free plan includes ${env.limits.resumes} resumes.`)
    }

    const doc = body.document ? (hydrateResumeDocument(body.document) as ResumeDocument) : emptyResumeDocument()
    const id = newId('res')
    const [row] = await db
      .insert(resumes)
      .values({
        id,
        userId: req.user!.id,
        title: body.title,
        templateId: body.templateId,
        document: doc,
      })
      .returning()
    const record = toRecord(row!)
    await logActivity(req.user!.id, 'resume.created', `Created “${record.title}”`, { resumeId: id })
    void pushStats(req.user!.id)
    res.status(201).json({ resume: record })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await loadOwned(param(req, 'id'), req.user!.id)
    res.json({ resume: toRecord(row) })
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = parseBody(updateResumeSchema, req.body ?? {})
    const { db } = await getDb()
    const current = await loadOwned(param(req, 'id'), req.user!.id)

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    let nextDoc: ResumeDocument | null = null

    if (body.title !== undefined) patch.title = body.title
    if (body.templateId !== undefined) patch.templateId = body.templateId
    if (body.jobTarget !== undefined) patch.jobTarget = body.jobTarget
    if (body.atsReport !== undefined) patch.atsReport = body.atsReport
    if (body.isPublic !== undefined) {
      patch.isPublic = body.isPublic
      if (body.isPublic && !current.publicSlug) {
        patch.publicSlug = `${slugify(current.title)}-${newId('').slice(1, 7)}`
      }
    }

    if (body.document !== undefined) {
      const merged = {
        ...(hydrateResumeDocument(current.document) as ResumeDocument),
        ...body.document,
        meta: {
          ...(hydrateResumeDocument(current.document) as ResumeDocument).meta,
          ...(body.document.meta ?? {}),
        },
      }
      nextDoc = resumeDocumentSchema.parse(merged) as ResumeDocument
      patch.document = nextDoc
    }

    const [row] = await db.update(resumes).set(patch as never).where(eq(resumes.id, current.id)).returning()
    const record = toRecord(row ?? current)

    // Autosave a restore point at most once every 3 minutes.
    const shouldVersion = Boolean(nextDoc) && Date.now() - current.updatedAt.getTime() > 3 * 60 * 1000
    if (shouldVersion) {
      await db.insert(resumeVersions).values({
        id: newId('ver'),
        resumeId: current.id,
        document: current.document,
        label: 'Autosave',
      })
    }

    hub.broadcastToResume(
      record.id,
      { type: 'resume:updated', resumeId: record.id, by: req.user!.name, at: new Date().toISOString(), title: record.title },
      req.user!.id,
    )

    res.json({ resume: record, versioned: shouldVersion })
  }),
)

router.post(
  '/:id/score',
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    const row = await loadOwned(param(req, 'id'), req.user!.id)
    const doc = hydrateResumeDocument(row.document) as ResumeDocument
    const body = (req.body ?? {}) as { jobTarget?: unknown; jobDescription?: string; role?: string }
    let jobTarget: JobTarget | null = null
    if (body.jobTarget) {
      jobTarget = jobTargetSchema.parse(body.jobTarget) as JobTarget
    } else if (body.jobDescription?.trim()) {
      jobTarget = jobTargetSchema.parse({
        ...((row.jobTarget as JobTarget | null) ?? {}),
        role: body.role || (row.jobTarget as JobTarget | null)?.role || doc.profile.headline || '',
        jobDescription: body.jobDescription.slice(0, 20000),
        keywords: extractJobKeywords(body.jobDescription, 35),
      }) as JobTarget
    } else {
      jobTarget = (row.jobTarget as JobTarget | null) ?? null
    }
    const report = scoreResume(doc, jobTarget)

    const patch: Record<string, unknown> = {
      atsReport: report,
      updatedAt: new Date(),
    }
    if (jobTarget) patch.jobTarget = jobTarget
    await db.update(resumes).set(patch as never).where(eq(resumes.id, row.id))

    await logActivity(req.user!.id, 'resume.updated', `ATS scan: ${report.score}/100 (${report.grade})`, {
      resumeId: row.id,
      atsScore: report.score,
    })
    void pushStats(req.user!.id)
    res.json({ report })
  }),
)

router.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const body = parseBody(duplicateResumeSchema, req.body ?? {})
    const { db } = await getDb()
    const row = await loadOwned(param(req, 'id'), req.user!.id)
    const id = newId('res')
    const [created] = await db
      .insert(resumes)
      .values({
        id,
        userId: req.user!.id,
        title: body.title ?? `${row.title} (copy)`,
        templateId: row.templateId,
        document: row.document,
        jobTarget: row.jobTarget,
        atsReport: row.atsReport,
      })
      .returning()
    await logActivity(req.user!.id, 'resume.created', `Duplicated “${row.title}”`, { resumeId: id })
    void pushStats(req.user!.id)
    res.status(201).json({ resume: toRecord(created!) })
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    const row = await loadOwned(param(req, 'id'), req.user!.id)
    await db.update(resumes).set({ deletedAt: new Date(), isPublic: false }).where(eq(resumes.id, row.id))
    await logActivity(req.user!.id, 'resume.deleted', `Deleted “${row.title}”`)
    hub.broadcastToResume(row.id, { type: 'resume:deleted', resumeId: row.id }, req.user!.id)
    void pushStats(req.user!.id)
    res.json({ ok: true })
  }),
)

router.get(
  '/:id/versions',
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    await loadOwned(param(req, 'id'), req.user!.id)
    const rows = await db
      .select()
      .from(resumeVersions)
      .where(eq(resumeVersions.resumeId, param(req, 'id')))
      .orderBy(desc(resumeVersions.createdAt))
      .limit(20)
    res.json({
      versions: rows.map((v) => ({
        id: v.id,
        label: v.label,
        createdAt: v.createdAt.toISOString(),
        words: countWords(hydrateResumeDocument(v.document) as ResumeDocument),
      })),
    })
  }),
)

router.post(
  '/:id/versions/restore',
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    const row = await loadOwned(param(req, 'id'), req.user!.id)
    const versionId = String((req.body ?? {}).versionId ?? '')
    const [version] = await db.select().from(resumeVersions).where(eq(resumeVersions.id, versionId)).limit(1)
    if (!version) throw ApiError.notFound('Version not found')
    const [updated] = await db
      .update(resumes)
      .set({ document: version.document, updatedAt: new Date() })
      .where(eq(resumes.id, row.id))
      .returning()
    res.json({ resume: toRecord(updated ?? row) })
  }),
)

router.post(
  '/:id/share',
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    const row = await loadOwned(param(req, 'id'), req.user!.id)
    const enable = Boolean((req.body ?? {}).enable ?? !row.isPublic)
    const publicSlug = enable ? row.publicSlug || `${slugify(row.title)}-${newId('').slice(1, 7)}` : row.publicSlug
    const [updated] = await db
      .update(resumes)
      .set({ isPublic: enable, publicSlug, updatedAt: new Date() })
      .where(eq(resumes.id, row.id))
      .returning()
    await logActivity(
      req.user!.id,
      'share.enabled',
      enable ? `Published “${row.title}” publicly` : `Unpublished “${row.title}”`,
    )
    void pushStats(req.user!.id)
    res.json({ isPublic: enable, publicSlug, url: enable ? `/r/${publicSlug}` : null })
  }),
)

router.post(
  '/:id/export',
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    const row = await loadOwned(param(req, 'id'), req.user!.id)
    const [updated] = await db
      .update(resumes)
      .set({ exports: row.exports + 1 })
      .where(eq(resumes.id, row.id))
      .returning()
    await logActivity(req.user!.id, 'export.pdf', `Exported “${row.title}”`, { resumeId: row.id })
    void pushStats(req.user!.id)
    res.json({ exports: updated?.exports ?? row.exports + 1 })
  }),
)

router.get(
  '/:id/activity',
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    await loadOwned(param(req, 'id'), req.user!.id)
    const rows = await db
      .select()
      .from(activities)
      .where(sql`${activities.userId} = ${req.user!.id} and meta->>'resumeId' = ${req.params.id}`)
      .orderBy(desc(activities.createdAt))
      .limit(30)
    res.json({
      activity: rows.map((r) => ({
        id: r.id,
        type: r.type,
        message: r.message,
        meta: r.meta,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  }),
)

export default router
