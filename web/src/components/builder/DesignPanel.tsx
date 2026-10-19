import { Eye, EyeOff, GripVertical, Type } from 'lucide-react'
import { SECTION_LABELS, type ResumeDocument, type SectionKey } from '@arbor/shared'
import { Label, SectionHeading, Select, Switch } from '../ui'
import { TemplatePicker } from './TemplatePicker'
import type { TemplateId } from '@arbor/shared'
import { cn } from '../../lib/utils'

const ACCENTS = [
  '#6366f1',
  '#0ea5e9',
  '#22c55e',
  '#f59e0b',
  '#f43f5e',
  '#a855f7',
  '#14b8a6',
  '#334155',
  '#111827',
  '#7c3aed',
]

export function DesignPanel({
  doc,
  templateId,
  setTemplate,
  setMeta,
  reorder,
  toggleSection,
}: {
  doc: ResumeDocument
  templateId: TemplateId
  setTemplate: (id: TemplateId) => void
  setMeta: (meta: Partial<ResumeDocument['meta']>) => void
  reorder: (from: number, to: number) => void
  toggleSection: (key: SectionKey) => void
}) {
  return (
    <div className="space-y-6">
      <section>
        <SectionHeading title="Template" hint="Switch layouts without losing content." />
        <TemplatePicker value={templateId} onChange={setTemplate} columns={2} />
      </section>

      <section>
        <SectionHeading title="Accent colour" />
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((c) => (
            <button
              key={c}
              onClick={() => setMeta({ accent: c })}
              className={cn(
                'h-8 w-8 rounded-lg border transition',
                doc.meta.accent === c ? 'border-white scale-110' : 'border-white/15 hover:scale-105',
              )}
              style={{ background: c }}
            />
          ))}
          <label className="relative h-8 w-8 overflow-hidden rounded-lg border border-dashed border-white/25">
            <input
              type="color"
              value={doc.meta.accent}
              onChange={(e) => setMeta({ accent: e.target.value })}
              className="absolute -left-2 -top-2 h-14 w-14 cursor-pointer"
            />
          </label>
        </div>
      </section>

      <section>
        <SectionHeading title="Typography" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Font family</Label>
            <Select value={doc.meta.fontFamily} onChange={(e) => setMeta({ fontFamily: e.target.value as 'sans' })}>
              <option value="sans">Inter (sans)</option>
              <option value="serif">Source Serif</option>
              <option value="mono">JetBrains Mono</option>
            </Select>
          </div>
          <div>
            <Label>Density</Label>
            <Select
              value={doc.meta.density}
              onChange={(e) => setMeta({ density: e.target.value as 'comfortable' })}
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </Select>
          </div>
          <div>
            <Label>Page format</Label>
            <Select value={doc.meta.pageFormat} onChange={(e) => setMeta({ pageFormat: e.target.value as 'a4' })}>
              <option value="a4">A4 (210 × 297 mm)</option>
              <option value="letter">US Letter</option>
            </Select>
          </div>
          <div>
            <Label>Text size · {Math.round(doc.meta.fontScale * 100)}%</Label>
            <input
              type="range"
              min={0.85}
              max={1.2}
              step={0.01}
              value={doc.meta.fontScale}
              onChange={(e) => setMeta({ fontScale: Number(e.target.value) })}
              className="mt-3 w-full accent-indigo-500"
            />
          </div>
        </div>
      </section>

      <section>
        <SectionHeading title="Sections" hint="Reorder and toggle what recruiters see." />
        <div className="space-y-1.5">
          {doc.meta.sectionOrder.map((key, i) => {
            const hidden = doc.meta.hidden.includes(key)
            return (
              <div
                key={key}
                className={cn(
                  'flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2',
                  hidden && 'opacity-45',
                )}
              >
                <GripVertical className="h-3.5 w-3.5 text-slate-600" />
                <span className="flex-1 text-sm text-slate-200">
                  {SECTION_LABELS[key as SectionKey] ?? key}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => reorder(i, i - 1)}
                    disabled={i === 0}
                    className="rounded px-1 text-xs text-slate-500 hover:text-white disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => reorder(i, i + 1)}
                    disabled={i === doc.meta.sectionOrder.length - 1}
                    className="rounded px-1 text-xs text-slate-500 hover:text-white disabled:opacity-25"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => toggleSection(key as SectionKey)}
                    className="ml-1 grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
                    title={hidden ? 'Show section' : 'Hide section'}
                  >
                    {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <SectionHeading title="Extras" />
        <div className="space-y-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <Switch
            checked={doc.meta.showIcons}
            onChange={(v) => setMeta({ showIcons: v })}
            label="Contact icons"
            hint="Shown by templates that support them"
          />
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Type className="h-3.5 w-3.5" /> Everything here is print-safe — the PDF matches this screen exactly.
          </div>
        </div>
      </section>
    </div>
  )
}
