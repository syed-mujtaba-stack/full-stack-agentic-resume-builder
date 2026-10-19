import { useEffect, useState } from 'react'
import { Download, KeyRound, Laptop, LogOut, ShieldCheck, Trash2, UserCog } from 'lucide-react'
import { api } from '../lib/api'
import type { SessionInfo } from '@arbor/shared'
import { Badge, Button, Card, Input, Label, Modal, SectionHeading } from '../components/ui'
import { useAuth } from '../store/auth'
import { notify } from '../store/ui'
import { download, slugifyFilename, timeAgo } from '../lib/utils'

export default function Settings() {
  const { user, updateProfile, changePassword, sessions, fetchSessions, revokeSession, logoutAll, config } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    void fetchSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveProfile = async () => {
    try {
      await updateProfile({ name })
      notify('Profile updated', 'success')
    } catch (err) {
      notify((err as Error).message, 'error')
    }
  }

  const submitPassword = async () => {
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      notify('Password changed — please sign in again', 'success')
    } catch (err) {
      const e = err as { details?: { fieldErrors?: Record<string, string[]> }; message?: string }
      notify(e.details?.fieldErrors?.currentPassword?.[0] ?? e.message ?? 'Could not change password', 'error')
    }
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const res = await api.get<{ resumes: unknown[] }>('/resumes')
      download(`${slugifyFilename(user?.name ?? 'arbor')}-resumes.json`, JSON.stringify(res, null, 2))
      notify('Exported all resumes', 'success')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight text-white">Settings</h1>
      <p className="mt-1 text-sm text-slate-400">Account, security, sessions and agent configuration.</p>

      <div className="mt-8 space-y-5">
        <Card className="p-5">
          <SectionHeading
            title="Profile"
            hint="This name appears in the app and on shared resume links."
            action={
              <Button size="sm" onClick={saveProfile} icon={<UserCog className="h-3.5 w-3.5" />}>
                Save
              </Button>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email ?? ''} disabled className="opacity-60" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Badge tone="success">
              <ShieldCheck className="h-3 w-3" /> {user?.emailVerified ? 'Email verified' : 'Email unverified'}
            </Badge>
            <Badge>plan: {user?.plan}</Badge>
            <span>member since {user ? timeAgo(user.createdAt) : '—'}</span>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading title="Password" hint="Changing your password signs out every other device." />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Current password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <Label>New password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                disabled={!currentPassword || newPassword.length < 8}
                onClick={submitPassword}
                icon={<KeyRound className="h-3.5 w-3.5" />}
              >
                Update password
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading
            title="Active sessions"
            hint="Every sign-in gets its own refresh token. Revoke anything you do not recognise."
            action={
              <Button size="sm" variant="ghost" onClick={logoutAll} icon={<LogOut className="h-3.5 w-3.5" />}>
                Sign out everywhere
              </Button>
            }
          />
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} onRevoke={() => revokeSession(s.id)} />
            ))}
            {sessions.length === 0 && <p className="text-xs text-slate-500">No active sessions.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading title="AI agent" hint="The agent runs locally by default — no key, no cost, no data leaving the box." />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-xs text-slate-500">Engine in use</p>
              <p className="mt-1 text-sm font-medium text-white">
                {config?.agent.configured ? 'OpenRouter LLM agent' : 'Nova offline engine'}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                {config?.agent.configured
                  ? `Model: ${config.agent.defaultModel}. Tool calling enabled — the agent can rewrite sections, run the ATS scorer and iterate.`
                  : 'Deterministic heuristics: industry detection, keyword mirroring, bullet rewriting, skill grouping and ATS scoring. Add OPENROUTER_API_KEY to the server .env to upgrade.'}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-xs text-slate-500">Daily limits</p>
              <p className="mt-1 text-sm font-medium text-white">
                {config?.limits.agentRunsPerDay ?? 100} agent runs · {config?.limits.resumes ?? 200} resumes
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Free-tier guardrails only. Self-hosted deployments can raise or remove them in the environment file.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading
            title="Your data"
            hint="Export everything as JSON any time — no lock-in."
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" loading={exporting} onClick={exportData} icon={<Download className="h-3.5 w-3.5" />}>
                  Export JSON
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-300 hover:bg-rose-500/10"
                  onClick={() => setConfirmOpen(true)}
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                >
                  Delete account
                </Button>
              </div>
            }
          />
          <p className="text-xs text-slate-500">
            Deleting your account removes every resume, version and agent run associated with it. This cannot be undone.
          </p>
        </Card>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete your account?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => notify('Account deletion is disabled in this demo', 'warn')}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          This is a self-hosted demo build, so destructive account deletion is disabled. In your own deployment this
          endpoint removes the user row and cascades to resumes, versions, sessions and agent runs.
        </p>
      </Modal>
    </div>
  )
}

function SessionRow({ session, onRevoke }: { session: SessionInfo; onRevoke: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
      <Laptop className="h-4 w-4 shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-slate-300">{session.userAgent ?? 'Unknown device'}</p>
        <p className="text-[11px] text-slate-500">
          {session.ip ?? 'unknown ip'} · last used {timeAgo(session.lastUsedAt)}
        </p>
      </div>
      {session.current ? (
        <Badge tone="success">this device</Badge>
      ) : (
        <Button size="sm" variant="ghost" onClick={onRevoke}>
          Revoke
        </Button>
      )}
    </div>
  )
}
