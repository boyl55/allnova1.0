const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const BRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const COMPACT = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const NUM = new Intl.NumberFormat('pt-BR')

/** R$ 1.234,56 */
export const brl = (n: number) => BRL.format(n || 0)
/** R$ 1.235 */
export const brl0 = (n: number) => BRL0.format(Math.round(n || 0))
/** Eixos de gráficos: 0 · 500 · 10 mil */
export const compact = (n: number) => (Math.abs(n) < 10000 ? NUM.format(Math.round(n)) : COMPACT.format(n))
/** Um só estilo por eixo: compacto (10 mil) se o eixo chega a 10.000, por extenso abaixo disso */
export const axisFormatter = (max: number) => (n: number) =>
  max >= 10000 ? (n === 0 ? '0' : COMPACT.format(n)) : NUM.format(Math.round(n))
export const num = (n: number) => NUM.format(Math.round(n || 0))
export const pct = (n: number, digits = 0) =>
  `${(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`
export const signedPct = (n: number, digits = 1) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('pt-BR', { maximumFractionDigits: digits })}%`
export const code = (n: number) => `#${String(n).padStart(4, '0')}`

export const uid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? ''

export const onlyDigits = (s: string) => s.replace(/\D/g, '')

/** Link do WhatsApp com mensagem pronta. Telefone opcional (assume Brasil quando sem DDI). */
export const whatsappLink = (text: string, phone?: string) => {
  const digits = phone ? onlyDigits(phone) : ''
  const full = digits ? (digits.length <= 11 ? `55${digits}` : digits) : ''
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const plural = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`
