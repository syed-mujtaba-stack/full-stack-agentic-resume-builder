import { create } from 'zustand'
import { api } from '../lib/api'
import type { PublicUser, SessionInfo } from '@arbor/shared'

export type AppConfig = {
  appName: string
  version: string
  oauth: ('google' | 'github')[]
  agent: {
    engine: 'openrouter' | 'nova-offline'
    configured: boolean
    defaultModel: string
    models: { id: string; label: string; note?: string }[]
  }
  limits: { agentRunsPerDay: number; resumes: number }
  demo: { email: string; password: string }
  features: { templates: number; realtime: boolean; pdfExport: boolean; publicSharing: boolean; versionHistory: boolean }
}

type AuthState = {
  user: PublicUser | null
  status: 'loading' | 'authenticated' | 'anonymous'
  config: AppConfig | null
  sessions: SessionInfo[]
  error: string | null
  bootstrap: () => Promise<void>
  loadConfig: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  updateProfile: (patch: { name?: string; avatarUrl?: string | null; locale?: string }) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  fetchSessions: () => Promise<void>
  revokeSession: (id: string) => Promise<void>
  forgotPassword: (email: string) => Promise<{ devResetToken?: string }>
  resetPassword: (token: string, password: string) => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',
  config: null,
  sessions: [],
  error: null,

  async loadConfig() {
    try {
      const config = await api.get<AppConfig>('/config')
      set({ config })
    } catch {
      set({ config: null })
    }
  },

  async bootstrap() {
    try {
      const [me, config] = await Promise.all([
        api.get<{ user: PublicUser }>('/auth/me', { skipRefresh: true }),
        api.get<AppConfig>('/config').catch(() => null),
      ])
      set({ user: me.user, status: 'authenticated', config, error: null })
    } catch {
      const config = await api.get<AppConfig>('/config').catch(() => null)
      set({ user: null, status: 'anonymous', config })
    }
  },

  async login(email, password) {
    const res = await api.post<{ user: PublicUser }>('/auth/login', { email, password })
    set({ user: res.user, status: 'authenticated', error: null })
  },

  async register(name, email, password) {
    const res = await api.post<{ user: PublicUser }>('/auth/register', { name, email, password })
    set({ user: res.user, status: 'authenticated', error: null })
  },

  async logout() {
    await api.post('/auth/logout').catch(() => null)
    set({ user: null, status: 'anonymous', sessions: [] })
  },

  async logoutAll() {
    await api.post('/auth/logout-all').catch(() => null)
    set({ user: null, status: 'anonymous', sessions: [] })
  },

  async updateProfile(patch) {
    const res = await api.patch<{ user: PublicUser }>('/auth/me', patch)
    set({ user: res.user })
  },

  async changePassword(currentPassword, newPassword) {
    await api.post('/auth/change-password', { currentPassword, newPassword })
    set({ user: null, status: 'anonymous' })
  },

  async fetchSessions() {
    const res = await api.get<{ sessions: SessionInfo[] }>('/auth/sessions')
    set({ sessions: res.sessions })
  },

  async revokeSession(id) {
    await api.del(`/auth/sessions/${id}`)
    set({ sessions: get().sessions.filter((s) => s.id !== id) })
  },

  async forgotPassword(email) {
    return api.post<{ ok: true; devResetToken?: string }>('/auth/forgot-password', { email })
  },

  async resetPassword(token, password) {
    await api.post('/auth/reset-password', { token, password })
  },
}))
