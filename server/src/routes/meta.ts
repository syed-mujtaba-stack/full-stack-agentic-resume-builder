import { and, eq, sql } from 'drizzle-orm'
import { Router } from 'express'
import { TEMPLATES, hydrateResumeDocument, type ResumeDocument } from '@arbor/shared'
import { getDb } from '../db/client'
import { resumes } from '../db/schema'
import { ApiError, asyncHandler, param } from '../lib/http'
import { optionalAuth } from '../auth/middleware'
import { enabledProviders } from '../auth/oauth'
import { openRouterConfigured, SUGGESTED_MODELS } from '../agent/openrouter'
import { hub } from '../realtime/hub'
import { env } from '../env'

const router = Router()

const startedAt = Date.now()
const VERSION = '1.0.0'

router.get('/health', asyncHandler(async (_req, res) => {
  let dbDriver = 'unknown'
  let dbOk = false
  try {
    const { driver } = await getDb()
    dbDriver = driver
    dbOk = true
  } catch (err) {
    dbDriver = `error: ${(err as Error).message}`
  }
  res.json({
    ok: dbOk,
    version: VERSION,
    uptime: Math.round((Date.now() - startedAt) / 1000),
    database: { driver: dbDriver, ok: dbOk },
    agent: { engine: openRouterConfigured() ? 'openrouter' : 'nova-offline', configured: openRouterConfigured() },
    realtime: { online: hub.onlineUsers(), connections: hub.onlineConnections() },
    serverTime: new Date().toISOString(),
  })
}))

router.get('/config', (_req, res) => {
  res.json({
    appName: env.appName,
    version: VERSION,
    oauth: enabledProviders(),
    agent: {
      engine: openRouterConfigured() ? 'openrouter' : 'nova-offline',
      configured: openRouterConfigured(),
      models: SUGGESTED_MODELS,
      defaultModel: env.openrouterModel,
    },
    limits: env.limits,
    demo: { email: 'demo@arbor.dev', password: 'demo1234' },
    features: {
      templates: TEMPLATES.length,
      realtime: true,
      pdfExport: true,
      publicSharing: true,
      versionHistory: true,
    },
  })
})

router.get('/templates', (_req, res) => {
  res.json({ templates: TEMPLATES })
})

/** Public, shareable resume page (no auth required). */
router.get(
  '/r/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    const [row] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.publicSlug, param(req, 'slug')), eq(resumes.isPublic, true)))
      .limit(1)
    if (!row) throw ApiError.notFound('This resume is private or has been removed')

    const isOwner = req.user?.id === row.userId
    if (!isOwner) {
      await db.update(resumes).set({ views: row.views + 1 }).where(eq(resumes.id, row.id))
    }

    res.json({
      resume: {
        id: row.id,
        title: row.title,
        templateId: row.templateId,
        document: hydrateResumeDocument(row.document) as ResumeDocument,
        updatedAt: row.updatedAt.toISOString(),
        views: row.views + (isOwner ? 0 : 1),
        isOwner,
      },
    })
  }),
)

router.get('/stats/global', asyncHandler(async (_req, res) => {
  const { db } = await getDb()
  const [row] = await db
    .select({
      users: sql<number>`(select count(*)::int from users)`,
      resumes: sql<number>`(select count(*)::int from resumes where deleted_at is null)`,
      runs: sql<number>`(select count(*)::int from agent_runs)`,
    })
    .from(resumes)
    .limit(1)
  res.json({
    totals: row ?? { users: 0, resumes: 0, runs: 0 },
    online: hub.onlineUsers(),
  })
}))

export default router
