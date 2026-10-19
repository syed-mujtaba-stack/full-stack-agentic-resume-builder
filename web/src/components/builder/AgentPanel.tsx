import { useMemo, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Cpu,
  FileSearch,
  Loader2,
  MessagesSquare,
  Rocket,
  Sparkles,
  Square,
  Wand2,
  XCircle,
} from 'lucide-react'
import { INDUSTRY_PROFILES, SENIORITY_LEVELS, type AgentRunKind } from '@arbor/shared'
import { Badge, Button, Input, Label, Select, Switch, Tabs, Textarea } from '../ui'
import { useAgent } from '../../store/agent'
import { useAuth } from '../../store/auth'
import { cn, timeAgo } from '../../lib/utils'

const KINDS: { id: AgentRunKind; label: string; icon: React.ReactNode; hint: string }[] = [
  {
    id: 'generate',
    label: 'Build',
    icon: <Rocket className="h-3.5 w-3.5" />,
    hint: 'Paste your skills — get a complete, industry-level resume.',
  },
  {
    id: 'tailor',
    label: 'Tailor',
    icon: <FileSearch className="h-3.5 w-3.5" />,
    hint: 'Paste a job post — the agent rewrites around its keywords.',
  },
  {
    id: 'rewrite',
    label: 'Polish',
    icon: <Wand2 className="h-3.5 w-3.5" />,
    hint: 'Verb-first, quantified, ATS-safe bullets everywhere.',
  },
  {
    id: 'review',
    label: 'Review',
    icon: <MessagesSquare className="h-3.5 w-3.5" />,
    hint: 'Recruiter-style critique with a fix list.',
  },
  {
    id: 'interview',
    label: 'Interview',
    icon: <Bot className="h-3.5 w-3.5" />,
    hint: 'The agent asks you exactly what it needs.',
  },
]

export function AgentPanel() {
  const [kind, setKind] = useState<AgentRunKind>('generate')
  const [skills, setSkills] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [industry, setIndustry] = useState('software')
  const [seniority, setSeniority] = useState('mid')
  const [years, setYears] = useState<string>('')
  const [jd, setJd] = useState('')
  const [instructions, setInstructions] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const { run, running, steps, tools, stream, ats, usage, error, engine, model, autoApply, setAutoApply, cancel, reset, durationMs } =
    useAgent()
  const config = useAuth((s) => s.config)
  const configured = config?.agent.configured ?? false
  const models = config?.agent.models ?? []

  const activeKind = useMemo(() => KINDS.find((k) => k.id === kind)!, [kind])

  const start = async () => {
    reset()
    await run({
      kind,
      skills,
      targetRole,
      industry,
      seniority,
      jobDescription: jd,
      yearsExperience: years ? Number(years) : undefined,
      instructions,
    })
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* header */}
      <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-aurora-500/12 via-transparent to-fuchsia-500/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-aurora-500 to-fuchsia-500">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Arbor agent</p>
              <p className="text-[11px] text-slate-400">
                {configured ? (
                  <>
                    OpenRouter · <span className="text-aurora-300">{model || config?.agent.defaultModel}</span>
                  </>
                ) : (
                  <>
                    Offline Nova engine · <span className="text-emerald-300">add an OpenRouter key for LLM mode</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <Badge tone={running ? 'info' : 'success'}>
            {running ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> running
              </>
            ) : (
              <>ready</>
            )}
          </Badge>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">{activeKind.hint}</p>
      </div>

      <Tabs
        tabs={KINDS.map((k) => ({ id: k.id, label: k.label, icon: k.icon }))}
        value={kind}
        onChange={(id) => setKind(id)}
      />

      {/* inputs */}
      <div className="space-y-3">
        {(kind === 'generate' || kind === 'tailor') && (
          <div>
            <Label>Your skills, tools and experience (paste anything — comma, bullet or prose)</Label>
            <Textarea
              rows={5}
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder={'React, TypeScript, Node.js, PostgreSQL, AWS\n5 years building SaaS products, led a team of 4, cut latency 42%'}
            />
          </div>
        )}

        {(kind === 'generate' || kind === 'tailor') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target role</Label>
              <Input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Senior Frontend Engineer"
              />
            </div>
            <div>
              <Label>Industry</Label>
              <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                {INDUSTRY_PROFILES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        {(kind === 'generate' || kind === 'tailor') && (
          <div>
            <Label>Your prompt — anything specific you want (optional)</Label>
            <Textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Keep it to one page · target the German market · highlight my team leadership"
            />
          </div>
        )}

        {kind === 'tailor' && (
          <div>
            <Label>Job description</Label>
            <Textarea
              rows={6}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job post — the agent will mirror its language and keywords."
            />
          </div>
        )}

        {kind === 'review' && (
          <div>
            <Label>What should the review focus on?</Label>
            <Textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="I'm switching from QA to backend — tell me what to cut."
            />
          </div>
        )}

        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition', showAdvanced && 'rotate-180')} /> Advanced options
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <div>
              <Label>Seniority</Label>
              <Select value={seniority} onChange={(e) => setSeniority(e.target.value)}>
                {SENIORITY_LEVELS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Years of experience</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="5"
              />
            </div>
            {kind !== 'generate' && kind !== 'tailor' && (
              <div className="col-span-2">
                <Label>Extra instructions</Label>
                <Input
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Keep it to one page, optimise for the German market"
                />
              </div>
            )}
            {configured && models.length > 0 && (
              <div className="col-span-2">
                <Label>Model</Label>
                <Select value={model || config?.agent.defaultModel} onChange={(e) => useAgent.setState({ model: e.target.value })}>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <Switch
            checked={autoApply}
            onChange={setAutoApply}
            label="Apply changes to the editor live"
            hint="Watch the resume rewrite itself as the agent works"
          />
        </div>

        <div className="flex gap-2">
          {running ? (
            <Button variant="danger" className="flex-1" onClick={cancel} icon={<Square className="h-3.5 w-3.5" />}>
              Stop
            </Button>
          ) : (
            <Button className="flex-1" onClick={start} icon={<Sparkles className="h-4 w-4" />}>
              {kind === 'generate' ? 'Generate my resume' : `Run ${activeKind.label.toLowerCase()}`}
            </Button>
          )}
        </div>
      </div>

      {/* live output */}
      {(running || steps.length > 0 || stream || error) && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/8 bg-black/30">
          <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Cpu className="h-3.5 w-3.5 text-aurora-300" /> Activity
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              {engine === 'nova-offline' && <Badge>offline engine</Badge>}
              {durationMs ? <span>{durationMs}ms</span> : null}
              {(usage.inputTokens || usage.outputTokens) > 0 && (
                <span>
                  {usage.inputTokens}↓ {usage.outputTokens}↑
                  {usage.costUsd ? ` · $${usage.costUsd.toFixed(4)}` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {steps.map((step) => (
              <div key={step.id} className="flex items-start gap-2.5">
                <span className="mt-0.5">
                  {step.state === 'done' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : step.state === 'active' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-aurora-300" />
                  ) : step.state === 'error' ? (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  ) : (
                    <CircleDashed className="h-4 w-4 text-slate-600" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200">{step.title}</p>
                  {step.detail && <p className="text-[11px] leading-relaxed text-slate-500">{step.detail}</p>}
                </div>
              </div>
            ))}

            {tools.length > 0 && (
              <div className="space-y-1.5 border-t border-white/8 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tool calls</p>
                {tools.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5">
                    <code className="text-[10.5px] text-aurora-300">{t.name}</code>
                    <span className="flex-1 truncate text-[10px] text-slate-500">
                      {t.state === 'done' ? 'done' : t.state}
                    </span>
                    {t.endedAt && t.startedAt && <span className="text-[10px] text-slate-600">{t.endedAt - t.startedAt}ms</span>}
                  </div>
                ))}
              </div>
            )}

            {stream && (
              <div className="whitespace-pre-wrap border-t border-white/8 pt-3 text-xs leading-relaxed text-slate-300">
                {stream}
                {running && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-aurora-400 align-middle" />}
              </div>
            )}

            {ats && (
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] p-3">
                <p className="text-xs font-semibold text-emerald-200">
                  ATS {ats.score}/100 · grade {ats.grade}
                </p>
                <p className="mt-1 text-[11px] text-emerald-100/70">
                  keywords {ats.breakdown.keywords} · impact {ats.breakdown.impact} · structure{' '}
                  {ats.breakdown.structure}
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-400/25 bg-rose-500/[0.07] p-3 text-xs text-rose-200">
                {error}
              </div>
            )}

            {!running && (steps.length > 0 || stream) && (
              <p className="pt-1 text-[10px] text-slate-600">Finished {timeAgo(new Date().toISOString())}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
