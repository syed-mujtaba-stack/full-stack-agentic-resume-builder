import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import type { AgentStep, ResumeDocument, AtsReport, JobTarget } from '@arbor/shared'

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    plan: text('plan').notNull().default('free'),
    role: text('role').notNull().default('user'),
    locale: text('locale').notNull().default('en'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email)],
)

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
)

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    email: text('email'),
    profile: jsonb('profile').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('oauth_provider_account_unique').on(t.provider, t.providerAccountId)],
)

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const resumes = pgTable(
  'resumes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('Untitled resume'),
    templateId: text('template_id').notNull().default('aurora'),
    document: jsonb('document').$type<ResumeDocument>().notNull(),
    jobTarget: jsonb('job_target').$type<JobTarget | null>(),
    atsReport: jsonb('ats_report').$type<AtsReport | null>(),
    isPublic: boolean('is_public').notNull().default(false),
    publicSlug: text('public_slug'),
    views: integer('views').notNull().default(0),
    exports: integer('exports').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('resumes_user_idx').on(t.userId), uniqueIndex('resumes_slug_unique').on(t.publicSlug)],
)

export const resumeVersions = pgTable(
  'resume_versions',
  {
    id: text('id').primaryKey(),
    resumeId: text('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    document: jsonb('document').$type<ResumeDocument>().notNull(),
    label: text('label').notNull().default('Autosave'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('resume_versions_resume_idx').on(t.resumeId)],
)

export const agentRuns = pgTable(
  'agent_runs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    resumeId: text('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
    kind: text('kind').notNull().default('generate'),
    engine: text('engine').notNull().default('nova-offline'),
    model: text('model').notNull().default(''),
    status: text('status').notNull().default('running'),
    input: jsonb('input').$type<Record<string, unknown>>(),
    steps: jsonb('steps').$type<AgentStep[]>().default([]),
    result: jsonb('result').$type<Record<string, unknown>>(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    durationMs: integer('duration_ms').notNull().default(0),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [index('agent_runs_user_idx').on(t.userId)],
)

export const activities = pgTable(
  'activities',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    message: text('message').notNull(),
    meta: jsonb('meta').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('activities_user_created_idx').on(t.userId, t.createdAt)],
)

export const schema = {
  users,
  sessions,
  oauthAccounts,
  passwordResetTokens,
  resumes,
  resumeVersions,
  agentRuns,
  activities,
}

export type UserRow = typeof users.$inferSelect
export type ResumeRow = typeof resumes.$inferSelect
export type SessionRow = typeof sessions.$inferSelect
export type AgentRunRow = typeof agentRuns.$inferSelect
export type ActivityRow = typeof activities.$inferSelect
