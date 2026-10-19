import { mkdirSync } from 'node:fs'
import { sql } from 'drizzle-orm'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import * as schemaDef from './schema'
import { env } from '../env'

export type Schema = typeof schemaDef
/** One concrete Drizzle type for both drivers — they are API compatible. */
export type DB = PgliteDatabase<Schema>

export type DbHandle = {
  db: DB
  driver: 'neon' | 'pglite'
  label: string
}

/**
 * Zero-config database layer.
 *
 *  • DATABASE_URL set   → Neon serverless Postgres (production)
 *  • DATABASE_URL unset → embedded Postgres (PGlite/WASM) in ./.data/pgdata
 *
 * Both speak identical SQL through the same Drizzle query builder, so local
 * development is byte-for-byte compatible with production.
 */
export async function createDb(): Promise<DbHandle> {
  const url = env.databaseUrl

  if (url) {
    const { neon } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    const client = neon(url)
    const db = drizzle(client, { schema: schemaDef }) as unknown as DB
    return { db, driver: 'neon', label: 'Neon serverless Postgres' }
  }

  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  mkdirSync(env.pgDataDir, { recursive: true })
  const client = new PGlite(env.pgDataDir)
  await client.waitReady
  const db = drizzle(client, { schema: schemaDef }) as unknown as DB
  return { db, driver: 'pglite', label: 'Embedded Postgres (PGlite)' }
}

let instance: DbHandle | null = null

export async function getDb(): Promise<DbHandle> {
  if (!instance) {
    instance = await createDb()
    await bootstrap(instance.db)
  }
  return instance
}

/* ------------------------------------------------------------------ */
/* Idempotent bootstrap — no external migration runner needed           */
/* ------------------------------------------------------------------ */

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
     id text PRIMARY KEY,
     email text NOT NULL,
     password_hash text,
     name text NOT NULL,
     avatar_url text,
     plan text NOT NULL DEFAULT 'free',
     role text NOT NULL DEFAULT 'user',
     locale text NOT NULL DEFAULT 'en',
     email_verified_at timestamptz,
     last_login_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     id text PRIMARY KEY,
     user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     refresh_token_hash text NOT NULL,
     user_agent text,
     ip text,
     expires_at timestamptz NOT NULL,
     last_used_at timestamptz NOT NULL DEFAULT now(),
     revoked_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
  `CREATE TABLE IF NOT EXISTS oauth_accounts (
     id text PRIMARY KEY,
     user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     provider text NOT NULL,
     provider_account_id text NOT NULL,
     email text,
     profile jsonb,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS oauth_provider_account_unique ON oauth_accounts (provider, provider_account_id)`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
     id text PRIMARY KEY,
     user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     token_hash text NOT NULL,
     expires_at timestamptz NOT NULL,
     used_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS resumes (
     id text PRIMARY KEY,
     user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     title text NOT NULL DEFAULT 'Untitled resume',
     template_id text NOT NULL DEFAULT 'aurora',
     document jsonb NOT NULL,
     job_target jsonb,
     ats_report jsonb,
     is_public boolean NOT NULL DEFAULT false,
     public_slug text,
     views integer NOT NULL DEFAULT 0,
     exports integer NOT NULL DEFAULT 0,
     deleted_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS resumes_user_idx ON resumes (user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS resumes_slug_unique ON resumes (public_slug)`,
  `CREATE TABLE IF NOT EXISTS resume_versions (
     id text PRIMARY KEY,
     resume_id text NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
     document jsonb NOT NULL,
     label text NOT NULL DEFAULT 'Autosave',
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS resume_versions_resume_idx ON resume_versions (resume_id)`,
  `CREATE TABLE IF NOT EXISTS agent_runs (
     id text PRIMARY KEY,
     user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     resume_id text REFERENCES resumes(id) ON DELETE SET NULL,
     kind text NOT NULL DEFAULT 'generate',
     engine text NOT NULL DEFAULT 'nova-offline',
     model text NOT NULL DEFAULT '',
     status text NOT NULL DEFAULT 'running',
     input jsonb,
     steps jsonb,
     result jsonb,
     input_tokens integer NOT NULL DEFAULT 0,
     output_tokens integer NOT NULL DEFAULT 0,
     duration_ms integer NOT NULL DEFAULT 0,
     error text,
     created_at timestamptz NOT NULL DEFAULT now(),
     finished_at timestamptz
   )`,
  `CREATE INDEX IF NOT EXISTS agent_runs_user_idx ON agent_runs (user_id)`,
  `CREATE TABLE IF NOT EXISTS activities (
     id text PRIMARY KEY,
     user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     type text NOT NULL,
     message text NOT NULL,
     meta jsonb,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS activities_user_created_idx ON activities (user_id, created_at DESC)`,
]

async function bootstrap(db: DB) {
  for (const statement of DDL) {
    // eslint-disable-next-line no-await-in-loop
    await db.execute(sql.raw(statement))
  }
}

export { schemaDef }
