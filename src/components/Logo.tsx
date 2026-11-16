import { cn } from './ui'

/** Ícone da marca (recortado de design/logo) */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-block shrink-0 overflow-hidden rounded-[27%] bg-brand-deep', className)}
      style={{ width: size, height: size }}
    >
      <img src="/logo-192.png" alt="" width={size} height={size} className="h-full w-full scale-[1.03] object-cover" draggable={false} />
    </span>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display font-bold tracking-[0.04em] text-ink', className)} aria-label="ALLNOVA">
      ALLNOV<span className="text-brand">A</span>
    </span>
  )
}

export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <Wordmark className="text-[19px] leading-none" />
    </span>
  )
}
