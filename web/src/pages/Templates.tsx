import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Check, Sparkles } from 'lucide-react'
import { TEMPLATES, emptyResumeDocument, type ResumeDocument, type TemplateId } from '@arbor/shared'
import { Badge, Button } from '../components/ui'
import { getTemplate } from '../templates/registry'
import { useReveal } from '../lib/gsap'
import { useAuth } from '../store/auth'
import { useBuilder } from '../store/builder'
import { notify } from '../store/ui'
import { cn } from '../lib/utils'

const SAMPLE: ResumeDocument = {
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
    'Senior frontend engineer with 7 years shipping design systems and high-traffic React applications. Cut first paint by 62% at scale and mentored 9 engineers.',
  experience: [
    {
      id: 'e1',
      company: 'Northwind Labs',
      role: 'Senior Frontend Engineer',
      location: 'Remote',
      startDate: 'Jan 2022',
      endDate: '',
      current: true,
      bullets: [
        'Shipped a React design system adopted by 4 product teams, cutting UI build time by 38%.',
        'Cut first-contentful-paint from 3.4s to 1.3s with route-level code splitting and prefetching.',
        'Automated visual regression testing in CI, catching 90% of layout bugs before review.',
      ],
      tech: ['React', 'TypeScript', 'Vite', 'Playwright'],
    },
    {
      id: 'e2',
      company: 'Bright Foundry',
      role: 'Frontend Engineer',
      location: 'Manchester, UK',
      startDate: 'Jun 2019',
      endDate: 'Dec 2021',
      current: false,
      bullets: [
        'Rebuilt the checkout flow, lifting conversion by 14% across 220k monthly sessions.',
        'Introduced TypeScript across 60k lines of legacy JavaScript with zero downtime.',
      ],
      tech: ['JavaScript', 'React', 'Node.js'],
    },
  ],
  projects: [
    {
      id: 'p1',
      name: 'Aurora UI',
      role: 'Creator',
      link: 'github.com/ada/aurora-ui',
      startDate: 'Mar 2023',
      endDate: '',
      description: 'Accessible component library with 42 primitives and zero-runtime theming.',
      bullets: ['1.8k GitHub stars · 12k weekly downloads'],
      tech: ['React', 'TypeScript', 'Tailwind'],
    },
  ],
  education: [
    {
      id: 'ed1',
      school: 'University of London',
      degree: 'BSc',
      field: 'Computer Science',
      location: 'London, UK',
      startDate: '2015',
      endDate: '2019',
      gpa: 'First Class',
      details: [],
    },
  ],
  skills: [
    { id: 's1', name: 'Languages', items: ['TypeScript', 'JavaScript', 'HTML', 'CSS'] },
    { id: 's2', name: 'Frontend', items: ['React', 'Next.js', 'Tailwind CSS', 'GSAP', 'Three.js'] },
    { id: 's3', name: 'Cloud & DevOps', items: ['Docker', 'GitHub Actions', 'Vercel'] },
  ],
  certifications: [{ id: 'c1', name: 'AWS Cloud Practitioner', issuer: 'Amazon', date: '2023', credentialId: '', link: '' }],
  languages: [{ id: 'l1', name: 'English', level: 'Native' }, { id: 'l2', name: 'Urdu', level: 'Fluent' }],
}

export default function Templates() {
  const [active, setActive] = useState<TemplateId>('aurora')
  const gridRef = useReveal<HTMLDivElement>({ stagger: 0.07 })
  const navigate = useNavigate()
  const { status } = useAuth()
  const { create } = useBuilder()
  const Template = useMemo(() => getTemplate(active), [active])
  const meta = TEMPLATES.find((t) => t.id === active)!

  const useTemplate = async (id: TemplateId) => {
    if (status !== 'authenticated') {
      navigate('/register')
      return
    }
    const newId = await create({ title: `${TEMPLATES.find((t) => t.id === id)!.name} resume`, templateId: id })
    notify('Created — let the agent fill it in', 'success')
    navigate(`/builder/${newId}`)
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <Badge tone="info" className="mb-4">
          <Sparkles className="h-3 w-3" /> {TEMPLATES.length} layouts, one data model
        </Badge>
        <h1 className="font-display text-4xl font-bold tracking-tight text-white">
          Pick a template. Change it whenever you like.
        </h1>
        <p className="mt-3 text-slate-400">
          Every layout renders the same resume data, so switching never loses a word — and every one of them prints to a
          clean, text-selectable PDF.
        </p>
      </div>

      {/* big preview */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden p-4">
          <div className="h-[70vh] overflow-auto rounded-xl bg-slate-200/90">
            <div style={{ transform: 'scale(0.62)', transformOrigin: 'top center', width: 794, margin: '0 auto' }}>
              <Template doc={SAMPLE} />
            </div>
          </div>
        </div>

        <div className="card h-fit p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-white">{meta.name}</h2>
              <p className="mt-1 text-xs text-slate-500">{meta.tagline}</p>
            </div>
            {meta.atsSafe && (
              <Badge tone="success">
                <BadgeCheck className="h-3 w-3" /> ATS
              </Badge>
            )}
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <Row label="Layout" value={meta.layout} />
            <Row label="Typeface" value={meta.font} />
            <Row label="Best for" value={meta.bestFor.slice(0, 5).join(', ')} />
          </div>

          <Button className="mt-5 w-full" onClick={() => useTemplate(active)} icon={<Sparkles className="h-4 w-4" />}>
            Use {meta.name}
          </Button>
          <p className="mt-2 text-center text-[11px] text-slate-500">
            You can switch templates any time inside the editor.
          </p>
        </div>
      </div>

      {/* grid */}
      <div ref={gridRef} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TEMPLATES.map((t) => {
          const Tpl = getTemplate(t.id)
          return (
            <button
              key={t.id}
              data-reveal
              onClick={() => setActive(t.id)}
              className={cn(
                'card card-hover overflow-hidden p-2 text-left transition',
                active === t.id && 'ring-2 ring-aurora-400/70',
              )}
            >
              <div className="h-52 overflow-hidden rounded-lg bg-slate-200/90">
                <div style={{ transform: 'scale(0.28)', transformOrigin: 'top left', width: 794, height: 1123 }}>
                  <Tpl doc={SAMPLE} />
                </div>
              </div>
              <div className="flex items-center justify-between px-1.5 py-2">
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-[11px] text-slate-500">{t.bestFor.slice(0, 3).join(' · ')}</p>
                </div>
                {active === t.id ? (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-aurora-500 text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  t.atsSafe && <span className="text-[10px] text-emerald-400">ATS</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="capitalize text-slate-300">{value}</span>
    </div>
  )
}
