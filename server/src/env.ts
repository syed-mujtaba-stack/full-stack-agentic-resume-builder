import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const here = dirname(fileURLToPath(import.meta.url))

// Root .env first (single source of truth), then a server-local override.
config({ path: resolve(here, '../../.env'), quiet: true })
config({ path: resolve(here, '../.env'), quiet: true })
config({ quiet: true })

function str(key: string, fallback = ''): string {
  const v = process.env[key]
  return v === undefined || v === '' ? fallback : v.trim()
}

function num(key: string, fallback: number): number {
  const v = Number(str(key, String(fallback)))
  return Number.isFinite(v) ? v : fallback
}

function bool(key: string, fallback = false): boolean {
  const v = str(key, '').toLowerCase()
  if (!v) return fallback
  return ['1', 'true', 'yes', 'on'].includes(v)
}

const isProd = str('NODE_ENV', 'development') === 'production'

const secret = str('AUTH_SECRET') || (isProd ? '' : 'dev-only-insecure-secret-change-me-please-32')

if (!secret && isProd) {
  throw new Error('AUTH_SECRET must be set in production')
}

export const env = {
  isProd,
  port: num('PORT', 8787),
  apiUrl: str('API_URL', `http://localhost:${num('PORT', 8787)}`),
  clientUrl: str('CLIENT_URL', 'http://localhost:5173'),
  origins: str('CLIENT_URL', 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  databaseUrl: str('DATABASE_URL'),
  /** Where the embedded Postgres keeps its files when DATABASE_URL is unset. */
  pgDataDir: str('PGDATA_DIR', resolve(here, '../../.data/pgdata')),
  authSecret: secret || randomBytes(32).toString('hex'),
  accessTtl: str('ACCESS_TOKEN_TTL', '15m'),
  refreshTtl: str('REFRESH_TOKEN_TTL', '30d'),
  cookieSameSite: (str('COOKIE_SAMESITE', isProd ? 'lax' : 'lax') as 'lax' | 'strict' | 'none'),
  secureCookies: bool('SECURE_COOKIES', isProd),
  openrouterApiKey: str('OPENROUTER_API_KEY'),
  openrouterModel: str('OPENROUTER_MODEL', 'openrouter/auto'),
  openrouterFallbackModel: str('OPENROUTER_FALLBACK_MODEL'),
  openrouterBaseUrl: str('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
  appName: str('APP_NAME', 'Arbor Resume'),
  appUrl: str('APP_URL', str('CLIENT_URL', 'http://localhost:5173')),
  google: { id: str('GOOGLE_CLIENT_ID'), secret: str('GOOGLE_CLIENT_SECRET') },
  github: { id: str('GITHUB_CLIENT_ID'), secret: str('GITHUB_CLIENT_SECRET') },
  smtpUrl: str('SMTP_URL'),
  mailFrom: str('MAIL_FROM', 'Arbor Resume <no-reply@arbor.dev>'),
  webDist: str('WEB_DIST', resolve(here, '../../web/dist')),
  /** Free-tier guardrails (kept generous — this is a free product). */
  limits: {
    agentRunsPerDay: num('LIMIT_AGENT_RUNS_PER_DAY', 100),
    resumes: num('LIMIT_RESUMES', 200),
  },
}

export type Env = typeof env
