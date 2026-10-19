import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { Button, Input, Label } from '../components/ui'
import { useAuth } from '../store/auth'
import { notify } from '../store/ui'

export default function ForgotPassword() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [devToken, setDevToken] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await forgotPassword(email)
      setSent(true)
      setDevToken(res.devResetToken ?? null)
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-5 py-20">
      <div className="card p-7">
        <h1 className="font-display text-2xl font-bold text-white">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-400">
          We'll email you a reset link. In development the link is also printed to the API console.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] p-4 text-sm text-emerald-100">
            If an account exists for <b>{email}</b>, a reset link is on its way.
            {devToken && (
              <div className="mt-3">
                <p className="text-xs text-emerald-200/80">Dev reset token:</p>
                <code className="mt-1 block break-all rounded bg-black/40 p-2 text-[11px]">{devToken}</code>
                <Link
                  to={`/reset-password?token=${devToken}`}
                  className="mt-2 inline-block text-xs text-aurora-300 underline"
                >
                  Open the reset page
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label>Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  className="pl-9"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" loading={busy}>
              Send reset link
            </Button>
          </form>
        )}

        <Link to="/login" className="mt-5 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </div>
    </div>
  )
}
