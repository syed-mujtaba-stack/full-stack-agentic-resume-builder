import { create } from 'zustand'
import {
  type AtsReport,
  type JobTarget,
  type ResumeDocument,
  type ResumeRecord,
  type TemplateId,
  emptyResumeDocument,
  hydrateResumeDocument,
  resumeDocumentSchema,
} from '@arbor/shared'
import { api } from '../lib/api'
import { notify } from './ui'

type SaveState = 'idle' | 'loading' | 'saving' | 'ready' | 'error'

type BuilderState = {
  resumeId: string | null
  title: string
  templateId: TemplateId
  document: ResumeDocument
  jobTarget: JobTarget | null
  ats: AtsReport | null
  status: SaveState
  dirty: boolean
  savedAt: string | null
  publicSlug: string | null
  isPublic: boolean
  error: string | null

  load: (id: string) => Promise<void>
  create: (input?: { title?: string; templateId?: TemplateId; document?: ResumeDocument }) => Promise<string>
  reset: () => void
  patch: (partial: Partial<ResumeDocument>) => void
  update: (updater: (doc: ResumeDocument) => ResumeDocument) => void
  setMeta: (meta: Partial<ResumeDocument['meta']>) => void
  setTemplate: (id: TemplateId) => void
  setTitle: (title: string) => void
  setJobTarget: (target: Partial<JobTarget> | null) => void
  setDocument: (doc: ResumeDocument, note?: string) => void
  setAts: (report: AtsReport | null) => void
  save: (immediate?: boolean) => Promise<void>
  score: (jobDescription?: string) => Promise<AtsReport>
  duplicate: () => Promise<string | null>
  toggleShare: () => Promise<string | null>
  remove: () => Promise<void>
  markExported: () => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export const useBuilder = create<BuilderState>((set, get) => ({
  resumeId: null,
  title: 'Untitled resume',
  templateId: 'aurora',
  document: emptyResumeDocument(),
  jobTarget: null,
  ats: null,
  status: 'idle',
  dirty: false,
  savedAt: null,
  publicSlug: null,
  isPublic: false,
  error: null,

  reset() {
    set({
      resumeId: null,
      title: 'Untitled resume',
      templateId: 'aurora',
      document: emptyResumeDocument(),
      jobTarget: null,
      ats: null,
      status: 'idle',
      dirty: false,
      savedAt: null,
      publicSlug: null,
      isPublic: false,
      error: null,
    })
  },

  async load(id) {
    set({ status: 'loading', resumeId: id, error: null })
    try {
      const res = await api.get<{ resume: ResumeRecord }>(`/resumes/${id}`)
      set({
        resumeId: res.resume.id,
        title: res.resume.title,
        templateId: res.resume.templateId,
        document: hydrateResumeDocument(res.resume.document) as ResumeDocument,
        jobTarget: res.resume.jobTarget,
        ats: res.resume.atsReport,
        publicSlug: res.resume.publicSlug,
        isPublic: res.resume.isPublic,
        status: 'ready',
        dirty: false,
        savedAt: res.resume.updatedAt,
      })
    } catch (err) {
      set({ status: 'error', error: (err as Error).message })
      notify('Could not load that resume', 'error')
    }
  },

  async create(input = {}) {
    const res = await api.post<{ resume: ResumeRecord }>('/resumes', {
      title: input.title ?? 'Untitled resume',
      templateId: input.templateId ?? 'aurora',
      document: input.document,
    })
    set({
      resumeId: res.resume.id,
      title: res.resume.title,
      templateId: res.resume.templateId,
      document: hydrateResumeDocument(res.resume.document) as ResumeDocument,
      jobTarget: res.resume.jobTarget,
      ats: res.resume.atsReport,
      status: 'ready',
      dirty: false,
      savedAt: res.resume.updatedAt,
      publicSlug: res.resume.publicSlug,
      isPublic: res.resume.isPublic,
    })
    return res.resume.id
  },

  patch(partial) {
    set({ document: { ...get().document, ...partial }, dirty: true })
    get().save()
  },

  update(updater) {
    set({ document: updater(get().document), dirty: true })
    get().save()
  },

  setMeta(meta) {
    const doc = get().document
    set({ document: { ...doc, meta: { ...doc.meta, ...meta } }, dirty: true })
    get().save()
  },

  setTemplate(id) {
    set({ templateId: id, dirty: true })
    get().save()
  },

  setTitle(title) {
    set({ title, dirty: true })
    get().save()
  },

  setJobTarget(target) {
    const current = get().jobTarget
    set({
      jobTarget: target === null ? null : { ...(current ?? {}), ...target } as JobTarget,
      dirty: true,
    })
    get().save()
  },

  setDocument(doc, note) {
    set({ document: resumeDocumentSchema.parse(doc) as ResumeDocument, dirty: true })
    if (note) notify(note, 'success')
    get().save(true)
  },

  setAts(report) {
    set({ ats: report })
  },

  async save(immediate = false) {
    const state = get()
    if (!state.resumeId) return
    if (saveTimer) clearTimeout(saveTimer)
    const doSave = async () => {
      set({ status: 'saving' })
      try {
        const res = await api.patch<{ resume: ResumeRecord }>(`/resumes/${state.resumeId}`, {
          title: get().title,
          templateId: get().templateId,
          document: get().document,
          jobTarget: get().jobTarget,
          atsReport: get().ats,
        })
        set({ status: 'ready', dirty: false, savedAt: res.resume.updatedAt, error: null })
      } catch (err) {
        set({ status: 'error', error: (err as Error).message })
      }
    }
    if (immediate) return doSave()
    saveTimer = setTimeout(doSave, 900)
  },

  async score(jobDescription) {
    const id = get().resumeId
    if (!id) throw new Error('No resume loaded')
    const res = await api.post<{ report: AtsReport }>(`/resumes/${id}/score`, {
      jobDescription,
    })
    set({ ats: res.report })
    return res.report
  },

  async duplicate() {
    const id = get().resumeId
    if (!id) return null
    const res = await api.post<{ resume: ResumeRecord }>(`/resumes/${id}/duplicate`, {})
    notify('Duplicated', 'success')
    return res.resume.id
  },

  async toggleShare() {
    const id = get().resumeId
    if (!id) return null
    const res = await api.post<{ isPublic: boolean; publicSlug: string | null; url: string | null }>(
      `/resumes/${id}/share`,
      { enable: !get().isPublic },
    )
    set({ isPublic: res.isPublic, publicSlug: res.publicSlug })
    notify(res.isPublic ? 'Public link is live' : 'Resume is private again', 'success')
    return res.url
  },

  async remove() {
    const id = get().resumeId
    if (!id) return
    await api.del(`/resumes/${id}`)
    get().reset()
  },

  async markExported() {
    const id = get().resumeId
    if (!id) return
    await api.post(`/resumes/${id}/export`).catch(() => null)
  },
}))
