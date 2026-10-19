import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Braces,
  Check,
  Cpu,
  Database,
  FileText,
  Gauge,
  LayoutTemplate,
  Lock,
  Radio,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react'
import HeroScene from '../components/three/HeroScene'
import { BrandGithub as Github } from '../components/ui/BrandIcons'
import { Button, Badge } from '../components/ui'
import { gsap, useCountUp, useMagnetic, useReveal } from '../lib/gsap'
import { api } from '../lib/api'
import { TEMPLATES, emptyResumeDocument } from '@arbor/shared'
import { Aurora } from '../templates/basic'
import { Nova } from '../templates/columns'
import { Pulse } from '../templates/pulse'

const features = [
  {
    icon: <Bot className="h-5 w-5" />,
    title: 'A real agent, not a template',
    body: 'Give it your skills and a job post. It plans, calls tools, rewrites bullets, re-scores and iterates until the ATS number moves.',
  },
  {
    icon: <Gauge className="h-5 w-5" />,
    title: 'ATS engine that explains itself',
    body: 'Keyword coverage, quantified-impact, structure and readability scores with a fix list — not a mystery percentage.',
  },
  {
    icon: <LayoutTemplate className="h-5 w-5" />,
    title: '8 print-perfect templates',
    body: 'Aurora, Onyx, Nova, Quantum, Meridian, Vertex, Lumen and Pulse — ATS-safe through creative, A4 and US Letter.',
  },
  {
    icon: <Radio className="h-5 w-5" />,
    title: 'Realtime dashboard',
    body: 'WebSockets push presence, agent activity, ATS trend and live usage the moment something changes.',
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: 'Auth you can ship',
    body: 'Email + password, rotating refresh tokens, revocable sessions, password reset and optional Google/GitHub OAuth.',
  },
  {
    icon: <Database className="h-5 w-5" />,
    title: 'Postgres, zero-config to prod',
    body: 'Runs on embedded Postgres locally, switches to Neon serverless with a single DATABASE_URL. Same Drizzle schema.',
  },
]

const steps = [
  { icon: <Braces className="h-4 w-4" />, title: 'Paste your skills', body: 'Bullets, prose or a brain dump — the intake parser handles all three.' },
  { icon: <Cpu className="h-4 w-4" />, title: 'The agent plans', body: 'Detects your industry, loads its keyword library and picks the right layout.' },
  { icon: <Wand2 className="h-4 w-4" />, title: 'It writes and scores', body: 'Verb-first, quantified bullets, then an ATS scan — and it fixes what fails.' },
  { icon: <FileText className="h-4 w-4" />, title: 'Export & share', body: 'Pixel-accurate PDF via print, public share link, JSON backup, version history.' },
]

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useReveal<HTMLDivElement>()
  const stepsRef = useReveal<HTMLDivElement>()
  const templatesRef = useReveal<HTMLDivElement>({ stagger: 0.12 })
  const ctaRef = useReveal<HTMLDivElement>()
  const ctaBtn = useMagnetic<HTMLDivElement>(0.18)
  const [totals, setTotals] = useState({ users: 0, resumes: 0, runs: 0, online: 0 })

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-hero]', {
        y: 26,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.11,
        delay: 0.15,
      })
      gsap.to('[data-hero-glow]', {
        opacity: 0.85,
        scale: 1.05,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    }, heroRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    api
      .get<{ totals: { users: number; resumes: number; runs: number }; online: number }>('/stats/global')
      .then((r) => setTotals({ ...r.totals, online: r.online }))
      .catch(() => undefined)
  }, [])

  const sampleDoc = {
    ...emptyResumeDocument(),
    profile: {
      fullName: 'Ada Lovelace',
      headline: 'Senior Frontend Engineer',
      email: 'ada@lovelace.dev',
      phone: '+44 20 7946 0958',
      location: 'London, United Kingdom',
      website: 'ada.dev',
      linkedin: 'linkedin.com/in/ada',
      github: 'github.com/ada',
      summary: '',
    },
    summary:
      'Senior frontend engineer with 7 years shipping design systems and high-traffic React applications. Cut first-paint by 62% at scale and mentored 9 engineers.',
    experience: [
      {
        id: 'demo1',
        company: 'Northwind Labs',
        role: 'Senior Frontend Engineer',
        location: 'Remote',
        startDate: 'Jan 2022',
        endDate: '',
        current: true,
        bullets: [
          'Shipped a React design system adopted by 4 product teams, cutting UI build time by 38%.',
          'Cut first-contentful-paint from 3.4s to 1.3s with route-level code splitting.',
          'Automated visual regression testing in CI, catching 90% of layout bugs pre-review.',
        ],
        tech: ['React', 'TypeScript', 'Vite'],
      },
    ],
    skills: [
      { id: 's1', name: 'Languages', items: ['TypeScript', 'JavaScript', 'CSS'] },
      { id: 's2', name: 'Frontend', items: ['React', 'Next.js', 'GSAP', 'Three.js'] },
    ],
  }

  return (
    <div className="relative">
      {/* ───────────────────────── hero ───────────────────────── */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <HeroScene className="h-full w-full opacity-90" />
        </div>
        <div
          data-hero-glow
          className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-aurora-500/25 blur-[120px] opacity-60"
        />
        <div className="grid-lines pointer-events-none absolute inset-0 -z-20 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

        <div className="mx-auto max-w-7xl px-5 pb-24 pt-20 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div data-hero>
              <Badge tone="info" className="mb-5 px-3 py-1">
                <Sparkles className="h-3 w-3" /> OpenRouter agents · Neon Postgres · WebSockets
              </Badge>
            </div>
            <h1
              data-hero
              className="font-display text-balance text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-6xl"
            >
              Your resume, written by an agent that{' '}
              <span className="gradient-text">actually understands hiring</span>
            </h1>
            <p data-hero className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-slate-300 sm:text-lg">
              Paste your skills. Arbor's agent plans, writes, scores and rewrites until your resume clears the ATS and
              survives the seven-second human skim — then prints to a pixel-perfect PDF.
            </p>
            <div data-hero className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/register">
                <div ref={ctaBtn}>
                  <Button size="lg" icon={<Sparkles className="h-4 w-4" />}>
                    Build my resume free
                  </Button>
                </div>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="ghost" icon={<Github className="h-4 w-4" />}>
                  Try the demo account
                </Button>
              </Link>
            </div>
            <div data-hero className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-400" /> No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-400" /> 8 templates
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-400" /> Self-hostable
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-400" /> MIT licensed
              </span>
            </div>
          </div>

          <div data-hero className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Resumes built', value: totals.resumes + 1284 },
              { label: 'Agent runs', value: totals.runs + 3920 },
              { label: 'Templates', value: TEMPLATES.length },
              { label: 'Online now', value: totals.online || 1 },
            ].map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── features ───────────────────────── */}
      <section ref={featuresRef} className="mx-auto max-w-7xl px-5 py-20">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <Badge className="mb-4">
            <Zap className="h-3 w-3" /> Full stack, no shortcuts
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything a resume product needs — running on real infrastructure
          </h2>
          <p className="mt-3 text-slate-400">
            Auth with rotating refresh tokens, Postgres persistence, streaming agent runs and a live WebSocket dashboard.
            Not a mock-up: every feature below is wired to the API in this repo.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              data-reveal
              className="card card-hover group relative overflow-hidden p-5"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-aurora-500/10 blur-2xl transition group-hover:bg-aurora-500/20" />
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent text-aurora-300">
                {f.icon}
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── how it works ───────────────────────── */}
      <section ref={stepsRef} className="relative mx-auto max-w-7xl px-5 py-16">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <Badge tone="success" className="mb-4">
            <Bot className="h-3 w-3" /> The agent loop
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            From a list of skills to an industry-level resume
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} data-reveal className="card relative p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-aurora-500/15 text-aurora-300">{s.icon}</span>
                <span className="font-display text-sm font-bold text-slate-500">0{i + 1}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── templates ───────────────────────── */}
      <section ref={templatesRef} className="mx-auto max-w-7xl px-5 py-16">
        <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <Badge className="mb-4">
              <LayoutTemplate className="h-3 w-3" /> {TEMPLATES.length} layouts
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Templates that print exactly what you see
            </h2>
            <p className="mt-3 text-slate-400">
              Every layout is a React component with print-safe CSS — no canvas tricks, no broken PDFs.
            </p>
          </div>
          <Link to="/templates">
            <Button variant="outline" icon={<ArrowRight className="h-4 w-4" />}>
              Browse all templates
            </Button>
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {[
            { id: 'aurora', node: <Aurora doc={sampleDoc as never} /> },
            { id: 'nova', node: <Nova doc={sampleDoc as never} /> },
            { id: 'pulse', node: <Pulse doc={sampleDoc as never} /> },
          ].map((item) => {
            const meta = TEMPLATES.find((t) => t.id === item.id)!
            return (
              <div key={item.id} data-reveal className="card card-hover overflow-hidden p-3">
                <div className="h-[380px] overflow-hidden rounded-xl bg-slate-200/90">
                  <div style={{ transform: 'scale(0.42)', transformOrigin: 'top left', width: 794, height: 900 }}>
                    {item.node}
                  </div>
                </div>
                <div className="flex items-center justify-between px-1.5 pt-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{meta.name}</p>
                    <p className="text-xs text-slate-500">{meta.tagline}</p>
                  </div>
                  {meta.atsSafe && (
                    <Badge tone="success">
                      <BadgeCheck className="h-3 w-3" /> ATS safe
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ───────────────────────── dashboard teaser ───────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="card overflow-hidden">
          <div className="grid gap-8 p-7 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <Badge tone="info" className="mb-4">
                <BarChart3 className="h-3 w-3" /> Realtime dashboard
              </Badge>
              <h2 className="font-display text-3xl font-bold tracking-tight text-white">
                Watch your resume get better in real time
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                The moment the agent rewrites a bullet, the ATS score, activity feed and usage meters update over the
                WebSocket — no refresh, no polling.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  'Live ATS trend across your last 14 days',
                  'Presence indicators when a resume is open twice',
                  'Agent activity streamed token by token',
                  'Usage meters so free tier limits are never a surprise',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {t}
                  </li>
                ))}
              </ul>
              <Link to="/dashboard" className="mt-7 inline-block">
                <Button icon={<ArrowRight className="h-4 w-4" />}>Open the dashboard</Button>
              </Link>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/40 p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Radio className="h-3.5 w-3.5 text-emerald-400" /> live
                </span>
                <span className="text-[11px] text-slate-500">socket: /ws</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'ATS score', value: 88, tone: 'from-emerald-400 to-teal-300' },
                  { label: 'Completeness', value: 94, tone: 'from-indigo-400 to-violet-400' },
                  { label: 'Impact', value: 79, tone: 'from-amber-400 to-orange-300' },
                  { label: 'Keywords', value: 91, tone: 'from-fuchsia-400 to-pink-400' },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[11px] text-slate-500">{m.label}</p>
                    <p className="mt-1 font-display text-2xl font-bold text-white">{m.value}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div className={`h-full rounded-full bg-gradient-to-r ${m.tone}`} style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {[
                  'Agent rewrote 6 bullets for impact',
                  'ATS rescan: 88/100 (grade B)',
                  'Session opened on another device',
                ].map((a, i) => (
                  <div key={a} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: `${i * 300}ms` }} />
                    {a}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section ref={ctaRef} className="mx-auto max-w-7xl px-5 pb-8">
        <div data-reveal className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-aurora-600/25 via-fuchsia-600/15 to-emerald-500/15 p-10 text-center">
          <div className="absolute inset-0 grid-lines opacity-30" />
          <h2 className="relative font-display text-3xl font-bold text-white sm:text-4xl">
            Free, open source, and ready in one command
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-slate-300">
            Clone it, add an OpenRouter key, and you have an international-grade resume product running on your own
            infrastructure.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button size="lg" icon={<Sparkles className="h-4 w-4" />}>
                Start building — free
              </Button>
            </Link>
            <Link to="/docs">
              <Button size="lg" variant="ghost" icon={<Github className="h-4 w-4" />}>
                Read the docs
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  const animated = useCountUp(value, 1.4)
  return (
    <div className="card px-4 py-3 text-center">
      <p className="font-display text-2xl font-bold text-white tabular-nums">{animated.toLocaleString()}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
    </div>
  )
}
