import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Check, Info, Loader2, TriangleAlert, X, XCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useUi } from '../../store/ui'

/* ─────────────────────────────  Button  ───────────────────────────── */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'subtle'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'ghost' && 'btn-ghost',
        variant === 'outline' && 'btn-outline',
        variant === 'subtle' && 'bg-white/5 text-slate-200 hover:bg-white/10',
        variant === 'danger' && 'bg-rose-500/90 text-white hover:bg-rose-500',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'lg' && 'px-6 py-3 text-base',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

/* ─────────────────────────────  Card  ───────────────────────────── */

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card', className)} {...rest}>
      {children}
    </div>
  )
}

export function SectionHeading({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

/* ─────────────────────────────  Inputs  ───────────────────────────── */

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cn('mb-1 block text-xs font-medium text-slate-400', className)}>{children}</label>
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('field', className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('field resize-y leading-relaxed', className)} {...rest} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('field appearance-none bg-ink-900/80 pr-8', className)} {...rest}>
      {children}
    </select>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span>
        {label && <span className="block text-sm text-slate-200">{label}</span>}
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-aurora-500' : 'bg-white/12',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}

/* ─────────────────────────────  Misc  ───────────────────────────── */

export function Badge({
  children,
  tone = 'default',
  className,
  title,
}: {
  children: ReactNode
  tone?: 'default' | 'success' | 'warn' | 'danger' | 'info'
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tone === 'default' && 'border-white/12 bg-white/5 text-slate-300',
        tone === 'success' && 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
        tone === 'warn' && 'border-amber-400/30 bg-amber-400/10 text-amber-300',
        tone === 'danger' && 'border-rose-400/30 bg-rose-400/10 text-rose-300',
        tone === 'info' && 'border-indigo-400/30 bg-indigo-400/10 text-indigo-300',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Progress({ value, className, tone = 'aurora' }: { value: number; className?: string; tone?: 'aurora' | 'mint' | 'amber' | 'rose' }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/8', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-700',
          tone === 'aurora' && 'bg-gradient-to-r from-indigo-400 to-violet-400',
          tone === 'mint' && 'bg-gradient-to-r from-emerald-400 to-teal-300',
          tone === 'amber' && 'bg-gradient-to-r from-amber-400 to-orange-300',
          tone === 'rose' && 'bg-gradient-to-r from-rose-400 to-pink-400',
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin text-slate-400', className)} />
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full rounded-md', className)} />
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-14 text-center">
      <p className="text-sm font-medium text-slate-200">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ─────────────────────────────  Modal  ───────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('card relative z-10 w-full p-5', width)}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
        {footer && <div className="mt-4 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

/* ─────────────────────────────  Toaster  ───────────────────────────── */

export function Toaster() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'glass pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm shadow-xl',
            t.level === 'success' && 'border-emerald-400/30 text-emerald-100',
            t.level === 'error' && 'border-rose-400/30 text-rose-100',
            t.level === 'warn' && 'border-amber-400/30 text-amber-100',
            (t.level === 'info' || !t.level) && 'border-white/12 text-slate-100',
          )}
        >
          {t.level === 'success' && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}
          {t.level === 'error' && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />}
          {t.level === 'warn' && <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
          {t.level === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />}
          <p className="flex-1 leading-snug">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────  Tabs  ───────────────────────────── */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: T; label: string; icon?: ReactNode }[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/[0.03] p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition',
            value === tab.id ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────── hooks ─────────────────────── */

export function useOutsideClick<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onOutside])
  return ref
}
