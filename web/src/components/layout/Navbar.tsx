import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Menu, Settings, Sparkles, User, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../store/auth'
import { useRealtime } from '../../store/realtime'
import { Button } from '../ui'

const links = [
  { to: '/templates', label: 'Templates' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/docs', label: 'How it works' },
]

export function Navbar() {
  const { user, status, logout } = useAuth()
  const online = useRealtime((s) => s.online)
  const connected = useRealtime((s) => s.state === 'open')
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setOpen(false)
    setMenu(false)
  }, [location.pathname])

  return (
    <header className="no-print sticky top-0 z-40 border-b border-white/8 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-aurora-500 to-fuchsia-500 text-lg shadow-glow">
            🌳
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">Arbor</span>
          <span className="hidden rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 sm:inline">
            OSS
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-white/8 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {connected && (
            <span
              className="hidden items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300 lg:inline-flex"
              title="Realtime socket connected"
            >
              <span className="h-1.5 w-1.5 animate-pulse-ring rounded-full bg-emerald-400" />
              {online} online
            </span>
          )}

          {status === 'authenticated' && user ? (
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3 text-sm text-slate-200 hover:bg-white/10"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-aurora-500 to-cyan-500 text-xs font-bold text-white">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">{user.name}</span>
              </button>
              {menu && (
                <div className="card absolute right-0 mt-2 w-56 overflow-hidden p-1.5">
                  <div className="border-b border-white/8 px-3 py-2">
                    <p className="truncate text-sm font-medium text-white">{user.name}</p>
                    <p className="truncate text-xs text-slate-400">{user.email}</p>
                    <p className="mt-1 text-[11px] text-aurora-300">Free plan · unlimited resumes</p>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/8"
                  >
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/settings')}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/8"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </button>
                  <button
                    onClick={async () => {
                      await logout()
                      navigate('/')
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" /> Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">
                  <Sparkles className="h-4 w-4" /> Start free
                </Button>
              </Link>
            </div>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/8 bg-ink-950/95 px-5 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
                {l.label}
              </NavLink>
            ))}
            {status !== 'authenticated' && (
              <>
                <Link to="/login" className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
                  Sign in
                </Link>
                <Link to="/register" className="rounded-lg px-3 py-2 text-sm text-aurora-300 hover:bg-white/5">
                  Start free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
