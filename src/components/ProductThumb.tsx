import type { Product } from '../types'
import { normalize } from '../lib/format'
import { cn } from './ui'

type Kind = 'tee' | 'polo' | 'shirt' | 'shorts' | 'pants' | 'jacket' | 'other'

const kindOf = (text: string): Kind => {
  const t = normalize(text)
  if (/polo/.test(t)) return 'polo'
  if (/short|bermuda/.test(t)) return 'shorts'
  if (/jaquet|moletom|casaco|blusa|corta-vento/.test(t)) return 'jacket'
  if (/calca|jeans|jogger/.test(t)) return 'pants'
  if (/camiseta|regata|t-shirt/.test(t)) return 'tee'
  if (/camisa/.test(t)) return 'shirt'
  return 'other'
}

const TEE = 'M70 42 L50 50 L22 74 L40 100 L58 88 L58 166 L142 166 L142 88 L160 100 L178 74 L150 50 L130 42 Q100 64 70 42 Z'
const SHAPES: Record<Kind, string[]> = {
  tee: [TEE],
  polo: [TEE, 'M70 42 L100 72 L130 42 M100 72 L100 104'],
  shirt: [TEE, 'M70 42 L100 66 L130 42 M100 66 L100 166'],
  jacket: [
    'M68 38 L48 46 L26 132 L48 140 L60 94 L60 168 L140 168 L140 94 L152 140 L174 132 L152 46 L132 38 Q100 58 68 38 Z',
    'M100 50 L100 168',
  ],
  shorts: ['M54 52 L146 52 L160 136 L108 136 L100 90 L92 136 L40 136 Z', 'M54 66 L146 66'],
  pants: ['M62 28 L138 28 L150 176 L112 176 L100 78 L88 176 L50 176 Z', 'M62 42 L138 42'],
  other: ['M64 64 L136 64 L148 164 L52 164 Z', 'M80 64 Q80 36 100 36 Q120 36 120 64'],
}

// pares de tons suaves para o fundo das prévias
const TINTS: [string, string][] = [
  ['#ece4fb', '#cdb8f5'], ['#fde8dc', '#f7c2a4'], ['#dff3ea', '#aee0c9'], ['#fdf0cf', '#f5d68a'],
  ['#fbe1ea', '#f2b3c9'], ['#e0ecfb', '#b1cdf3'], ['#eae8e4', '#cfcac2'],
]

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Foto do produto ou, na falta dela, uma prévia ilustrada conforme o tipo de peça */
export function ProductThumb({
  product, categoryName = '', className, photoIndex = 0,
}: { product: Pick<Product, 'id' | 'name' | 'photos'>; categoryName?: string; className?: string; photoIndex?: number }) {
  const photo = product.photos[photoIndex] ?? product.photos[0]
  if (photo) {
    return <img src={photo} alt={product.name} loading="lazy" className={cn('bg-surface-2 object-cover', className)} />
  }
  const kind = kindOf(`${product.name} ${categoryName}`)
  const [a, b] = TINTS[hash(product.id + product.name) % TINTS.length]
  const gid = `g${hash(product.id)}`
  const [body, ...details] = SHAPES[kind]
  return (
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" className={cn('block', className)} role="img" aria-label={`${product.name} (sem foto)`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${gid})`} />
      <g transform="translate(100 100) scale(0.68) translate(-100 -100)">
        <path d={body} fill="#ffffff" fillOpacity="0.92" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
        {details.map((d) => (
          <path key={d} d={d} fill="none" stroke={b} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
    </svg>
  )
}
