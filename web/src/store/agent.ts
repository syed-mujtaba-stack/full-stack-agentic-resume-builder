import { create } from 'zustand'
import type {
  AgentEngine,
  AgentEvent,
  AgentRunKind,
  AgentStep,
  AgentToolCall,
  AtsReport,
  ResumeDocument,
  TemplateId,
} from '@arbor/shared'
import { api } from '../lib/api'
import { useBuilder } from './builder'
import { notify } from './ui'

export type AgentTranscript = { role: 'user' | 'assistant' | 'system'; text: string }

type AgentState = {
  running: boolean
  runId: string | null
  engine: AgentEngine | null
  model: string
  steps: AgentStep[]
  tools: AgentToolCall[]
  stream: string
  transcript: AgentTranscript[]
  ats: AtsReport | null
  usage: { inputTokens: number; outputTokens: number; costUsd: number | null }
  error: string | null
  autoApply: boolean
  startedAt: number | null
  durationMs: number | null

  setAutoApply: (v: boolean) => void
  reset: () => void
  run: (input: {
    kind: AgentRunKind
    skills?: string
    targetRole?: string
    industry?: string
    seniority?: string
    jobDescription?: string
    yearsExperience?: number
    instructions?: string
    resumeId?: string | null
    templateId?: TemplateId
    model?: string | null
  }) => Promise<void>
  cancel: () => void
}

let controller: AbortController | null = null

export const useAgent = create<AgentState>((set, get) => ({
  running: false,
  runId: null,
  engine: null,
  model: '',
  steps: [],
  tools: [],
  stream: '',
  transcript: [],
  ats: null,
  usage: { inputTokens: 0, outputTokens: 0, costUsd: null },
  error: null,
  autoApply: true,
  startedAt: null,
  durationMs: null,

  setAutoApply(v) {
    set({ autoApply: v })
  },

  reset() {
    set({
      running: false,
      runId: null,
      steps: [],
      tools: [],
      stream: '',
      transcript: [],
      ats: null,
      error: null,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: null },
      startedAt: null,
      durationMs: null,
    })
  },

  cancel() {
    controller?.abort()
    controller = null
    set({ running: false })
  },

  async run(input) {
    const builder = useBuilder.getState()
    if (get().running) return
    controller = new AbortController()

    set({
      running: true,
      error: null,
      steps: [],
      tools: [],
      stream: '',
      ats: null,
      runId: null,
      startedAt: Date.now(),
      durationMs: null,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: null },
      transcript:
        input.kind === 'interview'
          ? get().transcript
          : [...get().transcript, { role: 'user' as const, text: describeRun(input) }],
    })

    const handleEvent = (event: AgentEvent) => {
      switch (event.type) {
        case 'run:start':
          set({ runId: event.runId, engine: event.engine, model: event.model })
          break
        case 'step': {
          const steps = [...get().steps]
          const idx = steps.findIndex((s) => s.id === event.step.id)
          if (idx >= 0) steps[idx] = event.step
          else steps.push(event.step)
          set({ steps })
          break
        }
        case 'tool:start':
          set({ tools: [...get().tools.filter((t) => t.id !== event.call.id), event.call] })
          break
        case 'tool:end':
          set({ tools: get().tools.map((t) => (t.id === event.call.id ? event.call : t)) })
          break
        case 'token':
          set({ stream: get().stream + event.text })
          break
        case 'patch':
          if (get().autoApply) {
            useBuilder.getState().setDocument(event.document)
          }
          break
        case 'ats':
          set({ ats: event.report })
          useBuilder.getState().setAts(event.report)
          break
        case 'message':
          if (event.text) {
            set({ transcript: [...get().transcript, { role: event.role, text: event.text }] })
          }
          break
        case 'usage':
          set({
            usage: {
              inputTokens: get().usage.inputTokens + event.inputTokens,
              outputTokens: get().usage.outputTokens + event.outputTokens,
              costUsd: event.costUsd ?? get().usage.costUsd,
            },
          })
          break
        case 'error':
          set({ error: event.message })
          notify(event.message, event.recoverable ? 'warn' : 'error')
          break
        case 'run:end':
          set({ running: false, durationMs: event.durationMs })
          break
        default:
          break
      }
    }

    try {
      await api.stream<AgentEvent>(
        '/agent/run',
        {
          kind: input.kind,
          resumeId: input.resumeId ?? builder.resumeId ?? null,
          skills: input.skills ?? '',
          targetRole: input.targetRole ?? builder.jobTarget?.role ?? '',
          industry: input.industry ?? builder.jobTarget?.industry ?? '',
          seniority: input.seniority ?? 'mid',
          jobDescription: input.jobDescription ?? builder.jobTarget?.jobDescription ?? '',
          yearsExperience: input.yearsExperience,
          instructions: input.instructions ?? '',
          templateId: input.templateId ?? builder.templateId,
          model: input.model ?? null,
          document: builder.document as ResumeDocument,
        },
        handleEvent,
        { signal: controller.signal },
      )
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const message = (err as Error).message || 'The agent could not run'
        set({ error: message, running: false })
        notify(message, 'error')
      }
    } finally {
      set({ running: false })
      controller = null
    }
  },
}))

function describeRun(input: {
  kind: AgentRunKind
  skills?: string
  targetRole?: string
  instructions?: string
  jobDescription?: string
}): string {
  switch (input.kind) {
    case 'generate':
      return `Build me an industry-level resume for ${input.targetRole || 'my target role'}. Skills: ${
        (input.skills ?? '').slice(0, 220) || '—'
      }`
    case 'tailor':
      return `Tailor my resume to this job description: ${(input.jobDescription ?? '').slice(0, 220) || '—'}`
    case 'rewrite':
      return 'Rewrite every bullet for impact.'
    case 'summary':
      return 'Write a stronger professional summary.'
    case 'review':
      return 'Review my resume like a recruiter.'
    case 'interview':
      return 'Ask me the questions you need.'
    default:
      return input.instructions || 'Run the agent.'
  }
}

export { describeRun }
