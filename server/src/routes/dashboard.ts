import { Router } from 'express'
import { requireAuth } from '../auth/middleware'
import { ApiError, asyncHandler } from '../lib/http'
import { recentActivity } from '../services/activity'
import { computeStats } from '../services/stats'
import { hub } from '../realtime/hub'
import { asyncHandler as wrap } from '../lib/http'

const router = Router()

router.use(requireAuth)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(50, Number(req.query.limit ?? 25) || 25)
    const [stats, activity] = await Promise.all([computeStats(req.user!.id), recentActivity(req.user!.id, limit)])
    res.json({
      stats,
      activity,
      realtime: {
        online: hub.onlineUsers(),
        connections: hub.onlineConnections(),
        websocketPath: '/ws',
      },
    })
  }),
)

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    res.json({ stats: await computeStats(req.user!.id) })
  }),
)

router.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const limit = Math.min(100, Number(req.query.limit ?? 25) || 25)
    res.json({ activity: await recentActivity(req.user!.id, limit) })
  }),
)

router.get('/presence', (_req, res) => {
  res.json({ online: hub.onlineUsers(), connections: hub.onlineConnections() })
})

router.post(
  '/refresh',
  wrap(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized()
    const stats = await computeStats(req.user.id)
    hub.broadcastToUser(req.user.id, { type: 'stats', stats })
    res.json({ stats })
  }),
)

export default router
