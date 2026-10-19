import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  Copy,
  Eye,
  FileDown,
  FileText,
  Gauge,
  Plus,
  Radio,
  Share2,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react'
import { api } from '../lib/api'
import type { ActivityItem, DashboardStats, ResumeSummary } from '@arbor/shared'
import { Badge, Button, Card, EmptyState, Progress, Skeleton } from '../components/ui'
import { useAuth } from '../store/auth'
import { useRealtime } from '../store/realtime'
import { useUi } from '../store/ui'
import { useCountUp, useDrawPath, useReveal, gsap } from '../lib/gsap'
import { cn, timeAgo } from '../lib/utils'
import { useBuilder } from '../store/builder'
import { getTemplate } from '../templates/registry'
import { emptyResumeDocument } from '@arbor/shared'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const stats = useRealtime((s) => s.stats)
  const setStats = useRealtime((s) => s.setStats)
  const activity = useRealtime((s) => s.activity)
  const online = useRealtime((s) => s.online)
  const connected = useRealtime((s) => s.state === 'open')
  const notify = useUi((s) => s.notify)
  const { create } = useBuilder()
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const gridRef = useReveal<HTMLDivElement>({ stagger: 0.06 })

  const load = async () => {
    try {
      const [dash, list] = await Promise.all([
        api.get<{ stats: DashboardStats; activity: ActivityItem[] }>('/dashboard'),
        api.get<{ resumes: ResumeSummary[] }>('/resumes'),
      ])
      setStats(dash.stats)
      setResumes(list.resumes)
      useRealtime.setState({ activity: dash.activity })
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const newResume = async () => {
    const id = await create({ title: 'Untitled resume', templateId: 'aurora' })
    notify('Created a new resume', 'success')
    navigate(`/builder/${id}`)
  }

  const duplicate = async (id: string) => {
    const res = await api.post<{ resume: { id: string } }>(`/resumes/${id}/duplicate`, {})
    notify('Duplicated', 'success')
    void load()
    void res
  }

  const share = async (r: ResumeSummary) => {
    const res = await api.post<{ isPublic: boolean; publicSlug: string | null }>(`/resumes/${r.id}/share`, {
      enable: !r.isPublic,
    })
    notify(res.isPublic ? `Public at /r/${res.publicSlug}` : 'Unpublished', 'success')
    void load()
  }

  const remove = async (id: string) => {
    await api.del(`/resumes/${id}`)
    notify('Resume deleted', 'success')
    void load()
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
                connected
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                  : 'border-white/10 bg-white/5 text-slate-400',
              )}
            >
              <Radio className={cn('h-3 w-3', connected && 'animate-pulse')} />
              {connected ? `realtime · ${online} online` : 'connecting…'}
            </span>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
            {greeting()}, {user?.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {stats ? (
              <>
                {stats.resumes} resume{stats.resumes === 1 ? '' : 's'} · avg ATS {stats.avgAts} · {stats.agentRuns} agent
                runs
              </>
            ) : (
              'Loading your workspace…'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/templates')} icon={<FileText className="h-4 w-4" />}>
            Templates
          </Button>
          <Button onClick={newResume} icon={<Plus className="h-4 w-4" />}>
            New resume
          </Button>
        </div>
      </div>

      {/* stat cards */}
      <div ref={gridRef} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Resumes"
          value={stats?.resumes ?? 0}
          icon={<FileText className="h-4 w-4" />}
          hint={`${stats?.publicResumes ?? 0} public`}
        />
        <StatCard
          label="Average ATS"
          value={stats?.avgAts ?? 0}
          suffix="/100"
          icon={<Gauge className="h-4 w-4" />}
          hint={`best ${stats?.bestAts ?? 0}`}
        />
        <StatCard
          label="Agent runs"
          value={stats?.agentRuns ?? 0}
          icon={<Sparkles className="h-4 w-4" />}
          hint={`${stats?.agentRunsToday ?? 0} today`}
        />
        <StatCard
          label="Profile completion"
          value={stats?.completeness ?? 0}
          suffix="%"
          icon={<TrendingUp className="h-4 w-4" />}
          hint={`${stats?.words ?? 0} words written`}
        />
      </div>

      {/* charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">ATS score trend</h3>
              <p className="text-xs text-slate-500">Last 14 days of scans</p>
            </div>
            {connected && <Badge tone="success">live</Badge>}
          </div>
          {stats ? <TrendChart data={stats.atsTrend} /> : <Skeleton className="h-32" />}
        </Card>

        <Card className="p-5">
          <h3 className="mb-1 text-sm font-semibold text-white">Activity</h3>
          <p className="mb-4 text-xs text-slate-500">Edits, scans and agent runs</p>
          {stats ? <BarsChart data={stats.activityByDay} /> : <Skeleton className="h-32" />}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* resumes */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Your resumes</h3>
            <Link to="/templates" className="text-xs text-aurora-300 hover:underline">
              Browse templates
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : resumes.length === 0 ? (
            <EmptyState
              title="No resumes yet"
              hint="Create one from scratch or let the agent draft it from your skills in about 30 seconds."
              action={
                <Button onClick={newResume} icon={<Plus className="h-4 w-4" />}>
                  Create your first resume
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {resumes.map((r) => (
                <ResumeCard
                  key={r.id}
                  resume={r}
                  onOpen={() => navigate(`/builder/${r.id}`)}
                  onDuplicate={() => duplicate(r.id)}
                  onShare={() => share(r)}
                  onDelete={() => remove(r.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* side column */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-white">
              <Activity className="h-3.5 w-3.5 text-aurora-300" /> Live activity
            </h3>
            {activity.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nothing yet — edit a resume or run the agent and events will stream here instantly.
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {activity.slice(0, 14).map((a) => (
                  <div key={a.id} className="flex items-start gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aurora-400" />
                    <div className="min-w-0">
                      <p className="truncate text-xs text-slate-200">{a.message}</p>
                      <p className="text-[10px] text-slate-500">{timeAgo(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Section coverage</h3>
            <div className="space-y-2.5">
              {(stats?.sectionCoverage ?? []).map((s) => (
                <div key={s.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="capitalize text-slate-400">{s.key}</span>
                    <span className="tabular-nums text-slate-500">
                      {s.filled}/{s.total || 0}
                    </span>
                  </div>
                  <Progress value={s.total ? (s.filled / s.total) * 100 : 0} />
                </div>
              ))}
              {!stats && <Skeleton className="h-20" />}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-white">
              <Users className="h-3.5 w-3.5 text-emerald-300" /> Plan usage
            </h3>
            <div className="space-y-3">
              {(stats?.planUsage ?? []).map((u) => (
                <div key={u.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{u.key}</span>
                    <span className="tabular-nums text-slate-500">
                      {u.used}/{u.limit}
                    </span>
                  </div>
                  <Progress
                    value={(u.used / u.limit) * 100}
                    tone={(u.used / u.limit) > 0.8 ? 'amber' : 'mint'}
                  />
                </div>
              ))}
              {!stats && <Skeleton className="h-16" />}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Free forever for personal use. Self-host to lift every limit.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────  cards & charts  ───────────────────────── */

function StatCard({
  label,
  value,
  suffix,
  icon,
  hint,
}: {
  label: string
  value: number
  suffix?: string
  icon: React.ReactNode
  hint?: string
}) {
  const display = useCountUp(value, 1.2)
  return (
    <div data-reveal className="card card-hover p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-aurora-300">
          {icon}
        </span>
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
      </div>
      <p className="mt-4 font-display text-3xl font-bold tabular-nums text-white">
        {display}
        {suffix && <span className="text-base font-medium text-slate-500">{suffix}</span>}
      </p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function TrendChart({ data }: { data: { date: string; score: number }[] }) {
  const pathRef = useDrawPath(true)
  const points = useMemo(() => {
    if (data.length < 2) return { line: '', area: '' }
    const w = 640
    const h = 180
    const max = 100
    const step = w / (data.length - 1)
    const coords = data.map((d, i) => [i * step, h - (d.score / max) * h] as const)
    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    const area = `${line} L${w},${h} L0,${h} Z`
    return { line, area }
  }, [data])

  if (!points.line) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-slate-500">
        Run your first ATS scan to start the trend.
      </div>
    )
  }

  return (
    <div className="relative">
      <svg viewBox="0 0 640 180" className="h-44 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="atsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="atsStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="60%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        {[45, 90, 135].map((y) => (
          <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="rgba(148,163,184,0.12)" strokeDasharray="4 6" />
        ))}
        <path d={points.area} fill="url(#atsFill)" />
        <path ref={pathRef} d={points.line} fill="none" stroke="url(#atsStroke)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
        <span>{data[0]?.date}</span>
        <span>latest {data[data.length - 1]?.score}/100</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}

function BarsChart({ data }: { data: { date: string; count: number }[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const max = Math.max(1, ...data.map((d) => d.count))

  useEffect(() => {
    if (!ref.current) return
    const bars = ref.current.querySelectorAll('[data-bar]')
    gsap.fromTo(
      bars,
      { scaleY: 0, transformOrigin: 'bottom' },
      { scaleY: 1, duration: 0.7, stagger: 0.03, ease: 'power3.out' },
    )
  }, [data])

  return (
    <div ref={ref} className="flex h-40 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.date} className="group relative flex-1">
          <div
            data-bar
            className="w-full rounded-t bg-gradient-to-t from-aurora-600/60 to-aurora-400/90 transition group-hover:from-fuchsia-500/70"
            style={{ height: `${Math.max(6, (d.count / max) * 140)}px` }}
          />
          <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  )
}

function ResumeCard({
  resume,
  onOpen,
  onDuplicate,
  onShare,
  onDelete,
}: {
  resume: ResumeSummary
  onOpen: () => void
  onDuplicate: () => void
  onShare: () => void
  onDelete: () => void
}) {
  const Template = getTemplate(resume.templateId)
  const doc = useMemo(() => {
    const base = emptyResumeDocument()
    return { ...base, profile: { ...base.profile, fullName: resume.title } }
  }, [resume.title])

  return (
    <div className="card card-hover group overflow-hidden">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="h-36 overflow-hidden bg-slate-200/90">
          <div style={{ transform: 'scale(0.22)', transformOrigin: 'top left', width: 794, height: 1123 }}>
            <Template doc={doc} />
          </div>
        </div>
      </button>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onOpen} className="min-w-0 text-left">
            <p className="truncate text-sm font-medium text-white">{resume.title}</p>
            <p className="text-[11px] text-slate-500">updated {timeAgo(resume.updatedAt)}</p>
          </button>
          {resume.atsScore !== null ? (
            <Badge tone={resume.atsScore >= 80 ? 'success' : resume.atsScore >= 60 ? 'warn' : 'danger'}>
              ATS {resume.atsScore}
            </Badge>
          ) : (
            <Badge>unscored</Badge>
          )}
        </div>

        <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" /> {resume.views}
          </span>
          <span className="flex items-center gap-1">
            <FileDown className="h-3 w-3" /> {resume.exports ?? 0}
          </span>
          {resume.isPublic && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Share2 className="h-3 w-3" /> public
            </span>
          )}
          <span className="ml-auto">{resume.completeness}% complete</span>
        </div>

        <div className="mt-3 flex gap-1.5 opacity-70 transition group-hover:opacity-100">
          <Button size="sm" variant="ghost" className="flex-1" onClick={onOpen}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onDuplicate} icon={<Copy className="h-3.5 w-3.5" />} />
          <Button size="sm" variant="ghost" onClick={onShare} icon={<Share2 className="h-3.5 w-3.5" />} />
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-rose-300 hover:bg-rose-500/10"
            icon={<Trash2 className="h-3.5 w-3.5" />}
          />
        </div>
      </div>
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
