import { and, desc, eq, isNull } from 'drizzle-orm'
import { Router } from 'express'
import type { CookieOptions, Response } from 'express'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  type PublicUser,
} from '@arbor/shared'
import { getDb } from '../db/client'
import { oauthAccounts, passwordResetTokens, resumes, sessions, users, type UserRow } from '../db/schema'
import { ApiError, asyncHandler, clientIp, newId, param, parseBody, userAgent } from '../lib/http'
import { hashPassword, randomToken, sha256, verifyPassword } from '../auth/passwords'
import { ACCESS_COOKIE, REFRESH_COOKIE, requireAuth, toPublicUser } from '../auth/middleware'
import { REFRESH_TTL_SECONDS, signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/tokens'
import { env } from '../env'
import { logActivity } from '../services/activity'
import { pushStats } from '../services/stats'
import { rateLimit } from '../lib/rateLimit'
import { exchangeOAuthCode, isOAuthEnabled, oauthAuthorizeUrl } from '../auth/oauth'
import { defaultTemplateId, emptyResumeDocument, uid } from '@arbor/shared'

const router = Router()

/* ------------------------------------------------------------------ */
/* Session issuing                                                     */
/* ------------------------------------------------------------------ */

function cookieOptions(maxAgeSeconds: number, path: string): CookieOptions {
  return {
    httpOnly: true,
    secure: env.secureCookies,
    sameSite: env.cookieSameSite,
    path,
    maxAge: maxAgeSeconds * 1000,
  }
}

async function issueSession(res: Response, user: UserRow, req: { headers: Record<string, unknown>; ip?: string }) {
  const { db } = await getDb()
  const sessionId = newId('ses')
  const refreshToken = randomToken(48)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + REFRESH_TTL_SECONDS * 1000)

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    refreshTokenHash: sha256(refreshToken),
    userAgent: userAgent(req as never),
    ip: clientIp(req as never),
    expiresAt,
    lastUsedAt: now,
  })

  const claims = { sub: user.id, sid: sessionId, email: user.email, name: user.name, plan: user.plan, role: user.role }
  const [accessToken, refreshJwt] = await Promise.all([
    signAccessToken(claims),
    signRefreshToken({ sub: user.id, sid: sessionId, typ: 'refresh' }),
  ])

  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(15 * 60, '/'))
  res.cookie(REFRESH_COOKIE, refreshJwt, cookieOptions(REFRESH_TTL_SECONDS, '/api/auth'))

  const publicUser = toPublicUser(user)
  return { user: publicUser, accessToken, expiresIn: 15 * 60, refreshToken, sessionId }
}

function clearCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' })
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

router.post(
  '/register',
  rateLimit({ windowMs: 60_000, max: 12, keyPrefix: 'register' }),
  asyncHandler(async (req, res) => {
    const body = parseBody(registerSchema, req.body)
    const { db } = await getDb()
    const email = body.email.toLowerCase()

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing[0]) {
      throw ApiError.conflict('That email is already registered — try signing in.', { field: 'email' })
    }

    const id = newId('usr')
    const passwordHash = await hashPassword(body.password)
    const [row] = await db
      .insert(users)
      .values({
        id,
        email,
        passwordHash,
        name: body.name,
        locale: body.locale || 'en',
        lastLoginAt: new Date(),
      })
      .returning()
    const user = row ?? (await db.select().from(users).where(eq(users.id, id)).limit(1))[0]!
    const auth = await issueSession(res, user, req)
    await logActivity(user.id, 'auth.login', 'Created your Arbor account')
    void pushStats(user.id)
    res.status(201).json(auth)
  }),
)

router.post(
  '/login',
  rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'login' }),
  asyncHandler(async (req, res) => {
    const body = parseBody(loginSchema, req.body)
    const { db } = await getDb()
    const email = body.email.toLowerCase()
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    // Constant-ish work factor whether or not the user exists.
    const ok = user ? await verifyPassword(body.password, user.passwordHash) : false
    if (!user || !ok) throw ApiError.unauthorized('Email or password is incorrect')

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
    const auth = await issueSession(res, { ...user, lastLoginAt: new Date() }, req)
    await logActivity(user.id, 'auth.login', 'Signed in')
    void pushStats(user.id)
    res.json(auth)
  }),
)

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = (req as unknown as { cookies?: Record<string, string> }).cookies?.[REFRESH_COOKIE]
    if (!token) throw ApiError.unauthorized('No refresh token')
    const claims = await verifyRefreshToken(token)
    if (!claims) throw ApiError.unauthorized('Refresh token expired')

    const { db } = await getDb()
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, claims.sid), eq(sessions.userId, claims.sub), isNull(sessions.revokedAt)))
      .limit(1)
    if (!session || session.refreshTokenHash !== sha256(token) || session.expiresAt < new Date()) {
      clearCookies(res)
      throw ApiError.unauthorized('Session expired — sign in again')
    }

    const [user] = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1)
    if (!user) throw ApiError.unauthorized('Account no longer exists')

    // Rotate the refresh token on every use.
    const refreshToken = randomToken(48)
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000)
    await db
      .update(sessions)
      .set({ refreshTokenHash: sha256(refreshToken), expiresAt, lastUsedAt: new Date() })
      .where(eq(sessions.id, session.id))

    const accessToken = await signAccessToken({
      sub: user.id,
      sid: session.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      role: user.role,
    })
    const refreshJwt = await signRefreshToken({ sub: user.id, sid: session.id, typ: 'refresh' })
    res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(15 * 60, '/'))
    res.cookie(REFRESH_COOKIE, refreshJwt, cookieOptions(REFRESH_TTL_SECONDS, '/api/auth'))
    res.json({ user: toPublicUser(user), accessToken, expiresIn: 15 * 60 })
  }),
)

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    if (req.sessionId) {
      await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, req.sessionId))
    }
    const refresh = (req as unknown as { cookies?: Record<string, string> }).cookies?.[REFRESH_COOKIE]
    if (refresh) {
      await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.refreshTokenHash, sha256(refresh)))
    }
    clearCookies(res)
    res.json({ ok: true })
  }),
)

router.post(
  '/logout-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.userId, req.user!.id))
    clearCookies(res)
    res.json({ ok: true })
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: toPublicUser(req.user!) })
  }),
)

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = parseBody(updateProfileSchema, req.body)
    const { db } = await getDb()
    const [row] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning()
    res.json({ user: toPublicUser(row ?? req.user!) })
  }),
)

router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = parseBody(changePasswordSchema, req.body)
    const { db } = await getDb()
    const ok = await verifyPassword(body.currentPassword, req.user!.passwordHash)
    if (!ok) throw ApiError.badRequest('Current password is wrong', { field: 'currentPassword' })
    const passwordHash = await hashPassword(body.newPassword)
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
    // Invalidate other sessions, keep this one.
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, req.user!.id)))
    res.json({ ok: true })
  }),
)

router.get(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    const rows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, req.user!.id), isNull(sessions.revokedAt)))
      .orderBy(desc(sessions.lastUsedAt))
      .limit(20)
    res.json({
      sessions: rows.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ip: s.ip,
        createdAt: s.createdAt.toISOString(),
        lastUsedAt: s.lastUsedAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        current: s.id === req.sessionId,
      })),
    })
  }),
)

router.delete(
  '/sessions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { db } = await getDb()
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, param(req, 'id')), eq(sessions.userId, req.user!.id)))
    res.json({ ok: true })
  }),
)

/* ------------------------------------------------------------------ */
/* Password reset                                                      */
/* ------------------------------------------------------------------ */

router.post(
  '/forgot-password',
  rateLimit({ windowMs: 60_000, max: 8, keyPrefix: 'forgot' }),
  asyncHandler(async (req, res) => {
    const body = parseBody(forgotPasswordSchema, req.body)
    const { db } = await getDb()
    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
    const response: { ok: true; devResetToken?: string } = { ok: true }

    if (user) {
      const token = randomToken(32)
      await db.insert(passwordResetTokens).values({
        id: newId('prt'),
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })
      const link = `${env.clientUrl}/reset-password?token=${token}`
      if (env.smtpUrl) {
        console.log(`[mail] (configure SMTP forwarding) reset link for ${user.email}: ${link}`)
      } else {
        console.log(`\n  🔑 Password reset link for ${user.email}:\n  ${link}\n`)
      }
      if (!env.isProd) response.devResetToken = token
    }
    res.json(response)
  }),
)

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const body = parseBody(resetPasswordSchema, req.body)
    const { db } = await getDb()
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, sha256(body.token)))
      .limit(1)
    if (!row || row.usedAt || row.expiresAt < new Date()) throw ApiError.badRequest('This reset link is invalid or expired')
    const passwordHash = await hashPassword(body.password)
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId))
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id))
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, row.userId))
    res.json({ ok: true })
  }),
)

/* ------------------------------------------------------------------ */
/* OAuth                                                               */
/* ------------------------------------------------------------------ */

router.get('/oauth/:provider', (req, res, next) => {
  const provider = param(req, 'provider')
  if (!isOAuthEnabled(provider)) return next(ApiError.notFound('Provider not configured'))
  const state = randomToken(24)
  res.cookie('arbor_oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000, path: '/' })
  res.redirect(oauthAuthorizeUrl(provider, state))
})

router.get(
  '/oauth/:provider/callback',
  asyncHandler(async (req, res, next) => {
    const provider = param(req, 'provider')
    if (!isOAuthEnabled(provider)) return next(ApiError.notFound('Provider not configured'))
    const code = String(req.query.code ?? '')
    if (!code) return next(ApiError.badRequest('Missing OAuth code'))

    const profile = await exchangeOAuthCode(provider, code)
    const { db } = await getDb()

    const [existingLink] = await db
      .select()
      .from(oauthAccounts)
      .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerAccountId, profile.providerAccountId)))
      .limit(1)

    let user: UserRow | undefined
    if (existingLink) {
      ;[user] = await db.select().from(users).where(eq(users.id, existingLink.userId)).limit(1)
    } else {
      const email = profile.email?.toLowerCase()
      if (email) {
        ;[user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
      }
      if (!user) {
        const id = newId('usr')
        const [created] = await db
          .insert(users)
          .values({
            id,
            email: email || `${provider}-${profile.providerAccountId}@users.noreply.arbor`,
            name: profile.name || 'New user',
            avatarUrl: profile.avatarUrl ?? null,
            emailVerifiedAt: email ? new Date() : null,
            lastLoginAt: new Date(),
          })
          .returning()
        user = created
      }
      if (user) {
        await db.insert(oauthAccounts).values({
          id: newId('oauth'),
          userId: user.id,
          provider,
          providerAccountId: profile.providerAccountId,
          email: email ?? null,
          profile: profile.raw as Record<string, unknown>,
        })
      }
    }

    if (!user) return next(ApiError.server('Could not sign you in with that provider'))
    await issueSession(res, { ...user, lastLoginAt: new Date() }, req)
    await logActivity(user.id, 'auth.login', `Signed in with ${provider}`)
    res.redirect(`${env.clientUrl}/dashboard?welcome=oauth`)
  }),
)

/* ------------------------------------------------------------------ */
/* Demo bootstrap (one tap preview account)                            */
/* ------------------------------------------------------------------ */

export const DEMO_EMAIL = 'demo@arbor.dev'
export const DEMO_PASSWORD = 'demo1234'

export async function ensureDemoUser() {
  const { db } = await getDb()
  const [existing] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1)
  if (existing) return existing

  const id = newId('usr')
  const [user] = await db
    .insert(users)
    .values({
      id,
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      name: 'Demo Builder',
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    })
    .returning()

  // A starter resume so the dashboard isn't empty.
  const doc = emptyResumeDocument()
  doc.profile = {
    fullName: 'Demo Builder',
    headline: 'Frontend Engineer',
    email: DEMO_EMAIL,
    phone: '+92 300 0000000',
    location: 'Karachi, Pakistan',
    website: '',
    linkedin: 'linkedin.com/in/demo',
    github: 'github.com/demo',
    summary: '',
  }
  doc.experience = [
    {
      id: uid('exp'),
      company: 'Northwind Labs',
      role: 'Frontend Engineer',
      location: 'Remote',
      startDate: 'Jan 2023',
      endDate: '',
      current: true,
      bullets: [
        'Shipped a design system in React and TypeScript adopted by 4 product teams.',
        'Cut first-contentful-paint from 3.4s to 1.2s by code-splitting and prefetching routes.',
        'Automated visual regression testing in CI, catching 90% of layout bugs before review.',
      ],
      tech: ['React', 'TypeScript', 'Vite', 'Playwright'],
    },
  ]
  doc.skills = [
    { id: uid('skl'), name: 'Languages', items: ['TypeScript', 'JavaScript', 'HTML', 'CSS'] },
    { id: uid('skl'), name: 'Frontend', items: ['React', 'Next.js', 'Tailwind CSS', 'GSAP', 'Three.js'] },
    { id: uid('skl'), name: 'Cloud & DevOps', items: ['Docker', 'GitHub Actions', 'Vercel'] },
  ]
  doc.summary =
    'Frontend engineer with 5+ years building fast, accessible React interfaces, shipping design systems and measurable performance wins for product teams.'

  await db.insert(resumes).values({
    id: newId('res'),
    userId: id,
    title: 'Frontend Engineer — Demo',
    templateId: defaultTemplateId,
    document: doc,
  })
  await logActivity(id, 'resume.created', 'Created your first resume')
  return user ?? null
}

export type { PublicUser }
export default router
