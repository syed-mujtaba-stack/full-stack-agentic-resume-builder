import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail, Sparkles, User as UserIcon } from 'lucide-react'
import { BrandGithub as Github } from '../components/ui/BrandIcons'
import { Button, Input, Label } from '../components/ui'
import { MiniScene } from '../components/three/HeroScene'
import { useAuth } from '../store/auth'
import { useRealtime } from '../store/realtime'
import { gsap } from '../lib/gsap'
import { notify } from '../store/ui'

type Mode = 'login' | 'register'

export default function Auth({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { login, register, config } = useAuth()
  const connect = useRealtime((s) => s.connect)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!boxRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-auth]', { y: 18, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out' })
    }, boxRef)
    return () => ctx.revert()
  }, [mode])

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'register') await register(name, email, password)
      else await login(email, password)
      connect()
      notify(mode === 'register' ? 'Welcome to Arbor 🌳' : 'Welcome back', 'success')
      navigate('/dashboard')
    } catch (err) {
      const e2 = err as { message?: string; details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } }
      const fieldErrors = e2.details?.fieldErrors
      const message =
        fieldErrors?.email?.[0] ?? fieldErrors?.password?.[0] ?? fieldErrors?.name?.[0] ?? e2.message ?? 'Something went wrong'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  const demoLogin = async () => {
    setBusy(true)
    setError(null)
    try {
      await login(config?.demo.email ?? 'demo@arbor.dev', config?.demo.password ?? 'demo1234')
      connect()
      notify('Signed in as the demo user', 'success')
      navigate('/dashboard')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const oauth = (provider: 'google' | 'github') => {
    window.location.href = `/api/auth/oauth/${provider}`
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-5 py-14">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <MiniScene className="h-full w-full" />
      </div>

      <div ref={boxRef} className="w-full max-w-md">
        <div data-auth className="card p-7">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-aurora-500 to-fuchsia-500 text-2xl">
              🌳
            </span>
            <h1 className="font-display text-2xl font-bold text-white">
              {mode === 'register' ? 'Create your free account' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {mode === 'register'
                ? 'Unlimited resumes, 8 templates, the full agent. No card.'
                : 'Sign in to keep building your resume.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div data-auth>
                <Label>Full name</Label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    className="pl-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    required
                    minLength={2}
                  />
                </div>
              </div>
            )}

            <div data-auth>
              <Label>Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  className="pl-9"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div data-auth>
              <Label>Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  className="pl-9"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}

            <div data-auth>
              <Button type="submit" className="w-full" loading={busy} icon={<Sparkles className="h-4 w-4" />}>
                {mode === 'register' ? 'Create account' : 'Sign in'}
              </Button>
            </div>
          </form>

          {mode === 'login' && (
            <div data-auth className="mt-3">
              <Button variant="outline" className="w-full" onClick={demoLogin} disabled={busy} icon={<Loader2 className={busy ? 'h-4 w-4 animate-spin' : 'hidden'} />}>
                Use the demo account (demo@arbor.dev)
              </Button>
            </div>
          )}

          {config?.oauth?.length ? (
            <>
              <div data-auth className="my-5 flex items-center gap-3 text-[11px] text-slate-500">
                <span className="h-px flex-1 bg-white/10" /> or continue with <span className="h-px flex-1 bg-white/10" />
              </div>
              <div data-auth className="grid gap-2">
                {config.oauth.includes('google') && (
                  <Button variant="ghost" onClick={() => oauth('google')} icon={<Mail className="h-4 w-4" />}>
                    Google
                  </Button>
                )}
                {config.oauth.includes('github') && (
                  <Button variant="ghost" onClick={() => oauth('github')} icon={<Github className="h-4 w-4" />}>
                    GitHub
                  </Button>
                )}
              </div>
            </>
          ) : null}

          <p data-auth className="mt-6 text-center text-sm text-slate-400">
            {mode === 'register' ? (
              <>
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-aurora-300 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to Arbor?{' '}
                <Link to="/register" className="font-medium text-aurora-300 hover:underline">
                  Create a free account
                </Link>
                {' · '}
                <Link to="/forgot-password" className="text-slate-500 hover:underline">
                  Forgot password?
                </Link>
              </>
            )}
          </p>
        </div>

        <p data-auth className="mt-4 text-center text-[11px] text-slate-600">
          Self-hosted · your data stays in your own Postgres database
        </p>
      </div>
    </div>
  )
}
