import { Link } from 'react-router-dom'
import { Check, Heart, Server } from 'lucide-react'
import { BrandGithub as Github } from '../components/ui/BrandIcons'
import { Badge, Button } from '../components/ui'
import { useReveal } from '../lib/gsap'

const plans = [
  {
    name: 'Free',
    price: '$0',
    tagline: 'Everything a job seeker needs',
    icon: <Heart className="h-4 w-4" />,
    cta: 'Start free',
    to: '/register',
    features: [
      'Unlimited resumes & downloads',
      'All 8 print-perfect templates',
      'AI agent (100 runs / day)',
      'ATS scoring with fix lists',
      'Public share links',
      'Version history & autosave',
      'Google / GitHub sign-in',
    ],
  },
  {
    name: 'Self-host',
    price: 'MIT',
    tagline: 'Run it on your own infra',
    icon: <Server className="h-4 w-4" />,
    cta: 'Read the docs',
    to: '/docs',
    highlight: true,
    features: [
      'One-command Docker / Node deploy',
      'Bring your own Neon or local Postgres',
      'Bring your own OpenRouter key',
      'Unlimited everything — no limits file to edit',
      'White-label the branding',
      'Add your own templates in TSX',
      'Full API for your own frontend',
    ],
  },
  {
    name: 'Contribute',
    price: 'PRs',
    tagline: 'Help make it better',
    icon: <Github className="h-4 w-4" />,
    cta: 'Open an issue',
    to: '/docs',
    features: [
      'Add templates & industries',
      'Improve the ATS heuristics',
      'Translate the UI',
      'Ship agent tool ideas',
      'Harden auth & infra',
      'Write docs and guides',
      'Your name in the contributors list',
    ],
  },
]

export default function Pricing() {
  const ref = useReveal<HTMLDivElement>({ stagger: 0.1 })

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <Badge tone="success" className="mb-4">
          No paywall, ever
        </Badge>
        <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">Free, because hiring is hard enough</h1>
        <p className="mt-3 text-slate-400">
          Arbor ships as open source. Use it here for free, or deploy your own copy in ten minutes and remove every
          limit.
        </p>
      </div>

      <div ref={ref} className="mt-12 grid gap-5 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            data-reveal
            className={
              p.highlight
                ? 'card relative overflow-hidden border-aurora-400/40 p-6 shadow-[0_0_70px_-30px_rgba(99,102,241,0.9)]'
                : 'card card-hover p-6'
            }
          >
            {p.highlight && (
              <span className="absolute right-4 top-4 rounded-full bg-aurora-500/20 px-2 py-0.5 text-[10px] font-semibold text-aurora-200">
                most flexible
              </span>
            )}
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-aurora-300">
              {p.icon}
            </span>
            <h2 className="mt-4 text-lg font-semibold text-white">{p.name}</h2>
            <p className="text-xs text-slate-500">{p.tagline}</p>
            <p className="mt-4 font-display text-4xl font-bold text-white">{p.price}</p>
            <ul className="mt-5 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {f}
                </li>
              ))}
            </ul>
            <Link to={p.to} className="mt-6 block">
              <Button variant={p.highlight ? 'primary' : 'ghost'} className="w-full">
                {p.cta}
              </Button>
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <h3 className="text-sm font-semibold text-white">Frequently asked</h3>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {[
            {
              q: 'Do I need an OpenRouter key?',
              a: 'No. Without a key the offline Nova engine still writes summaries, groups skills, rewrites bullets and scores your resume. Add a key to unlock the full LLM agent with tool calling.',
            },
            {
              q: 'Is my data used for training?',
              a: 'No. Your resume lives in your Postgres database. Text is only sent to OpenRouter when you explicitly run the AI agent, under your own key and your own provider terms.',
            },
            {
              q: 'How does the PDF export work?',
              a: 'The page you preview is the page that prints. Export uses the browser print pipeline with A4/Letter page rules, so fonts, colours and spacing match exactly.',
            },
            {
              q: 'Can I add my own template?',
              a: 'Yes — templates are plain React components. Add one to web/src/templates and register it in shared/src/templates.ts; it appears everywhere instantly.',
            },
          ].map((f) => (
            <div key={f.q}>
              <p className="text-sm font-medium text-slate-200">{f.q}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
