import { Link } from 'react-router-dom'
import { Heart, Sparkles } from 'lucide-react'
import { BrandGithub as Github } from '../ui/BrandIcons'

const cols = [
  {
    title: 'Product',
    links: [
      { label: 'Templates', to: '/templates' },
      { label: 'AI agent', to: '/docs' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Dashboard', to: '/dashboard' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/register' },
      { label: 'Reset password', to: '/forgot-password' },
      { label: 'Settings', to: '/settings' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="no-print mt-24 border-t border-white/8 bg-ink-950/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-aurora-500 to-fuchsia-500 text-lg">
              🌳
            </span>
            <span className="font-display text-lg font-bold text-white">Arbor</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
            An open-source, agentic resume builder. Eight ATS-tested templates, a real AI agent, realtime collaboration
            signals and self-hostable infrastructure — free forever.
          </p>
          <div className="mt-4 flex gap-2">
            <span className="chip">
              <Sparkles className="h-3 w-3 text-aurora-300" /> React 19 · GSAP · Three.js
            </span>
          </div>
        </div>

        {cols.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-slate-400 transition hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Stack</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>Express + WebSockets</li>
            <li>Postgres (Neon / embedded)</li>
            <li>OpenRouter agents</li>
            <li>JWT auth with rotation</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/8 px-5 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Arbor — built for job seekers, not for paywalls.</p>
          <p className="flex items-center gap-1.5">
            Made with <Heart className="h-3 w-3 text-rose-400" /> and <Github className="h-3 w-3" /> by the open-source
            community
          </p>
        </div>
      </div>
    </footer>
  )
}
