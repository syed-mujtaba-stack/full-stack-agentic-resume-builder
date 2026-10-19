import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Maximize2, Minus, Plus, Printer, Share2 } from 'lucide-react'
import type { ResumeDocument, TemplateId } from '@arbor/shared'
import { getTemplate } from '../../templates/registry'
import { Button } from '../ui'
import { useUi } from '../../store/ui'
import { download, slugifyFilename } from '../../lib/utils'

const PAGE_PX = {
  a4: { w: 794, h: 1123 },
  letter: { w: 816, h: 1056 },
} as const

export function ResumePreview({
  doc,
  templateId,
  title,
  onShare,
  onExport,
  isPublic,
}: {
  doc: ResumeDocument
  templateId: TemplateId
  title: string
  onShare?: () => void
  onExport?: () => void
  isPublic?: boolean
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(0.85)
  const [fit, setFit] = useState(true)
  const setPrintMode = useUi((s) => s.setPrintMode)
  const Template = useMemo(() => getTemplate(templateId), [templateId])
  const page = PAGE_PX[doc.meta.pageFormat] ?? PAGE_PX.a4

  // Fit the page into the available column width.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const compute = () => {
      if (!fit) return
      const width = el.clientWidth - 8
      setZoom(Math.max(0.3, Math.min(1.35, width / page.w)))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit, page.w])

  const print = () => {
    onExport?.()
    setPrintMode(true)
    setTimeout(() => {
      window.print()
      setTimeout(() => setPrintMode(false), 600)
    }, 120)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-white/[0.03] p-1">
          <button
            onClick={() => {
              setFit(false)
              setZoom((z) => Math.max(0.3, Number((z - 0.1).toFixed(2))))
            }}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-white/10"
            title="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-12 text-center text-xs tabular-nums text-slate-400">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => {
              setFit(false)
              setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))
            }}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-white/10"
            title="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setFit(true)}
            className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-white/10"
            title="Fit to width"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onShare} icon={<Share2 className="h-3.5 w-3.5" />}>
            {isPublic ? 'Public' : 'Share'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => download(`${slugifyFilename(title)}.json`, JSON.stringify({ templateId, document: doc }, null, 2))}
            icon={<Download className="h-3.5 w-3.5" />}
          >
            JSON
          </Button>
          <Button size="sm" onClick={print} icon={<Printer className="h-3.5 w-3.5" />}>
            Export PDF
          </Button>
        </div>
      </div>

      <div ref={wrapRef} className="flex-1 overflow-auto rounded-2xl bg-black/25 p-3">
        <div style={{ width: page.w * zoom, height: page.h * zoom }} className="mx-auto">
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: page.w, minHeight: page.h }}
          >
            <Template doc={doc} />
          </div>
        </div>
      </div>
    </div>
  )
}
