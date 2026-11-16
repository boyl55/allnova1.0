import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from './ui'

/**
 * Cartão "pasta": um fundo colorido (malha de cores ou imagens) fica atrás e um painel de vidro fosco,
 * com uma aba no canto superior esquerdo, cobre quase tudo. O fundo aparece na aba e, desfocado, através do vidro.
 */

export type FolderTone = 'brand' | 'sunset' | 'ocean' | 'mint' | 'amber'

const MESH: Record<FolderTone, string> = {
  brand:
    'radial-gradient(60% 90% at 12% 10%, #7c3aed 0%, transparent 70%), radial-gradient(55% 80% at 88% 20%, #ff7a45 0%, transparent 70%), radial-gradient(60% 80% at 60% 100%, #3b82f6 0%, transparent 70%), #2b1657',
  sunset:
    'radial-gradient(60% 90% at 10% 15%, #ff5f45 0%, transparent 70%), radial-gradient(55% 80% at 90% 10%, #3a4a6b 0%, transparent 70%), radial-gradient(60% 90% at 70% 100%, #ffb36b 0%, transparent 70%), #7a2a1f',
  ocean:
    'radial-gradient(60% 90% at 10% 10%, #38bdf8 0%, transparent 70%), radial-gradient(55% 80% at 90% 15%, #7c3aed 0%, transparent 70%), radial-gradient(60% 90% at 60% 100%, #14b8a6 0%, transparent 70%), #12335b',
  mint:
    'radial-gradient(60% 90% at 10% 10%, #34d399 0%, transparent 70%), radial-gradient(55% 80% at 90% 15%, #22d3ee 0%, transparent 70%), radial-gradient(60% 90% at 60% 100%, #a3e635 0%, transparent 70%), #0f4a3a',
  amber:
    'radial-gradient(60% 90% at 10% 10%, #fbbf24 0%, transparent 70%), radial-gradient(55% 80% at 90% 15%, #f97316 0%, transparent 70%), radial-gradient(60% 90% at 60% 100%, #ef4444 0%, transparent 70%), #7a3b0a',
}

/** Caminho da silhueta de pasta para uma caixa w × h, com aba de altura `tab` ocupando `tabShare` da largura */
function folderPath(w: number, h: number, tab: number, tabShare: number, r: number) {
  const c = Math.min(18, tab * 0.7)
  const tabW = Math.max(r + 24, Math.min(w * tabShare, w - r - c * 2 - 12))
  return [
    `M 0 ${r}`,
    `Q 0 0 ${r} 0`,
    `H ${tabW}`,
    `C ${tabW + c} 0 ${tabW + c} ${tab} ${tabW + c * 2} ${tab}`,
    `H ${w - r}`,
    `Q ${w} ${tab} ${w} ${tab + r}`,
    `V ${h - r}`,
    `Q ${w} ${h} ${w - r} ${h}`,
    `H ${r}`,
    `Q 0 ${h} 0 ${h - r}`,
    'Z',
  ].join(' ')
}

export function Folder({
  tone = 'brand', backdrop, tab = 30, tabShare = 0.5, radius = 26, className, bodyClassName, children,
}: {
  tone?: FolderTone
  /** Substitui a malha de cores (ex.: fotos dos produtos) */
  backdrop?: ReactNode
  tab?: number
  tabShare?: number
  radius?: number
  className?: string
  /** Classes do conteúdo (dentro do painel de vidro) */
  bodyClassName?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // medida fracionária: com inteiros, sobra um fio de 1px na borda em larguras como 366,4px
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const d = size.w ? folderPath(size.w, size.h, tab, tabShare, radius) : undefined

  const rim = useId().replace(/[^a-zA-Z0-9]/g, '')

  return (
    // a sombra fica no invólucro: dentro do recorte ela seria cortada junto com a forma da pasta
    <div
      className={cn('print-flat min-w-0', className)}
      style={{ borderRadius: radius, boxShadow: '0 14px 34px -14px rgb(15 23 42 / 0.45)' }}
    >
      <div className="relative isolate h-full overflow-hidden" style={{ borderRadius: radius }}>
        {/* fundo: aparece na aba e, desfocado, através do vidro */}
        <div className="absolute inset-0 -z-10" style={backdrop ? undefined : { background: MESH[tone] }} aria-hidden>
          {backdrop}
        </div>

        <div
          ref={ref}
          className="folder-glass relative h-full"
          style={d ? { clipPath: `path('${d}')`, WebkitClipPath: `path('${d}')` } : undefined}
        >
          <div className={cn('relative', bodyClassName)} style={{ paddingTop: tab + 16 }}>
            {children}
          </div>
        </div>

        {/* fio de luz ao longo da silhueta: forte no topo, sumindo embaixo */}
        {d && (
          <svg className="pointer-events-none absolute inset-0" width={size.w} height={size.h} aria-hidden>
            <defs>
              <linearGradient id={rim} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
                <stop offset="45%" stopColor="#fff" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0.14" />
              </linearGradient>
            </defs>
            <path d={d} fill="none" stroke={`url(#${rim})`} strokeWidth="1.2" />
          </svg>
        )}
      </div>
    </div>
  )
}
