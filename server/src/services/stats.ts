import { sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { activities, agentRuns, resumes } from '../db/schema'
import type { DashboardStats, ResumeDocument, SectionKey } from '@arbor/shared'
import { computeCompleteness, countWords, hydrateResumeDocument } from '@arbor/shared'
import { rows, dayKey } from './db'
import { hub } from '../realtime/hub'
import { env } from '../env'

const SECTION_LIST: SectionKey[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'awards',
]

export async function computeStats(userId: string): Promise<DashboardStats> {
  const { db } = await getDb()

  const [totals] = await rows<{
    resumes: number
    public_resumes: number
    views: number
    exports: number
    avg_ats: string | null
    best_ats: string | null
    agent_runs: string
    agent_runs_today: string
  }>(db, sql`
    select
      count(*) filter (where ${resumes.deletedAt} is null)::int as resumes,
      count(*) filter (where ${resumes.deletedAt} is null and ${resumes.isPublic})::int as public_resumes,
      coalesce(sum(${resumes.views}) filter (where ${resumes.deletedAt} is null), 0)::int as views,
      coalesce(sum(${resumes.exports}) filter (where ${resumes.deletedAt} is null), 0)::int as exports,
      avg((ats_report->>'score')::numeric) filter (where ats_report is not null and ${resumes.deletedAt} is null) as avg_ats,
      max((ats_report->>'score')::numeric) filter (where ats_report is not null and ${resumes.deletedAt} is null) as best_ats,
      (select count(*) from ${agentRuns} where ${agentRuns.userId} = ${userId})::text as agent_runs,
      (select count(*) from ${agentRuns}
         where ${agentRuns.userId} = ${userId}
           and ${agentRuns.createdAt} >= date_trunc('day', now()))::text as agent_runs_today
    from ${resumes}
    where ${resumes.userId} = ${userId}
  `)

  const atsTrendRows = await rows<{ day: string; score: string }>(db, sql`
    select to_char(date_trunc('day', ${activities.createdAt}), 'YYYY-MM-DD') as day,
           round(avg((meta->>'atsScore')::numeric))::text as score
    from ${activities}
    where ${activities.userId} = ${userId}
      and (meta->>'atsScore') is not null
      and ${activities.createdAt} >= now() - interval '13 days'
    group by 1
    order by 1 asc
  `)

  const activityRows = await rows<{ day: string; count: string }>(db, sql`
    select to_char(date_trunc('day', ${activities.createdAt}), 'YYYY-MM-DD') as day,
           count(*)::text as count
    from ${activities}
    where ${activities.userId} = ${userId}
      and ${activities.createdAt} >= now() - interval '13 days'
    group by 1
    order by 1 asc
  `)

  // Document-level metrics (completeness + words) are computed in JS for
  // portability — personal-scale workloads only.
  const docs = await db
    .select({ document: resumes.document })
    .from(resumes)
    .where(sql`${resumes.userId} = ${userId} and ${resumes.deletedAt} is null`)
    .limit(100)

  let words = 0
  let completenessTotal = 0
  const coverage: Record<SectionKey, number> = {
    custom: 0,
    summary: 0,
    experience: 0,
    education: 0,
    skills: 0,
    projects: 0,
    certifications: 0,
    languages: 0,
    awards: 0,
  }

  for (const row of docs) {
    const doc = hydrateResumeDocument(row.document) as ResumeDocument
    words += countWords(doc)
    completenessTotal += computeCompleteness(doc).score
    if (doc.summary.trim().length > 40) coverage.summary += 1
    if (doc.experience.length) coverage.experience += 1
    if (doc.education.length) coverage.education += 1
    if (doc.skills.some((s) => s.items.length)) coverage.skills += 1
    if (doc.projects.length) coverage.projects += 1
    if (doc.certifications.length) coverage.certifications += 1
    if (doc.languages.length) coverage.languages += 1
    if (doc.awards.length) coverage.awards += 1
    if (doc.custom.some((c) => c.items.length)) coverage.custom += 1
  }

  const total = Number(totals?.resumes ?? 0)

  // Fill the trend gaps so charts never look broken.
  const trend: { date: string; score: number }[] = []
  const trendMap = new Map(atsTrendRows.map((r) => [r.day, Math.round(Number(r.score))]))
  const activityMap = new Map(activityRows.map((r) => [r.day, Number(r.count)]))
  const activityByDay: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86_400_000)
    const key = dayKey(d)
    const score = trendMap.get(key)
    if (score !== undefined) trend.push({ date: key, score })
    else if (trend.length) trend.push({ date: key, score: trend[trend.length - 1]!.score })
    activityByDay.push({ date: key, count: activityMap.get(key) ?? 0 })
  }

  return {
    resumes: total,
    publicResumes: Number(totals?.public_resumes ?? 0),
    agentRuns: Number(totals?.agent_runs ?? 0),
    agentRunsToday: Number(totals?.agent_runs_today ?? 0),
    avgAts: Math.round(Number(totals?.avg_ats ?? 0)),
    bestAts: Math.round(Number(totals?.best_ats ?? 0)),
    completeness: total ? Math.round(completenessTotal / total) : 0,
    words,
    views: Number(totals?.views ?? 0),
    exports: Number(totals?.exports ?? 0),
    atsTrend: trend.length ? trend : [{ date: dayKey(new Date()), score: 0 }],
    activityByDay,
    sectionCoverage: SECTION_LIST.map((key) => ({
      key,
      filled: coverage[key] ?? 0,
      total,
    })),
    planUsage: [
      { key: 'AI agent runs / day', used: Number(totals?.agent_runs_today ?? 0), limit: env.limits.agentRunsPerDay },
      { key: 'Resumes', used: total, limit: env.limits.resumes },
    ],
  }
}

export async function pushStats(userId: string) {
  try {
    const stats = await computeStats(userId)
    hub.broadcastToUser(userId, { type: 'stats', stats })
    return stats
  } catch (err) {
    console.error('[stats] failed to compute', err)
    return null
  }
}
