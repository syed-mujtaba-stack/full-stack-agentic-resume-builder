import { TEMPLATES, type TemplateId } from '@arbor/shared'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export function TemplatePicker({
  value,
  onChange,
  columns = 4,
}: {
  value: TemplateId
  onChange: (id: TemplateId) => void
  columns?: number
}) {
  return (
    <div className={cn('grid gap-3', columns === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2')}>
      {TEMPLATES.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'group relative overflow-hidden rounded-xl border p-2 text-left transition',
              active
                ? 'border-aurora-400/70 bg-aurora-500/10 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
                : 'border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]',
            )}
          >
            <div
              className="relative h-24 overflow-hidden rounded-lg"
              style={{ background: `linear-gradient(140deg, ${t.swatch[0]}, ${t.swatch[1]})` }}
            >
              <div className="absolute inset-2 rounded bg-white/92 p-1.5 shadow">
                <div className="mb-1 h-1.5 w-2/3 rounded-full" style={{ background: t.swatch[0] }} />
                <div className="mb-1 h-1 w-full rounded-full bg-slate-200" />
                <div className="mb-1 h-1 w-11/12 rounded-full bg-slate-200" />
                <div className="mb-1.5 h-1 w-10/12 rounded-full bg-slate-200" />
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-4 rounded-full" style={{ background: t.swatch[1], opacity: 0.75 - i * 0.18 }} />
                  ))}
                </div>
              </div>
              {active && (
                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-aurora-600 shadow">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
            <div className="mt-2 px-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-100">{t.name}</p>
                {t.atsSafe && <span className="text-[9px] text-emerald-400">ATS</span>}
              </div>
              <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-slate-500">{t.tagline}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
