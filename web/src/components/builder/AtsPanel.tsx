import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, Lightbulb, ScanSearch, Target, XCircle } from 'lucide-react'
import type { AtsReport } from '@arbor/shared'
import { Badge, Button, Progress, Textarea } from '../ui'
import { useBuilder } from '../../store/builder'
import { notify } from '../../store/ui'
import { cn } from '../../lib/utils'

function Ring({ score, grade }: { score: number; grade: string }) {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 85 ? '#34d399' : score >= 70 ? '#60a5fa' : score >= 55 ? '#fbbf24' : '#fb7185'
  return (
    <div className="relative grid h-32 w-32 place-items-center">
      <svg viewBox="0 0 112 112" className="h-32 w-32 -rotate-90">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-3xl font-bold text-white">{score}</div>
        <div className="text-[11px] font-semibold tracking-widest" style={{ color }}>
          GRADE {grade}
        </div>
      </div>
    </div>
  )
}

export function AtsPanel() {
  const { ats, score, jobTarget, setJobTarget } = useBuilder()
  const [jd, setJd] = useState(jobTarget?.jobDescription ?? '')
  const [scanning, setScanning] = useState(false)

  const report = ats as AtsReport | null

  const breakdown = useMemo(
    () =>
      report
        ? [
            { label: 'Keywords', value: report.breakdown.keywords, tone: 'aurora' as const },
            { label: 'Impact', value: report.breakdown.impact, tone: 'mint' as const },
            { label: 'Structure', value: report.breakdown.structure, tone: 'amber' as const },
            { label: 'Readability', value: report.breakdown.readability, tone: 'rose' as const },
            { label: 'Completeness', value: report.breakdown.completeness, tone: 'aurora' as const },
          ]
        : [],
    [report],
  )

  const runScan = async (withJd: boolean) => {
    setScanning(true)
    try {
      await score(withJd ? jd : undefined)
      if (withJd && jd.trim()) {
        setJobTarget({ jobDescription: jd })
      }
      notify('ATS scan complete', 'success')
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.06] to-transparent p-5">
        <Ring score={report?.score ?? 0} grade={report?.grade ?? '—'} />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-200">
            {!report
              ? 'Run your first scan'
              : report.score >= 85
                ? 'Excellent — ready to send'
                : report.score >= 70
                  ? 'Strong, a few tweaks away'
                  : report.score >= 55
                    ? 'Needs work on impact and keywords'
                    : 'Recruiters will skip this — let the agent fix it'}
          </p>
          {report && (
            <p className="mt-1 text-xs text-slate-500">
              {report.wordCount} words · ~{report.estimatedPages} page{report.estimatedPages > 1 ? 's' : ''} ·{' '}
              {report.tailored ? 'scored against your job post' : 'general scan (no job post)'}
            </p>
          )}
        </div>
        <div className="flex w-full gap-2">
          <Button size="sm" className="flex-1" loading={scanning} onClick={() => runScan(false)} icon={<ScanSearch className="h-3.5 w-3.5" />}>
            {report ? 'Re-scan' : 'Scan resume'}
          </Button>
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Job description</p>
        <Textarea
          rows={5}
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the job post here to score against the exact keywords the employer uses…"
        />
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full"
          loading={scanning}
          onClick={() => runScan(true)}
          icon={<Target className="h-3.5 w-3.5" />}
          disabled={!jd.trim()}
        >
          Tailor & scan
        </Button>
      </section>

      {report && (
        <>
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Score breakdown</p>
            <div className="space-y-2.5">
              {breakdown.map((b) => (
                <div key={b.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{b.label}</span>
                    <span className="tabular-nums text-slate-300">{b.value}</span>
                  </div>
                  <Progress value={b.value} tone={b.tone} />
                </div>
              ))}
            </div>
          </section>

          {report.matchedKeywords.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Keywords you match ({report.matchedKeywords.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {report.matchedKeywords.slice(0, 22).map((k) => (
                  <Badge key={k} tone="success">
                    <CheckCircle2 className="h-3 w-3" /> {k}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {report.missingKeywords.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Missing keywords ({report.missingKeywords.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {report.missingKeywords.slice(0, 22).map((k) => (
                  <Badge key={k} tone="warn">
                    {k}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Only add these where they are genuinely true — never keyword-stuff.
              </p>
            </section>
          )}

          {report.issues.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Issues</p>
              <div className="space-y-2">
                {report.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={cn(
                      'rounded-xl border p-3',
                      issue.severity === 'critical' && 'border-rose-400/25 bg-rose-500/[0.07]',
                      issue.severity === 'warning' && 'border-amber-400/25 bg-amber-500/[0.07]',
                      issue.severity === 'tip' && 'border-white/8 bg-white/[0.02]',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {issue.severity === 'critical' ? (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                      ) : issue.severity === 'warning' ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      ) : (
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-100">{issue.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{issue.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {report.suggestions.length > 0 && (
            <section>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Lightbulb className="h-3.5 w-3.5" /> Next best actions
              </p>
              <ul className="space-y-1.5">
                {report.suggestions.slice(0, 8).map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                    <span className="text-aurora-400">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
