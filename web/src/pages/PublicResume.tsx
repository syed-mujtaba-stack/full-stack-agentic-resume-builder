import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Eye, Printer, Sparkles } from 'lucide-react'
import type { ResumeDocument } from '@arbor/shared'
import { api } from '../lib/api'
import { Button } from '../components/ui'
import { getTemplate } from '../templates/registry'
import { useUi } from '../store/ui'

type PublicResume = {
  id: string
  title: string
  templateId: string
  document: ResumeDocument
  updatedAt: string
  views: number
  isOwner: boolean
}

export default function PublicResume() {
  const { slug } = useParams()
  const [resume, setResume] = useState<PublicResume | null>(null)
  const [error, setError] = useState<string | null>(null)
  const printMode = useUi((s) => s.printMode)
  const setPrintMode = useUi((s) => s.setPrintMode)

  useEffect(() => {
    if (!slug) return
    api
      .get<{ resume: PublicResume }>(`/r/${slug}`)
      .then((r) => setResume(r.resume))
      .catch((err: Error) => setError(err.message))
  }, [slug])

  const Template = useMemo(() => (resume ? getTemplate(resume.templateId) : null), [resume])

  if (error) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-white">This resume is private</h1>
        <p className="mt-2 text-sm text-slate-400">{error}</p>
        <Link to="/" className="mt-6 inline-block text-sm text-aurora-300 underline">
          Build your own with Arbor
        </Link>
      </div>
    )
  }

  if (!resume || !Template) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-aurora-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900/40 py-8">
      <div className="no-print mx-auto mb-5 flex max-w-4xl flex-wrap items-center justify-between gap-3 px-5">
        <div>
          <h1 className="font-display text-lg font-bold text-white">{resume.title}</h1>
          <p className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {resume.views} views
            </span>
            updated {new Date(resume.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setPrintMode(true)
              setTimeout(() => {
                window.print()
                setTimeout(() => setPrintMode(false), 600)
              }, 120)
            }}
            icon={<Printer className="h-3.5 w-3.5" />}
          >
            Print / PDF
          </Button>
          <Link to="/register">
            <Button size="sm" icon={<Sparkles className="h-3.5 w-3.5" />}>
              Make my own
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto w-fit">
        <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', width: 794 }}>
          <Template doc={resume.document} />
        </div>
      </div>

      <p className="no-print mt-6 text-center text-xs text-slate-600">
        Built with 🌳 Arbor — the open-source agentic resume builder
      </p>

      {printMode && (
        <div id="print-root">
          <Template doc={resume.document} />
        </div>
      )}
    </div>
  )
}
