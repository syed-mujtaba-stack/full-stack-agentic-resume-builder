# 🌳 Arbor — agentic resume builder

**An AI-powered, full-stack resume builder with a real agent — free, open source, and production-shaped.**

Paste your skills. Arbor's agent plans, writes, scores and rewrites until your resume clears the ATS
and survives the seven-second human skim — then prints to a pixel-perfect PDF.

Built with **React 19 + TypeScript + GSAP + Three.js** on the front and **Express + WebSockets +
Postgres (Neon) + OpenRouter agents** on the back.

```
web (Vite/React 19 · Tailwind v4 · GSAP · Three.js)  ──▶  /api  ──▶  Express 5
                        ▲                                              │
                        └────────────── /ws (realtime hub) ────────────┤
                                                                       ▼
                                                   Postgres (Neon serverless | embedded PGlite)
                                                                       ▲
                                                        OpenRouter tool-calling agent
```

---

## ✨ What's inside

| Pillar | What you get |
| --- | --- |
| **8 templates** | Aurora, Onyx, Nova, Quantum, Meridian, Vertex, Lumen, Pulse — ATS-safe through creative, A4 + US Letter, print-perfect PDFs |
| **The agent** | Give it raw skills (or a job post). It detects your industry, writes a summary, rewrites bullets, groups skills, mirrors keywords, scores itself and iterates |
| **Two engines** | `openrouter` (LLM with 13 tools, streamed token by token) or `nova-offline` (deterministic heuristic engine — works with **zero API keys**) |
| **ATS engine** | Real scoring: keyword coverage, quantified-impact, structure, readability, completeness — with a prioritised fix list |
| **Realtime dashboard** | WebSocket hub pushes presence, agent events, activity feed, ATS trend and usage meters |
| **Real auth** | Email + password (bcrypt), rotating refresh tokens, revocable sessions, password reset, optional Google/GitHub OAuth, CSRF guard |
| **Postgres** | Drizzle schema that runs on embedded PGlite locally and Neon serverless in prod — same SQL, one `DATABASE_URL` |
| **Export** | Print-to-PDF (exactly what you preview), public share links, JSON export/import, autosave + version history |

---

## 🚀 Quick start

```bash
git clone https://github.com/syed-mujtaba-stack/full-stack-agentic-resume-builder
cd full-stack-agentic-resume-builder
npm install
npm run dev            # API on :8787 · Web on :5173
```

Open <http://localhost:5173>. That's it — **no configuration required**:

* the database is an embedded Postgres persisted to `./.data/pgdata`
* the agent runs the offline **Nova** engine
* a demo account is seeded: **demo@arbor.dev / demo1234**

Then make it yours:

```bash
cp .env.example .env
# DATABASE_URL=postgresql://…neon.tech/neondb?sslmode=require   → serverless Postgres
# OPENROUTER_API_KEY=sk-or-…                                    → LLM agent with tool calling
```

---

## 🧠 The agent

### Loop

1. **Intake** — raw skills, a job description, a target role, extra instructions.
2. **Plan** — detect the industry and load its keyword / verb / metric library (13 industries).
3. **Write** — with an OpenRouter key the model calls real tools; without one the offline engine runs the same plan deterministically.
4. **Score** — the ATS engine returns a number and a fix list.
5. **Iterate** — if the score is under 80 the agent fixes the top issues and scores again.
6. **Apply** — the document is streamed back into the editor live and saved.

### Tools the LLM can call

`inspect_resume` · `industry_keywords` · `set_profile` · `write_summary` · `replace_experience` ·
`replace_education` · `replace_skills` · `replace_projects` · `replace_certifications` ·
`rewrite_bullets` · `score_resume` · `recommend_template` · `finalize`

Runs stream as **newline-delimited JSON** (`POST /api/agent/run`) and are mirrored on the WebSocket so
the dashboard stays live:

```
{"type":"run:start","runId":"run_…","kind":"generate","model":"openrouter/auto","engine":"openrouter"}
{"type":"step","step":{"id":"…","index":0,"title":"Detect industry","state":"active"}}
{"type":"tool:start","call":{"id":"…","name":"replace_experience","state":"active"}}
{"type":"tool:end","call":{"id":"…","name":"replace_experience","state":"done","result":{…}}}
{"type":"patch","document":{…},"note":"Wrote 2 role(s)"}
{"type":"ats","report":{"score":86,"grade":"B",…}}
{"type":"token","text":"Done — here's what changed…"}
{"type":"run:end","runId":"run_…","status":"completed","durationMs":4210,"steps":[…]}
```

### Offline Nova engine (no key, no cost, no data leaving your box)

Industry detection → summary templating → skill grouping → verb-first bullet rewriting with metric
placeholders (`[X]%`) → job-post keyword mirroring → ATS scan. It never invents employers, dates or
metrics it cannot infer.

---

## 📊 ATS scoring

| Signal | Weight | What it measures |
| --- | --- | --- |
| Keywords | 28% | Coverage of the job post's keywords (or of your industry's core stack) |
| Impact | 24% | Share of bullets that are quantified, verb-first and free of filler |
| Structure | 20% | Contact fields, standard headings, dates, section completeness |
| Readability | 13% | Bullet length (14–24 words), passive voice, buzzwords |
| Completeness | 15% | 11 weighted profile checks |

Every score ships with matched/missing keywords, issues (`critical` / `warning` / `tip`) and
"next best actions" so the number is always actionable.

---

## 🧱 Project layout

```
.
├── shared/            @arbor/shared — types, zod schemas, template catalogue, industry library
├── server/            Express 5 API
│   └── src
│       ├── agent/     OpenRouter client, tool definitions, orchestrator, offline engine
│       ├── auth/      passwords, JWT issuing/rotation, middleware, OAuth
│       ├── db/        Drizzle schema + Neon/PGlite driver switch
│       ├── realtime/  authenticated WebSocket hub
│       ├── routes/    auth · resumes · agent · dashboard · meta
│       └── services/  activity log, dashboard statistics
├── web/               React 19 app
│   └── src
│       ├── components/  ui kit · three.js scenes · builder panels
│       ├── pages/       Landing · Auth · Dashboard · Builder · Templates · Pricing · Docs · Settings
│       ├── store/       zustand stores (auth, builder, agent, realtime, ui)
│       └── templates/   8 resume layouts + registry
└── scripts/           smoke test (renders every page + template in Node)
```

---

## 🔌 API surface

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` · `/login` · `/refresh` · `/logout` · `/logout-all` | Sessions (httpOnly cookies) |
| GET/PATCH | `/api/auth/me` | Profile |
| POST | `/api/auth/change-password` · `/forgot-password` · `/reset-password` | Credentials |
| GET/DELETE | `/api/auth/sessions` · `/api/auth/sessions/:id` | Session management |
| GET | `/api/auth/oauth/:provider` | Google / GitHub (when configured) |
| GET/POST/PATCH/DELETE | `/api/resumes` · `/api/resumes/:id` | CRUD + autosave |
| POST | `/api/resumes/:id/score` · `/duplicate` · `/share` · `/export` | ATS, sharing, analytics |
| GET | `/api/resumes/:id/versions` | Restore points |
| POST | `/api/agent/run` | Streaming NDJSON agent run |
| GET | `/api/agent/models` · `/runs` · `/config` | Model catalogue, history |
| GET | `/api/dashboard` | Stats + activity |
| GET | `/api/r/:slug` | Public resume (no auth) |
| WS | `/ws` | Presence, activity, agent events, live stats |

---

## 🌍 Deploy

**One process** — the API serves `web/dist` when it exists:

```bash
npm run build && npm start     # Express on :8787 serving API + SPA
```

* **Database** — set `DATABASE_URL` to a [Neon](https://neon.tech) connection string. Tables are created
  idempotently on boot, so there is no migration step to babysit.
* **Agent** — set `OPENROUTER_API_KEY` (and optionally `OPENROUTER_MODEL`).
* **Security** — set `AUTH_SECRET`, `CLIENT_URL`, `API_URL`. Cookies switch to `secure` in production.
* **Docker** — see the included `Dockerfile` (multi-stage build, embedded Postgres by default).

---

## 🧪 Checks

```bash
npm run typecheck   # shared + server + web
npm run build       # production bundle
npm run smoke       # renders every page and template in Node to catch runtime regressions
```

---

## 🗺️ Roadmap

* Cover-letter agent that reuses the same resume graph
* Multi-language UI + locale-aware date/phone formats
* Interview-prep question sets generated from your resume
* DOCX export alongside PDF
* Team workspaces with shared templates

PRs welcome — templates, industries, ATS heuristics and translations are the easiest places to start.

---

## 📄 License

MIT © syed-mujtaba-stack
