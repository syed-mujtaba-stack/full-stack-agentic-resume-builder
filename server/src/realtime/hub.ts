import { randomUUID } from 'node:crypto'
import type { IncomingMessage, Server } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocketServer, WebSocket } from 'ws'
import type {
  ActivityItem,
  PresenceUser,
  RealtimeClientMessage,
  RealtimeServerMessage,
  PublicUser,
} from '@arbor/shared'
import { verifyAccessToken } from '../auth/tokens'
import { ACCESS_COOKIE } from '../auth/middleware'

const PRESENCE_COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#f43f5e', '#a855f7', '#14b8a6']

export type HubClient = {
  id: string
  userId: string
  name: string
  email: string
  color: string
  ws: WebSocket
  subs: Set<string>
  presence: Map<string, string | null>
  lastSeen: number
}

function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = decodeURIComponent(part.slice(idx + 1).trim())
    if (k) out[k] = v
  }
  return out
}

/**
 * Realtime hub: authenticated WebSocket channels for
 *   • presence + live co-editing indicators per resume
 *   • live agent run streaming (mirrored from NDJSON runs)
 *   • dashboard stats + activity feed pushes
 */
export class Hub {
  private wss: WebSocketServer | null = null
  private clients = new Map<string, HubClient>()
  private heartbeat: NodeJS.Timeout | null = null

  attach(server: Server, path = '/ws') {
    this.wss = new WebSocketServer({ noServer: true })
    server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (url.pathname !== path) return // let Vite's HMR socket etc. pass through
      void this.handleUpgrade(req, socket, head)
    })

    this.heartbeat = setInterval(() => {
      const now = Date.now()
      for (const client of [...this.clients.values()]) {
        if (now - client.lastSeen > 60_000) {
          try {
            client.ws.terminate()
          } catch {
            /* ignore */
          }
          this.remove(client)
        }
      }
    }, 30_000)
    this.heartbeat.unref?.()
  }

  private async handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const cookies = parseCookies(req.headers.cookie)
    const token = url.searchParams.get('token') ?? cookies[ACCESS_COOKIE] ?? null
    const claims = token ? await verifyAccessToken(token) : null
    if (!claims) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }
    this.wss!.handleUpgrade(req, socket, head, (ws) => {
      this.register(ws, {
        userId: claims.sub,
        name: claims.name ?? 'Anonymous',
        email: claims.email ?? '',
      })
    })
  }

  private register(ws: WebSocket, identity: { userId: string; name: string; email: string }) {
    const id = randomUUID()
    const existing = [...this.clients.values()].filter((c) => c.userId === identity.userId).length
    const client: HubClient = {
      id,
      userId: identity.userId,
      name: identity.name,
      email: identity.email,
      color: PRESENCE_COLORS[existing % PRESENCE_COLORS.length]!,
      ws,
      subs: new Set(),
      presence: new Map(),
      lastSeen: Date.now(),
    }
    this.clients.set(id, client)

    ws.on('message', (raw) => {
      client.lastSeen = Date.now()
      let msg: RealtimeClientMessage
      try {
        msg = JSON.parse(raw.toString()) as RealtimeClientMessage
      } catch {
        return
      }
      this.handleMessage(client, msg)
    })

    ws.on('pong', () => {
      client.lastSeen = Date.now()
    })

    ws.on('close', () => this.remove(client))
    ws.on('error', () => this.remove(client))

    this.send(client, {
      type: 'hello',
      connectionId: id,
      user: {
        id: client.userId,
        email: client.email,
        name: client.name,
        avatarUrl: null,
        plan: 'free',
        role: 'user',
        emailVerified: true,
        locale: 'en',
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
      } as PublicUser,
      online: this.onlineUsers(),
      serverTime: new Date().toISOString(),
    })
    this.broadcastOnline()
  }

  private remove(client: HubClient) {
    if (!this.clients.has(client.id)) return
    this.clients.delete(client.id)
    for (const resumeId of client.subs) this.broadcastPresence(resumeId)
    this.broadcastOnline()
  }

  private handleMessage(client: HubClient, msg: RealtimeClientMessage) {
    switch (msg.type) {
      case 'ping':
        this.send(client, { type: 'pong', t: Date.now() })
        break
      case 'subscribe':
        client.subs.add(msg.resumeId)
        client.presence.set(msg.resumeId, null)
        this.broadcastPresence(msg.resumeId)
        break
      case 'unsubscribe':
        client.subs.delete(msg.resumeId)
        client.presence.delete(msg.resumeId)
        this.broadcastPresence(msg.resumeId)
        break
      case 'presence':
        if (msg.resumeId) {
          client.subs.add(msg.resumeId)
          client.presence.set(msg.resumeId, msg.section ?? null)
          this.broadcastPresence(msg.resumeId)
        }
        break
      default:
        break
    }
  }

  private send(client: HubClient, msg: RealtimeServerMessage) {
    if (client.ws.readyState !== WebSocket.OPEN) return
    try {
      client.ws.send(JSON.stringify(msg))
    } catch {
      /* ignore */
    }
  }

  private broadcastPresence(resumeId: string) {
    const users: PresenceUser[] = [...this.clients.values()]
      .filter((c) => c.subs.has(resumeId))
      .map((c) => ({
        userId: c.userId,
        name: c.name,
        color: c.color,
        section: c.presence.get(resumeId) ?? null,
        at: new Date().toISOString(),
      }))
    for (const client of this.clients.values()) {
      if (client.subs.has(resumeId)) this.send(client, { type: 'presence', resumeId, users })
    }
  }

  private broadcastOnline() {
    const online = this.onlineUsers()
    for (const client of this.clients.values()) this.send(client, { type: 'online', online })
  }

  onlineUsers(): number {
    return new Set([...this.clients.values()].map((c) => c.userId)).size
  }

  onlineConnections(): number {
    return this.clients.size
  }

  broadcastToUser(userId: string, msg: RealtimeServerMessage) {
    for (const client of this.clients.values()) {
      if (client.userId === userId) this.send(client, msg)
    }
  }

  broadcastToResume(resumeId: string, msg: RealtimeServerMessage, exceptUserId?: string) {
    for (const client of this.clients.values()) {
      if (!client.subs.has(resumeId)) continue
      if (exceptUserId && client.userId === exceptUserId) continue
      this.send(client, msg)
    }
  }

  broadcastAll(msg: RealtimeServerMessage) {
    for (const client of this.clients.values()) this.send(client, msg)
  }
}

export const hub = new Hub()

/** Small helper used by routes to announce activity on the socket. */
export function pushActivity(userId: string, item: ActivityItem) {
  hub.broadcastToUser(userId, { type: 'activity', item })
}
