import {
  useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import clsx, { type ClassValue } from 'clsx'
import {
  ArrowDownRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Minus, Search, Sparkles, X,
} from 'lucide-react'
import { initials, signedPct } from '../lib/format'
import { useUI } from '../store/ui'

export const cn = (...v: ClassValue[]) => clsx(v)

/* ───────── Superfícies ───────── */

/** `raised`: acabamento em relevo (tecla) para os cartões de maior importância da seção */
export function Card({ className, children, raised, ...rest }: HTMLAttributes<HTMLDivElement> & { raised?: boolean }) {
  return (
    <div className={cn('print-flat min-w-0 rounded-3xl p-5', raised ? 'raised' : 'bg-surface shadow-card', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHead({
  icon, title, subtitle, right, className,
}: { icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">{icon}</span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold leading-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

/* ───────── Botões ───────── */

type Variant = 'primary' | 'brand' | 'soft' | 'outline' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-surface hover:opacity-90',
  brand: 'bg-brand text-white hover:bg-brand-strong',
  soft: 'bg-surface-2 text-ink hover:bg-surface-3',
  outline: 'border border-line bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-bad-soft text-bad-ink hover:brightness-95',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  icon?: ReactNode
  full?: boolean
}

export function Button({ variant = 'primary', size = 'md', icon, full, className, children, type, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition disabled:opacity-45',
        size === 'sm' ? 'h-9 px-3.5 text-[13px]' : 'h-11 px-5 text-sm',
        full && 'w-full',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: Variant
  size?: 'sm' | 'md'
}

export function IconButton({ label, variant = 'soft', size = 'md', className, children, type, ...rest }: IconButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-grid shrink-0 place-items-center rounded-full transition disabled:opacity-45',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Chip({ active, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition',
        active ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-ink-2 hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ───────── Indicadores ───────── */

type Tone = 'neutral' | 'brand' | 'good' | 'warn' | 'bad'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  brand: 'bg-brand-soft text-brand-ink',
  good: 'bg-good-soft text-good-ink',
  warn: 'bg-warn-soft text-warn-ink',
  bad: 'bg-bad-soft text-bad-ink',
}

export function Badge({ tone = 'neutral', icon, className, children }: { tone?: Tone; icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', TONES[tone], className)}>
      {icon}
      {children}
    </span>
  )
}

export function Delta({ value, goodWhenUp = true, className }: { value: number | null; goodWhenUp?: boolean; className?: string }) {
  if (value === null || !Number.isFinite(value)) return null
  const flat = Math.abs(value) < 0.05
  const up = value > 0
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold',
        flat ? 'text-ink-3' : up === goodWhenUp ? 'text-good-ink' : 'text-bad-ink',
        className,
      )}
    >
      <Icon size={14} strokeWidth={2.4} aria-hidden />
      {signedPct(value)}
    </span>
  )
}

export function StatTile({
  label, value, unit, delta, goodWhenUp, hint, icon, viz, featured, className,
}: {
  label: string; value: ReactNode; unit?: string; delta?: number | null; goodWhenUp?: boolean; hint?: ReactNode
  icon?: ReactNode; className?: string
  /** Mini gráfico no rodapé do cartão (barrinhas, medidor…), como nos KPIs de dash2.png */
  viz?: ReactNode
  /** Indicador principal da seção: ganha o relevo de tecla */
  featured?: boolean
}) {
  return (
    <Card raised={featured} className={cn('flex flex-col justify-between gap-4', viz ? 'min-h-[196px]' : 'min-h-[128px]', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          {featured ? (
            <span className="key-tile h-8 w-8 text-brand"><Sparkles size={15} aria-hidden /></span>
          ) : viz ? <Sparkles size={13} className="text-brand" aria-hidden /> : null}
          {label}
        </span>
        {icon && <span className="text-ink-3">{icon}</span>}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="whitespace-nowrap text-[26px] font-semibold leading-none tracking-tight text-ink xl:text-[30px]">{value}</span>
          {unit && <span className="truncate text-xs text-ink-3">{unit}</span>}
        </div>
        {(hint || (delta !== undefined && delta !== null)) && (
          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-ink-3">
            {delta !== undefined && <Delta value={delta} goodWhenUp={goodWhenUp} />}
            {hint && <span className="truncate">{hint}</span>}
          </div>
        )}
      </div>
      {viz && <div>{viz}</div>}
    </Card>
  )
}

export function Progress({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'good' | 'warn' | 'bad'; className?: string }) {
  const fill = { brand: 'bg-brand', good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' }[tone]
  const track = { brand: 'bg-brand-soft', good: 'bg-good-soft', warn: 'bg-warn-soft', bad: 'bg-bad-soft' }[tone]
  const v = Math.max(0, Math.min(100, value || 0))
  return (
    <div
      className={cn('h-2 overflow-hidden rounded-full', track, className)}
      role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', fill)} style={{ width: `${v}%` }} />
    </div>
  )
}

export function Avatar({ name, color = 'var(--brand)', size = 40 }: { name: string; color?: string; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {initials(name) || '?'}
    </span>
  )
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand-ink">{icon}</span>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-2">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ───────── Controles ───────── */

export function Segmented<T extends string>({
  options, value, onChange, className, label,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string; label?: string }) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex max-w-full rounded-full bg-surface-3 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition',
            o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function PeriodNav({ label, onPrev, onNext, canNext }: { label: string; onPrev: () => void; onNext: () => void; canNext: boolean }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-surface p-1 shadow-card">
      <IconButton label="Período anterior" variant="ghost" size="sm" onClick={onPrev}>
        <ChevronLeft size={18} />
      </IconButton>
      <span className="min-w-[8.5rem] px-1 text-center text-[13px] font-semibold text-ink first-letter:uppercase">{label}</span>
      <IconButton label="Próximo período" variant="ghost" size="sm" onClick={onNext} disabled={!canNext}>
        <ChevronRight size={18} />
      </IconButton>
    </div>
  )
}

const FIELD =
  'w-full rounded-xl border border-line bg-surface px-3.5 text-base text-ink placeholder:text-ink-3 transition focus:border-brand focus:ring-2 focus:ring-brand/20 sm:text-sm'

export function Field({ label, hint, className, children }: { label: string; hint?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, 'h-11', className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, 'min-h-[88px] resize-y py-2.5', className)} {...rest} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cn('relative block', className)}>
      <select className={cn(FIELD, 'h-11 appearance-none pr-9')} {...rest}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
    </span>
  )
}

const parseNum = (t: string) => {
  const clean = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = parseFloat(clean)
  return Number.isFinite(n) ? n : 0
}
const showNum = (n: number) => (n ? String(n).replace('.', ',') : '')

/** Campo numérico que aceita vírgula decimal (padrão brasileiro) */
export function NumInput({
  value, onChange, prefix, suffix, className, integer, ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'prefix'> & {
  value: number; onChange: (n: number) => void; prefix?: string; suffix?: string; integer?: boolean
}) {
  const [text, setText] = useState(showNum(value))
  const last = useRef(value)
  useEffect(() => {
    if (value !== last.current) {
      last.current = value
      setText(showNum(value))
    }
  }, [value])
  return (
    <span className="relative block">
      {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-3">{prefix}</span>}
      <input
        inputMode={integer ? 'numeric' : 'decimal'}
        className={cn(FIELD, 'h-11', prefix && 'pl-10', suffix && 'pr-10', className)}
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(integer ? /[^\d]/g : /[^\d.,]/g, '')
          setText(t)
          const n = parseNum(t)
          last.current = n
          onChange(n)
        }}
        {...rest}
      />
      {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-3">{suffix}</span>}
    </span>
  )
}

export function SearchInput({
  value, onChange, placeholder = 'Buscar', className, ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & { value: string; onChange: (v: string) => void }) {
  return (
    <span className={cn('relative block', className)}>
      <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-transparent bg-surface pl-11 pr-4 text-base text-ink shadow-card placeholder:text-ink-3 focus:border-brand focus:ring-2 focus:ring-brand/20 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        {...rest}
      />
    </span>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-4 py-1">
      <span className="text-sm text-ink">{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-surface-3')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  )
}

/* ───────── Modal ───────── */

let openModals = 0

export function Modal({
  open, onClose, title, subtitle, children, footer, size = 'md',
}: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    openModals++
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      openModals--
      if (openModals === 0) document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' }[size]
  return createPortal(
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[94dvh] w-full animate-rise flex-col rounded-t-[28px] bg-surface shadow-2xl sm:max-h-[90dvh] sm:rounded-[28px]',
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-1 text-[13px] text-ink-2">{subtitle}</p>}
          </div>
          <IconButton label="Fechar" onClick={onClose} size="sm">
            <X size={16} />
          </IconButton>
        </header>
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
        {footer && (
          <footer className="safe-bottom flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 pt-4 sm:px-6 sm:pb-5">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

/* ───────── Avisos globais ───────── */

export function Toasts() {
  const toasts = useUI((s) => s.toasts)
  if (!toasts.length) return null
  return createPortal(
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex animate-rise items-center gap-2 rounded-full bg-ink py-2.5 pl-3 pr-4 text-[13px] font-medium text-surface shadow-xl">
          <span className={cn('grid h-5 w-5 place-items-center rounded-full', t.tone === 'bad' ? 'bg-bad text-white' : 'bg-brand text-white')}>
            {t.tone === 'bad' ? <CircleAlert size={13} /> : <Check size={13} strokeWidth={3} />}
          </span>
          {t.text}
        </div>
      ))}
    </div>,
    document.body,
  )
}

export function ConfirmHost() {
  const confirm = useUI((s) => s.confirm)
  const close = useUI((s) => s.closeConfirm)
  return (
    <Modal
      open={Boolean(confirm)}
      onClose={close}
      title={confirm?.title ?? ''}
      size="sm"
      footer={
        <>
          <Button variant="soft" onClick={close}>Cancelar</Button>
          <Button
            variant={confirm?.danger ? 'danger' : 'primary'}
            onClick={() => {
              confirm?.onConfirm()
              close()
            }}
          >
            {confirm?.confirmLabel ?? 'Confirmar'}
          </Button>
        </>
      }
    >
      {confirm?.text && <p className="text-sm text-ink-2">{confirm.text}</p>}
    </Modal>
  )
}

export const TH = 'whitespace-nowrap pb-2.5 text-left text-xs font-medium text-ink-3'
export const TD = 'border-t border-line py-3 pr-3 align-middle text-[13px] text-ink'
