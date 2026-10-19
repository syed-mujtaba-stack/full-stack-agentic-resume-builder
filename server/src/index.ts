import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { env } from './env'
import { getDb } from './db/client'
import { ApiError } from './lib/http'
import { csrfGuard } from './auth/middleware'
import { hub } from './realtime/hub'
import { pushStats } from './services/stats'
import authRoutes, { ensureDemoUser } from './routes/auth'
import resumeRoutes from './routes/resumes'
import agentRoutes from './routes/agent'
import dashboardRoutes from './routes/dashboard'
import metaRoutes from './routes/meta'

const app = express()
const server = http.createServer(app)

app.disable('x-powered-by')
app.set('trust proxy', true)

app.use(
  helmet({
    contentSecurityPolicy: false, // the SPA injects styles at runtime (Vite dev + GSAP)
    crossOriginEmbedderPolicy: false,
  }),
)
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (env.origins.includes(origin)) return cb(null, true)
      if (env.isProd) return cb(null, false)
      return cb(null, true) // dev: allow the sandbox preview host
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '4mb' }))
app.use(cookieParser())
app.use(csrfGuard(env.origins))

/* ---------------------------------- API --------------------------------- */

app.use('/api', metaRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/resumes', resumeRoutes)
app.use('/api/agent', agentRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.get('/api', (_req, res) => {
  res.json({
    name: env.appName,
    ok: true,
    endpoints: [
      '/api/health',
      '/api/config',
      '/api/auth/*',
      '/api/resumes/*',
      '/api/agent/run',
      '/api/dashboard',
      '/api/templates',
    ],
  })
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Unknown API route', code: 'not_found' })
})

/* ------------------------------- Static SPA ------------------------------ */

const distIndex = path.join(env.webDist, 'index.html')
if (fs.existsSync(env.webDist)) {
  app.use(
    express.static(env.webDist, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
      },
    }),
  )
  app.get(/^\/(?!api|ws).*/, (_req, res) => {
    res.sendFile(distIndex)
  })
} else {
  app.get('/', (_req, res) => {
    res
      .status(200)
      .type('html')
      .send(
        `<pre style="font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;padding:32px;background:#0b1020;color:#e2e8f0;min-height:100vh;margin:0">
Arbor API is running.

  health   →  /api/health
  config   →  /api/config
  ws       →  ws://localhost:${env.port}/ws

The web app is not built yet. From the repo root run:

  npm install
  npm run dev      # api on :${env.port}, web on :5173
</pre>`,
      )
  })
}

/* ------------------------------- Errors ---------------------------------- */

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const error = err instanceof ApiError ? err : null
  const status = error?.status ?? 500
  const message = error?.message ?? 'Unexpected server error'
  if (status >= 500) console.error('[error]', err)
  res.status(status).json({
    error: message,
    code: error?.code ?? 'server_error',
    details: error?.details ?? undefined,
  })
})

/* ------------------------------- Realtime -------------------------------- */

hub.attach(server, '/ws')

/* --------------------------------- Boot ---------------------------------- */

const PORT = env.port

async function main() {
  const { label } = await getDb()
  await ensureDemoUser()

  server.listen(PORT, '0.0.0.0', () => {
    console.log('')
    console.log('  🌳  Arbor — agentic resume builder')
    console.log(`  ├─ api        http://localhost:${PORT}/api`)
    console.log(`  ├─ websocket  ws://localhost:${PORT}/ws`)
    console.log(`  ├─ database   ${label}`)
    console.log(`  ├─ agent      ${process.env.OPENROUTER_API_KEY ? `OpenRouter (${env.openrouterModel})` : 'Nova offline engine (no API key set)'}`)
    console.log(`  └─ web        ${fs.existsSync(env.webDist) ? env.webDist : 'run `npm run dev:web` (Vite :5173)'}`)
    console.log('')
  })

  // Keep dashboards fresh even when nothing is streaming.
  setInterval(() => {
    void pushStats
  }, 5 * 60_000).unref?.()
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

export { app, server }
