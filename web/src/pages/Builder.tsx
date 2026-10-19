import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  FileText,
  LayoutTemplate,
  Loader2,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import {
  SECTION_LABELS,
  type SectionKey,
  type TemplateId,
  emptyResumeDocument,
} from '@arbor/shared'
import { Badge, Button, Input, Tabs } from '../components/ui'
import { useBuilder } from '../store/builder'
import { useRealtime } from '../store/realtime'
import { notify } from '../store/ui'
import { ResumePreview } from '../components/builder/ResumePreview'
import { TemplatePicker } from '../components/builder/TemplatePicker'
import { DesignPanel } from '../components/builder/DesignPanel'
import { AtsPanel } from '../components/builder/AtsPanel'
import { AgentPanel } from '../components/builder/AgentPanel'
import {
  EducationEditor,
  ExperienceEditor,
  ExtrasEditor,
  ProfileEditor,
  ProjectsEditor,
  SkillsEditor,
  SummaryEditor,
} from '../components/builder/Editors'
import { copy, countPlaceholders } from '../lib/utils'

const CONTENT_SECTIONS: SectionKey[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'awards',
]

export default function Builder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const builder = useBuilder()
  const subscribe = useRealtime((s) => s.subscribe)
  const unsubscribe = useRealtime((s) => s.unsubscribe)
  const presence = useRealtime((s) => s.presence)
  const [leftTab, setLeftTab] = useState<'content' | 'design'>('content')
  const [rightTab, setRightTab] = useState<'agent' | 'ats'>('agent')
  const [section, setSection] = useState<SectionKey>('experience')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!id) return
    if (id === 'new') {
      setCreating(true)
      builder
        .create({ title: 'Untitled resume', templateId: 'aurora' })
        .then((newId) => navigate(`/builder/${newId}`, { replace: true }))
        .catch((err) => notify((err as Error).message, 'error'))
        .finally(() => setCreating(false))
      return
    }
    void builder.load(id)
    subscribe(id)
    return () => unsubscribe(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const doc = builder.document
  const placeholders = useMemo(() => countPlaceholders(doc), [doc])
  const viewers = (builder.resumeId && presence[builder.resumeId]) || []

  const reorder = (from: number, to: number) => {
    const order = [...doc.meta.sectionOrder]
    if (to < 0 || to >= order.length) return
    const [item] = order.splice(from, 1)
    order.splice(to, 0, item as SectionKey)
    builder.setMeta({ sectionOrder: order })
  }

  const toggleSection = (key: SectionKey) => {
    const hidden = doc.meta.hidden.includes(key)
    builder.setMeta({
      hidden: hidden ? doc.meta.hidden.filter((k) => k !== key) : [...doc.meta.hidden, key],
    })
  }

  const share = async () => {
    const url = await builder.toggleShare()
    if (url) {
      await copy(`${window.location.origin}${url}`)
      notify('Public link copied to clipboard', 'success')
    }
  }

  if (creating || (builder.status === 'loading' && !builder.resumeId)) {
    return (
      <div className="grid h-[70vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-aurora-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-5">
      {/* toolbar */}
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <Link to="/dashboard" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <Input
          value={builder.title}
          onChange={(e) => builder.setTitle(e.target.value)}
          className="h-9 max-w-[260px] border-transparent bg-transparent text-base font-semibold text-white hover:border-white/10"
        />

        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          {builder.status === 'saving' ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> saving…
            </>
          ) : builder.dirty ? (
            <>
              <Save className="h-3.5 w-3.5" /> unsaved
            </>
          ) : builder.savedAt ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" /> saved
            </>
          ) : null}
        </span>

        {placeholders > 0 && (
          <Badge tone="warn" title="Fill these before you send">
            {placeholders} placeholder{placeholders === 1 ? '' : 's'} left
          </Badge>
        )}

        {viewers.length > 1 && (
          <Badge tone="info">
            <Users className="h-3 w-3" /> {viewers.length} viewing
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const newId = await builder.duplicate()
              if (newId) navigate(`/builder/${newId}`)
            }}
            icon={<Copy className="h-3.5 w-3.5" />}
          >
            Duplicate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={share}
            icon={builder.isPublic ? <Eye className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
          >
            {builder.isPublic ? 'Public' : 'Share'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-300 hover:bg-rose-500/10"
            onClick={async () => {
              await builder.remove()
              navigate('/dashboard')
            }}
            icon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_minmax(320px,400px)]">
        {/* left — content */}
        <div className="no-print flex flex-col gap-3">
          <Tabs
            tabs={[
              { id: 'content' as const, label: 'Content', icon: <FileText className="h-3.5 w-3.5" /> },
              { id: 'design' as const, label: 'Design', icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
            ]}
            value={leftTab}
            onChange={setLeftTab}
          />

          <div className="card max-h-[calc(100vh-13rem)] overflow-y-auto p-4">
            {leftTab === 'content' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {CONTENT_SECTIONS.map((key) => (
                    <button
                      key={key}
                      onClick={() => setSection(key)}
                      className={
                        section === key
                          ? 'rounded-lg bg-aurora-500/20 px-2.5 py-1 text-[11px] font-medium text-aurora-200 ring-1 ring-aurora-400/40'
                          : 'rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-slate-400 hover:bg-white/10 hover:text-slate-200'
                      }
                    >
                      {SECTION_LABELS[key]}
                    </button>
                  ))}
                  <button
                    onClick={() => setSection('awards')}
                    className={
                      section === 'awards'
                        ? 'rounded-lg bg-aurora-500/20 px-2.5 py-1 text-[11px] font-medium text-aurora-200 ring-1 ring-aurora-400/40'
                        : 'rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }
                  >
                    Extras
                  </button>
                </div>

                {section === 'summary' && (
                  <div className="space-y-5">
                    <ProfileEditor doc={doc} update={builder.update} />
                    <SummaryEditor doc={doc} update={builder.update} />
                  </div>
                )}
                {section === 'experience' && <ExperienceEditor doc={doc} update={builder.update} />}
                {section === 'education' && <EducationEditor doc={doc} update={builder.update} />}
                {section === 'skills' && <SkillsEditor doc={doc} update={builder.update} />}
                {section === 'projects' && <ProjectsEditor doc={doc} update={builder.update} />}
                {section === 'awards' && <ExtrasEditor doc={doc} update={builder.update} />}
              </div>
            ) : (
              <DesignPanel
                doc={doc}
                templateId={builder.templateId}
                setTemplate={(t: TemplateId) => builder.setTemplate(t)}
                setMeta={builder.setMeta}
                reorder={reorder}
                toggleSection={toggleSection}
              />
            )}
          </div>
        </div>

        {/* center — preview */}
        <div className="card h-[calc(100vh-13rem)] min-h-[520px] p-3">
          <ResumePreview
            doc={doc}
            templateId={builder.templateId}
            title={builder.title}
            isPublic={builder.isPublic}
            onShare={share}
            onExport={() => void builder.markExported()}
          />
        </div>

        {/* right — agent & ats */}
        <div className="no-print flex flex-col gap-3">
          <Tabs
            tabs={[
              { id: 'agent' as const, label: 'AI agent', icon: <Sparkles className="h-3.5 w-3.5" /> },
              { id: 'ats' as const, label: 'ATS score', icon: <FileText className="h-3.5 w-3.5" /> },
            ]}
            value={rightTab}
            onChange={setRightTab}
          />
          <div className="card max-h-[calc(100vh-13rem)] overflow-y-auto p-4">
            {rightTab === 'agent' ? <AgentPanel /> : <AtsPanel />}
          </div>
        </div>
      </div>

      {/* quick template strip */}
      <div className="no-print mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Switch template</p>
        <TemplatePicker value={builder.templateId} onChange={(t) => builder.setTemplate(t)} />
      </div>

    </div>
  )
}

export { emptyResumeDocument }
