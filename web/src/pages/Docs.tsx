import { Link } from 'react-router-dom'
import { Bot, Braces, Database, Lock, Radio, Terminal } from 'lucide-react'
import { Badge, Card } from '../components/ui'
import { useReveal } from '../lib/gsap'

const endpoints = [
  { method: 'POST', path: '/api/auth/register', body: 'Create account, issue session cookies' },
  { method: 'POST', path: '/api/auth/login', body: 'Email + password sign-in' },
  { method: 'POST', path: '/api/auth/refresh', body: 'Rotate refresh token, new access token' },
  { method: 'GET', path: '/api/auth/sessions', body: 'List and revoke sessions' },
  { method: 'GET', path: '/api/resumes', body: 'List your resumes with ATS + completeness' },
  { method: 'POST', path: '/api/resumes', body: 'Create from template' },
  { method: 'PATCH', path: '/api/resumes/:id', body: 'Autosave document / template / sharing' },
  { method: 'POST', path: '/api/resumes/:id/score', body: 'ATS scan with optional job description' },
  { method: 'POST', path: '/api/agent/run', body: 'Streaming NDJSON agent run' },
  { method: 'GET', path: '/api/dashboard', body: 'Stats + activity feed' },
  { method: 'WS', path: '/ws', body: 'Realtime presence, activity, agent events, stats' },
]

const envVars = [
  ['DATABASE_URL', 'Empty = embedded Postgres in ./.data · set to a Neon URL for prod'],
  ['OPENROUTER_API_KEY', 'Empty = offline Nova engine · set to enable the LLM agent'],
  ['OPENROUTER_MODEL', 'Any OpenRouter model id (default openrouter/auto)'],
  ['AUTH_SECRET', 'Signs access + refresh JWTs (required in production)'],
  ['CLIENT_URL', 'CORS + cookie origin allow-list, comma separated'],
  ['GOOGLE_CLIENT_ID / SECRET', 'Enables the Google sign-in button'],
  ['GITHUB_CLIENT_ID / SECRET', 'Enables the GitHub sign-in button'],
]

export default function Docs() {
  const ref = useReveal<HTMLDivElement>({ stagger: 0.08 })

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <Badge tone="info" className="mb-4">
        <Terminal className="h-3 w-3" /> Documentation
      </Badge>
      <h1 className="font-display text-4xl font-bold tracking-tight text-white">How Arbor works</h1>
      <p className="mt-3 text-slate-400">
        A tour of the architecture, the agent loop and how to run the whole thing yourself.
      </p>

      <div ref={ref} className="mt-10 space-y-5">
        <Card data-reveal className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Bot className="h-4 w-4 text-aurora-300" /> The agent loop
          </h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-300">
            {[
              'You paste raw skills, or a job description, or both.',
              'The server detects the industry and loads its keyword, verb and metric library.',
              'With an OpenRouter key the model calls real tools — inspect_resume, write_summary, replace_experience, replace_skills, score_resume, finalize — streaming every token back over NDJSON.',
              'Without a key the offline Nova engine performs the same plan deterministically: bullet rewriting, skill grouping, keyword mirroring and summary generation.',
              'The ATS engine scores the result; if it is under 80 the agent fixes the top issues and scores again.',
              'The final document is patched into the editor live and saved to Postgres.',
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-aurora-500/15 text-xs font-bold text-aurora-300">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card data-reveal className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Braces className="h-4 w-4 text-aurora-300" /> Run it locally
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-white/8 bg-black/50 p-4 text-xs leading-relaxed text-slate-300">
            {`git clone https://github.com/syed-mujtaba-stack/full-stack-agentic-resume-builder
cd full-stack-agentic-resume-builder
npm install
cp .env.example .env      # optional — zero config works out of the box
npm run dev               # API :8787  ·  Web :5173`}
          </pre>
          <p className="mt-3 text-xs text-slate-500">
            The API boots with an embedded Postgres (PGlite) persisted to <code>./.data</code> and seeds a demo account:{' '}
            <code>demo@arbor.dev / demo1234</code>.
          </p>
        </Card>

        <Card data-reveal className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Database className="h-4 w-4 text-aurora-300" /> Going to production
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>
              • Set <code>DATABASE_URL</code> to a Neon connection string — the same Drizzle schema runs unchanged.
            </li>
            <li>
              • Set <code>AUTH_SECRET</code>, <code>CLIENT_URL</code> and <code>API_URL</code>; cookies flip to secure.
            </li>
            <li>
              • Build once with <code>npm run build</code> — the Express server serves <code>web/dist</code> from a single
              process.
            </li>
            <li>
              • Add <code>OPENROUTER_API_KEY</code> to switch the agent from offline heuristics to LLM tool calling.
            </li>
          </ul>
        </Card>

        <Card data-reveal className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Lock className="h-4 w-4 text-aurora-300" /> Environment
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/8">
            <table className="w-full text-left text-xs">
              <tbody>
                {envVars.map(([k, v], i) => (
                  <tr key={k} className={i % 2 ? 'bg-white/[0.02]' : ''}>
                    <td className="w-1/3 px-3 py-2 font-mono text-aurora-300">{k}</td>
                    <td className="px-3 py-2 text-slate-400">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card data-reveal className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Radio className="h-4 w-4 text-aurora-300" /> API surface
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/8">
            <table className="w-full text-left text-xs">
              <tbody>
                {endpoints.map((e, i) => (
                  <tr key={e.path} className={i % 2 ? 'bg-white/[0.02]' : ''}>
                    <td className="w-16 px-3 py-2 font-mono text-emerald-300">{e.method}</td>
                    <td className="w-1/3 px-3 py-2 font-mono text-slate-300">{e.path}</td>
                    <td className="px-3 py-2 text-slate-500">{e.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Every response is JSON; the agent run endpoint streams newline-delimited JSON events.
          </p>
        </Card>
      </div>

      <div className="mt-10 text-center">
        <Link to="/register">
          <Badge tone="info" className="px-3 py-1.5 text-xs">
            Ready? Build your resume →
          </Badge>
        </Link>
      </div>
    </div>
  )
}
