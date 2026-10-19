import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { Button, Input, Label } from '../components/ui'
import { useAuth } from '../store/auth'
import { notify } from '../store/ui'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await resetPassword(token, password)
      notify('Password updated — sign in with your new password', 'success')
      navigate('/login')
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-5 py-20">
      <div className="card p-7">
        <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-aurora-500 to-fuchsia-500 text-white">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="font-display text-2xl font-bold text-white">Choose a new password</h1>
        <p className="mt-1 text-sm text-slate-400">At least 8 characters, with a letter and a number.</p>

        {!token ? (
          <p className="mt-6 rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-200">
            This link is missing its token. Request a fresh one from the{' '}
            <Link to="/forgot-password" className="underline">
              password reset page
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label>New password</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" loading={busy}>
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
