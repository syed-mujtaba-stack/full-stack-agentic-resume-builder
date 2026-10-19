import { and, eq, isNull } from 'drizzle-orm'
import type { NextFunction, Request, Response } from 'express'
import { getDb } from '../db/client'
import { sessions, users, type UserRow } from '../db/schema'
import { ApiError, asyncHandler } from '../lib/http'
import { verifyAccessToken } from './tokens'

export const ACCESS_COOKIE = 'arbor_access'
export const REFRESH_COOKIE = 'arbor_refresh'

export function readAccessToken(req: Request): string | null {
  const header = req.headers.authorization
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim()
  }
  const cookie = (req as unknown as { cookies?: Record<string, string> }).cookies?.[ACCESS_COOKIE]
  return cookie ?? null
}

export type PublicUserShape = ReturnType<typeof toPublicUser>

export function toPublicUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    plan: row.plan as 'free' | 'pro' | 'team',
    role: row.role as 'user' | 'admin',
    emailVerified: !!row.emailVerifiedAt,
    locale: row.locale,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
  }
}

async function loadUser(claims: { sub: string; sid: string }): Promise<UserRow | null> {
  const { db } = await getDb()
  const rows = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1)
  const user = rows[0]
  if (!user) return null
  // A revoked/expired session invalidates the access token immediately.
  const sessionRows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, claims.sid), eq(sessions.userId, claims.sub), isNull(sessions.revokedAt)))
    .limit(1)
  const session = sessionRows[0]
  if (!session || session.expiresAt.getTime() < Date.now()) return null
  void db
    .update(sessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(sessions.id, claims.sid))
    .catch(() => undefined)
  return user
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = readAccessToken(req)
  if (!token) throw ApiError.unauthorized('Sign in to continue')
  const claims = await verifyAccessToken(token)
  if (!claims) throw ApiError.unauthorized('Your session expired — sign in again')
  const user = await loadUser(claims)
  if (!user) throw ApiError.unauthorized('Your session is no longer valid — sign in again')
  req.user = user
  req.sessionId = claims.sid
  req.rawAccessToken = token
  next()
})

export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = readAccessToken(req)
  if (token) {
    const claims = await verifyAccessToken(token)
    if (claims) {
      const user = await loadUser(claims)
      if (user) {
        req.user = user
        req.sessionId = claims.sid
        req.rawAccessToken = token
      }
    }
  }
  next()
})

export function requireRole(role: 'admin') {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized()
    if (req.user.role !== role) throw ApiError.forbidden('Admins only')
    next()
  })
}

/**
 * CSRF guard: cookies are httpOnly, so we require either a same-origin Origin
 * header or an explicit client header for every state-changing request.
 */
export function csrfGuard(allowedOrigins: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase()
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next()
    const origin = req.headers.origin
    const hasClientHeader = !!req.headers['x-arbor-client']
    if (hasClientHeader) return next()
    if (origin && allowedOrigins.includes(origin)) return next()
    return next(ApiError.forbidden('Cross-origin request blocked'))
  }
}
