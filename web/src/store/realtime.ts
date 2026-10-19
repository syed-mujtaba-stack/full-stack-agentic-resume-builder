import { create } from 'zustand'
import type { ActivityItem, DashboardStats, PresenceUser, RealtimeServerMessage } from '@arbor/shared'

type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed'

type RealtimeState = {
  state: ConnectionState
  online: number
  connections: number
  presence: Record<string, PresenceUser[]>
  activity: ActivityItem[]
  stats: DashboardStats | null
  lastMessageAt: string | null
  socket: WebSocket | null
  subscribed: string[]
  connect: () => void
  disconnect: () => void
  subscribe: (resumeId: string) => void
  unsubscribe: (resumeId: string) => void
  setPresence: (resumeId: string, section: string | null) => void
  pushActivity: (item: ActivityItem) => void
  setStats: (stats: DashboardStats) => void
}

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let warned = false

export const useRealtime = create<RealtimeState>((set, get) => ({
  state: 'idle',
  online: 0,
  connections: 0,
  presence: {},
  activity: [],
  stats: null,
  lastMessageAt: null,
  socket: null,
  subscribed: [],

  connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${window.location.host}/ws`
    set({ state: 'connecting' })
    try {
      socket = new WebSocket(url)
    } catch {
      set({ state: 'closed' })
      return
    }
    set({ socket })

    socket.onopen = () => {
      warned = false
      set({ state: 'open' })
      for (const resumeId of get().subscribed) {
        socket?.send(JSON.stringify({ type: 'subscribe', resumeId }))
      }
    }

    socket.onmessage = (event) => {
      let msg: RealtimeServerMessage
      try {
        msg = JSON.parse(event.data as string) as RealtimeServerMessage
      } catch {
        return
      }
      set({ lastMessageAt: new Date().toISOString() })
      switch (msg.type) {
        case 'hello':
          set({ online: msg.online })
          break
        case 'online':
          set({ online: msg.online })
          break
        case 'presence':
          set({ presence: { ...get().presence, [msg.resumeId]: msg.users } })
          break
        case 'activity':
          set({ activity: [msg.item, ...get().activity].slice(0, 60) })
          break
        case 'stats':
          set({ stats: msg.stats })
          break
        case 'pong':
          break
        default:
          break
      }
    }

    socket.onclose = () => {
      set({ state: 'closed', socket: null })
      socket = null
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(() => get().connect(), 4000)
    }

    socket.onerror = () => {
      if (!warned) {
        warned = true
        console.warn('[realtime] socket error — retrying in a few seconds')
      }
    }
  },

  disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    socket?.close()
    socket = null
    set({ state: 'closed', socket: null, subscribed: [] })
  },

  subscribe(resumeId) {
    const subs = get().subscribed.includes(resumeId) ? get().subscribed : [...get().subscribed, resumeId]
    set({ subscribed: subs })
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'subscribe', resumeId }))
    }
  },

  unsubscribe(resumeId) {
    set({ subscribed: get().subscribed.filter((id) => id !== resumeId) })
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'unsubscribe', resumeId }))
    }
  },

  setPresence(resumeId, section) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'presence', resumeId, section }))
    }
  },

  pushActivity(item) {
    set({ activity: [item, ...get().activity].slice(0, 60) })
  },

  setStats(stats) {
    set({ stats })
  },
}))
