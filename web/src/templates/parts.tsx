import type { ReactNode } from 'react'
import type { ResumeDocument } from '@arbor/shared'

/* ─────────────────────────  text helpers  ───────────────────────── */

export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/** Highlights [X] / [metric] placeholders the agent leaves for you to fill. */
export function Placeholder({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\[[^\]]{1,32}\])/g)
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith('[') && part.endsWith(']') ? (
          <span
            key={i}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 16%, transparent)',
              color: 'color-mix(in srgb, var(--accent) 70%, #0f172a)',
              borderRadius: 3,
              padding: '0 3px',
              fontWeight: 600,
            }}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}

export function dateRange(start: string, end: string, current?: boolean): string {
  const s = (start ?? '').trim()
  const e = current ? 'Present' : (end ?? '').trim()
  if (s && e) return `${s} — ${e}`
  return s || e
}

/* ─────────────────────────  primitives  ───────────────────────── */

export function SectionTitle({
  children,
  variant = 'rule',
  className,
}: {
  children: ReactNode
  variant?: 'rule' | 'plain' | 'pill' | 'bar' | 'center'
  className?: string
}) {
  if (variant === 'pill') {
    return (
      <div className={className} style={{ marginBottom: 8 }}>
        <span
          className="inline-block rounded-full px-3 py-[3px] text-[10px] font-bold uppercase tracking-[0.16em] text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {children}
        </span>
      </div>
    )
  }
  if (variant === 'bar') {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 4, height: 15, backgroundColor: 'var(--accent)', borderRadius: 2 }} />
        <h2 className="text-[12.5px] font-bold uppercase tracking-[0.14em]" style={{ color: '#0f172a' }}>
          {children}
        </h2>
      </div>
    )
  }
  if (variant === 'center') {
    return (
      <div className={className} style={{ marginBottom: 8 }}>
        <h2
          className="text-center text-[12px] font-bold uppercase tracking-[0.22em]"
          style={{ color: '#0f172a' }}
        >
          {children}
        </h2>
        <div
          style={{ height: 1, background: 'color-mix(in srgb, var(--accent) 55%, #cbd5e1)', marginTop: 4 }}
        />
      </div>
    )
  }
  if (variant === 'plain') {
    return (
      <h2
        className={className}
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#0f172a',
          marginBottom: 6,
          borderBottom: '1.5px solid #0f172a',
          paddingBottom: 2,
        }}
      >
        {children}
      </h2>
    )
  }
  return (
    <div className={className} style={{ marginBottom: 8 }}>
      <h2
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: 3,
        }}
      >
        {children}
      </h2>
      <div style={{ height: 2, background: 'color-mix(in srgb, var(--accent) 35%, #e2e8f0)' }} />
    </div>
  )
}

export function Bullets({ items, marker = 'disc' }: { items: string[]; marker?: 'disc' | 'dash' | 'none' }) {
  const clean = items.filter((b) => b && b.trim())
  if (!clean.length) return null
  if (marker === 'none') {
    return (
      <div style={{ display: 'grid', gap: 3 }}>
        {clean.map((b, i) => (
          <p key={i} style={{ fontSize: 11, lineHeight: 1.5, color: '#1f2937' }}>
            <Placeholder text={b} />
          </p>
        ))}
      </div>
    )
  }
  return (
    <ul style={{ display: 'grid', gap: 3, paddingLeft: marker === 'disc' ? 15 : 0, margin: 0 }}>
      {clean.map((b, i) => (
        <li key={i} style={{ fontSize: 11, lineHeight: 1.5, color: '#1f2937', listStyle: marker === 'disc' ? 'disc' : 'none' }}>
          {marker === 'dash' && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>– </span>}
          <Placeholder text={b} />
        </li>
      ))}
    </ul>
  )
}

export function Chips({ items, tone = 'soft' }: { items: string[]; tone?: 'soft' | 'solid' | 'plain' }) {
  const clean = items.filter(Boolean)
  if (!clean.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {clean.map((s, i) => (
        <span
          key={i}
          style={{
            fontSize: 9.5,
            padding: '2px 7px',
            borderRadius: 999,
            border: tone === 'plain' ? '1px solid #d5dbe6' : '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
            background: tone === 'solid' ? 'var(--accent)' : tone === 'soft' ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
            color: tone === 'solid' ? '#fff' : '#1f2937',
            fontWeight: tone === 'solid' ? 600 : 500,
          }}
        >
          {s}
        </span>
      ))}
    </div>
  )
}

export function ContactRow({ items }: { items: { icon?: ReactNode; text: string }[] }) {
  const clean = items.filter((i) => i.text && i.text.trim())
  if (!clean.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      {clean.map((item, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#334155' }}>
          {item.icon}
          {item.text}
        </span>
      ))}
    </div>
  )
}

/* ─────────────────────────  page wrapper  ───────────────────────── */

const DENSITY = {
  compact: { pad: 26, gap: 12, itemGap: 8 },
  comfortable: { pad: 34, gap: 16, itemGap: 11 },
  spacious: { pad: 42, gap: 22, itemGap: 15 },
} as const

const FONTS = {
  sans: "'Inter', system-ui, sans-serif",
  serif: "'Source Serif 4', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const

export type PageProps = {
  doc: ResumeDocument
  children: ReactNode
  className?: string
}

export function Page({ doc, children, className }: PageProps) {
  const density = DENSITY[doc.meta.density] ?? DENSITY.comfortable
  return (
    <div
      className={`resume-page ${className ?? ''}`}
      data-format={doc.meta.pageFormat}
      style={
        {
          '--accent': doc.meta.accent,
          fontFamily: FONTS[doc.meta.fontFamily] ?? FONTS.sans,
          fontSize: `${11 * doc.meta.fontScale}pt`,
          padding: `${density.pad}px ${density.pad + 4}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: `${density.gap}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}

export const spacing = (doc: ResumeDocument) => DENSITY[doc.meta.density] ?? DENSITY.comfortable

export function visible(doc: ResumeDocument, key: string): boolean {
  return !doc.meta.hidden.includes(key)
}

export function sectionNodes(doc: ResumeDocument): string[] {
  return doc.meta.sectionOrder.filter((s) => visible(doc, s))
}
