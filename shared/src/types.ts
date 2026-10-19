/**
 * Core domain types shared by the API, the agent engine and the React app.
 */
import type { z } from 'zod'
import type {
  experienceSchema,
  educationSchema,
  skillGroupSchema,
  projectSchema,
  certificationSchema,
  languageSchema,
  awardSchema,
  customSectionSchema,
  profileSchema,
  resumeDocumentSchema,
  atsReportSchema,
  jobTargetSchema,
} from './schemas'

export type Experience = z.infer<typeof experienceSchema>
export type Education = z.infer<typeof educationSchema>
export type SkillGroup = z.infer<typeof skillGroupSchema>
export type Project = z.infer<typeof projectSchema>
export type Certification = z.infer<typeof certificationSchema>
export type LanguageEntry = z.infer<typeof languageSchema>
export type Award = z.infer<typeof awardSchema>
export type CustomSection = z.infer<typeof customSectionSchema>
export type Profile = z.infer<typeof profileSchema>
export type ResumeDocument = z.infer<typeof resumeDocumentSchema>
export type AtsReport = z.infer<typeof atsReportSchema>
export type JobTarget = z.infer<typeof jobTargetSchema>

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export const SECTION_KEYS = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'awards',
  'custom',
] as const

export type SectionKey = (typeof SECTION_KEYS)[number]

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: 'Professional Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  awards: 'Awards & Honors',
  custom: 'Custom Sections',
}

export type ResumeSectionData = {
  experience: Experience[]
  education: Education[]
  skills: SkillGroup[]
  projects: Project[]
  certifications: Certification[]
  languages: LanguageEntry[]
  awards: Award[]
  custom: CustomSection[]
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

export const TEMPLATE_IDS = [
  'aurora',
  'onyx',
  'nova',
  'quantum',
  'meridian',
  'vertex',
  'lumen',
  'pulse',
] as const

export type TemplateId = (typeof TEMPLATE_IDS)[number]

export type TemplateMeta = {
  id: TemplateId
  name: string
  tagline: string
  /** Layout family drives print + preview styling. */
  layout: 'single' | 'split' | 'compact'
  /** Best suited industries — used by the agent's `pick_template` tool. */
  bestFor: string[]
  accent: string
  font: 'sans' | 'serif' | 'mono'
  atsSafe: boolean
  swatch: [string, string]
  badge?: string
}

/* ------------------------------------------------------------------ */
/* Resume record (API shape)                                           */
/* ------------------------------------------------------------------ */

export type ResumeRecord = {
  id: string
  userId: string
  title: string
  templateId: TemplateId
  document: ResumeDocument
  jobTarget: JobTarget | null
  atsReport: AtsReport | null
  isPublic: boolean
  publicSlug: string | null
  views: number
  createdAt: string
  updatedAt: string
}

export type ResumeSummary = Omit<ResumeRecord, 'document' | 'atsReport'> & {
  atsScore: number | null
  completeness: number
  words: number
  exports?: number
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export type PlanId = 'free' | 'pro' | 'team'
export type UserRole = 'user' | 'admin'

export type SessionInfo = {
  id: string
  userAgent: string | null
  ip: string | null
  createdAt: string
  lastUsedAt: string
  expiresAt: string
  current: boolean
}

export type PublicUser = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  plan: PlanId
  role: UserRole
  emailVerified: boolean
  locale: string
  createdAt: string
  lastLoginAt: string | null
}

export type AuthResponse = {
  user: PublicUser
  accessToken: string
  expiresIn: number
}

export type OAuthProvider = 'google' | 'github'

/* ------------------------------------------------------------------ */
/* Agent                                                               */
/* ------------------------------------------------------------------ */

export type AgentRunKind =
  | 'generate' // skills -> full resume
  | 'tailor' // resume + job description -> tailored resume
  | 'rewrite' // bullet polisher
  | 'summary' // professional summary only
  | 'interview' // guided intake questions
  | 'review' // ATS / recruiter review

export type AgentStatus = 'queued' | 'running' | 'completed' | 'failed'

export type AgentStepState = 'pending' | 'active' | 'done' | 'error'

export type AgentToolCall = {
  id: string
  name: string
  args: unknown
  result?: unknown
  state: AgentStepState
  label: string
  startedAt?: number
  endedAt?: number
}

export type AgentStep = {
  id: string
  index: number
  title: string
  detail?: string
  state: AgentStepState
  tool?: AgentToolCall
}

/**
 * Server → client events. Streamed over NDJSON for a single run *and*
 * mirrored on the realtime socket so the dashboard stays live.
 */
export type AgentEvent =
  | { type: 'run:start'; runId: string; kind: AgentRunKind; model: string; engine: AgentEngine }
  | { type: 'step'; step: AgentStep }
  | { type: 'tool:start'; call: AgentToolCall }
  | { type: 'tool:end'; call: AgentToolCall }
  | { type: 'token'; text: string }
  | { type: 'patch'; document: ResumeDocument; note?: string }
  | { type: 'ats'; report: AtsReport }
  | { type: 'message'; role: 'assistant' | 'system'; text: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number; costUsd: number | null }
  | { type: 'run:end'; runId: string; status: AgentStatus; durationMs: number; steps: AgentStep[] }
  | { type: 'error'; message: string; recoverable: boolean }

export type AgentEngine = 'openrouter' | 'nova-offline'

export type AgentRunRecord = {
  id: string
  userId: string
  resumeId: string | null
  kind: AgentRunKind
  engine: AgentEngine
  model: string
  status: AgentStatus
  steps: AgentStep[]
  inputTokens: number
  outputTokens: number
  durationMs: number
  createdAt: string
  finishedAt: string | null
}

export type AgentRunRequest = {
  kind: AgentRunKind
  resumeId?: string | null
  /** Raw skills / experience dump from the user. */
  skills?: string
  targetRole?: string
  industry?: string
  seniority?: string
  jobDescription?: string
  yearsExperience?: number
  /** Extra free-form instructions ("keep it to one page", "German market"). */
  instructions?: string
  /** Starting document when the client already has one in the editor. */
  document?: ResumeDocument | null
  templateId?: TemplateId | null
  locale?: string
}

/* ------------------------------------------------------------------ */
/* Realtime                                                            */
/* ------------------------------------------------------------------ */

export type RealtimeClientMessage =
  | { type: 'hello'; clientId?: string }
  | { type: 'subscribe'; resumeId: string }
  | { type: 'unsubscribe'; resumeId: string }
  | { type: 'presence'; resumeId: string; section?: string | null }
  | { type: 'ping' }

export type ActivityItem = {
  id: string
  type: 'resume.created' | 'resume.updated' | 'resume.deleted' | 'agent.run' | 'auth.login' | 'share.enabled' | 'export.pdf'
  message: string
  meta: Record<string, unknown> | null
  createdAt: string
}

export type DashboardStats = {
  resumes: number
  publicResumes: number
  agentRuns: number
  agentRunsToday: number
  avgAts: number
  bestAts: number
  completeness: number
  words: number
  views: number
  exports: number
  atsTrend: { date: string; score: number }[]
  activityByDay: { date: string; count: number }[]
  sectionCoverage: { key: SectionKey; filled: number; total: number }[]
  planUsage: { key: string; used: number; limit: number }[]
}

export type RealtimeServerMessage =
  | { type: 'hello'; connectionId: string; user: PublicUser; online: number; serverTime: string }
  | { type: 'presence'; resumeId: string; users: PresenceUser[] }
  | { type: 'online'; online: number }
  | { type: 'resume:updated'; resumeId: string; by: string; at: string; title?: string }
  | { type: 'resume:deleted'; resumeId: string }
  | { type: 'agent:event'; runId: string; event: AgentEvent }
  | { type: 'activity'; item: ActivityItem }
  | { type: 'stats'; stats: DashboardStats }
  | { type: 'notification'; level: 'info' | 'success' | 'warn' | 'error'; message: string }
  | { type: 'pong'; t: number }
  | { type: 'error'; message: string }

export type PresenceUser = {
  userId: string
  name: string
  color: string
  section?: string | null
  at: string
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export type ApiError = { error: string; code?: string; details?: unknown }

export const SENIORITY_LEVELS = [
  'intern',
  'entry',
  'junior',
  'mid',
  'senior',
  'staff',
  'principal',
  'lead',
  'manager',
  'director',
  'executive',
] as const

export type Seniority = (typeof SENIORITY_LEVELS)[number]
