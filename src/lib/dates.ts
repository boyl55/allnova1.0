export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
/** Semana começa na segunda-feira */
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7))
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
export const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()

const p2 = (n: number) => String(n).padStart(2, '0')
export const dayKey = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const monthKey = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}`
export const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
export const WEEKDAYS_FULL = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MONTHS_FULL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** Índice do dia da semana com segunda = 0 */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7

export const fmtDay = (d: Date) => `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`
export const fmtDate = (d: Date | number) => {
  const x = typeof d === 'number' ? new Date(d) : d
  return `${p2(x.getDate())}/${p2(x.getMonth() + 1)}/${x.getFullYear()}`
}
export const fmtTime = (ts: number) => {
  const x = new Date(ts)
  return `${p2(x.getHours())}:${p2(x.getMinutes())}`
}
export const fmtDateTime = (ts: number) => `${fmtDay(new Date(ts))} às ${fmtTime(ts)}`

export type PeriodKind = 'semana' | 'mes'

export interface Period {
  kind: PeriodKind
  start: Date
  /** Exclusivo */
  end: Date
  label: string
  short: string
}

/** Semana ou mês relativo a hoje (offset 0 = atual, -1 = anterior…) */
export function period(kind: PeriodKind, offset = 0, now = new Date()): Period {
  if (kind === 'semana') {
    const start = addDays(startOfWeek(now), 7 * offset)
    const end = addDays(start, 7)
    const last = addDays(end, -1)
    return { kind, start, end, label: `${fmtDay(start)} a ${fmtDay(last)}`, short: fmtDay(start) }
  }
  const start = addMonths(startOfMonth(now), offset)
  const end = addMonths(start, 1)
  return {
    kind,
    start,
    end,
    label: `${MONTHS_FULL[start.getMonth()]} de ${start.getFullYear()}`,
    short: MONTHS[start.getMonth()],
  }
}

export const periodNoun = (kind: PeriodKind) => (kind === 'semana' ? 'semana' : 'mês')
export const prevLabel = (kind: PeriodKind) => (kind === 'semana' ? 'semana anterior' : 'mês anterior')

export const greeting = (now = new Date()) => {
  const h = now.getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}
