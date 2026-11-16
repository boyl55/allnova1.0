import type { Category, Employee, Expense, ExpenseCategory, ID, Payment, Product, Sale, Settings } from '../types'
import {
  addDays, dayKey, daysInMonth, fmtDay, monthKey, period, weekdayIndex, WEEKDAYS,
  type Period, type PeriodKind,
} from './dates'

/* ───────── Vendas ───────── */

export interface Totals {
  revenue: number
  cost: number
  profit: number
  count: number
  items: number
  ticket: number
  margin: number
  discount: number
}

export const saleCost = (s: Sale) => s.items.reduce((a, i) => a + i.cost * i.qty, 0)
export const saleQty = (s: Sale) => s.items.reduce((a, i) => a + i.qty, 0)
export const saleGross = (s: Sale) => s.items.reduce((a, i) => a + i.price * i.qty, 0)

export function inRange(sales: Sale[], start: Date, end: Date) {
  const a = +start
  const b = +end
  return sales.filter((s) => s.ts >= a && s.ts < b)
}

export function totals(sales: Sale[]): Totals {
  let revenue = 0
  let cost = 0
  let items = 0
  let discount = 0
  for (const s of sales) {
    revenue += s.total
    cost += saleCost(s)
    items += saleQty(s)
    discount += s.discount
  }
  const profit = revenue - cost
  return {
    revenue,
    cost,
    profit,
    count: sales.length,
    items,
    discount,
    ticket: sales.length ? revenue / sales.length : 0,
    margin: revenue ? (profit / revenue) * 100 : 0,
  }
}

/** Variação percentual; null quando não há base de comparação */
export const delta = (cur: number, prev: number): number | null => (prev ? ((cur - prev) / prev) * 100 : null)

export interface Comparison {
  cur: Period
  prev: Period
  /** true quando o período atual ainda está em andamento */
  partial: boolean
  curSales: Sale[]
  prevSales: Sale[]
  curT: Totals
  prevT: Totals
}

/**
 * Compara um período com o anterior. Se o período está em andamento, o anterior
 * é cortado no mesmo ponto (ex.: mês até o dia 15 vs. mês passado até o dia 15).
 */
export function compare(sales: Sale[], kind: PeriodKind, offset = 0, now = new Date()): Comparison {
  const cur = period(kind, offset, now)
  const prev = period(kind, offset - 1, now)
  const partial = +now >= +cur.start && +now < +cur.end
  const prevEnd = partial ? new Date(Math.min(+prev.end, +prev.start + (+now - +cur.start))) : prev.end
  const curSales = inRange(sales, cur.start, cur.end)
  const prevSales = inRange(sales, prev.start, prevEnd)
  return { cur, prev, partial, curSales, prevSales, curT: totals(curSales), prevT: totals(prevSales) }
}

export interface DayPoint {
  date: Date
  key: string
  label: string
  revenue: number
  profit: number
  count: number
}

export function dailySeries(sales: Sale[], start: Date, end: Date): DayPoint[] {
  const map = new Map<string, { revenue: number; profit: number; count: number }>()
  for (const s of sales) {
    const k = dayKey(new Date(s.ts))
    const cur = map.get(k) ?? { revenue: 0, profit: 0, count: 0 }
    cur.revenue += s.total
    cur.profit += s.total - saleCost(s)
    cur.count += 1
    map.set(k, cur)
  }
  const out: DayPoint[] = []
  for (let d = start; +d < +end; d = addDays(d, 1)) {
    const k = dayKey(d)
    const v = map.get(k) ?? { revenue: 0, profit: 0, count: 0 }
    out.push({ date: d, key: k, label: fmtDay(d), ...v })
  }
  return out
}

export interface PeriodPoint {
  offset: number
  label: string
  full: string
  revenue: number
  profit: number
  count: number
}

/** Últimos n períodos (semanas ou meses), do mais antigo ao atual */
export function periodSeries(sales: Sale[], kind: PeriodKind, n: number, now = new Date()): PeriodPoint[] {
  const out: PeriodPoint[] = []
  for (let i = n - 1; i >= 0; i--) {
    const p = period(kind, -i, now)
    const t = totals(inRange(sales, p.start, p.end))
    out.push({ offset: -i, label: p.short, full: p.label, revenue: t.revenue, profit: t.profit, count: t.count })
  }
  return out
}

const itemShare = (s: Sale) => {
  const gross = saleGross(s)
  return gross ? s.total / gross : 1
}

export interface Ranked {
  id: ID
  name: string
  revenue: number
  qty: number
  profit: number
  count: number
}

export function byCategory(sales: Sale[], categories: Category[]): Ranked[] {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const map = new Map<ID, Ranked>()
  for (const s of sales) {
    const f = itemShare(s)
    for (const i of s.items) {
      const r = map.get(i.categoryId) ?? {
        id: i.categoryId, name: names.get(i.categoryId) ?? 'Sem categoria', revenue: 0, qty: 0, profit: 0, count: 0,
      }
      const rev = i.price * i.qty * f
      r.revenue += rev
      r.qty += i.qty
      r.profit += rev - i.cost * i.qty
      r.count += 1
      map.set(i.categoryId, r)
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}

export function byProduct(sales: Sale[]): Ranked[] {
  const map = new Map<ID, Ranked>()
  for (const s of sales) {
    const f = itemShare(s)
    for (const i of s.items) {
      const r = map.get(i.productId) ?? { id: i.productId, name: i.name, revenue: 0, qty: 0, profit: 0, count: 0 }
      const rev = i.price * i.qty * f
      r.revenue += rev
      r.qty += i.qty
      r.profit += rev - i.cost * i.qty
      r.count += 1
      map.set(i.productId, r)
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
}

export function byEmployee(sales: Sale[], employees: Employee[]): Ranked[] {
  const map = new Map<ID, Ranked>()
  for (const e of employees) map.set(e.id, { id: e.id, name: e.name, revenue: 0, qty: 0, profit: 0, count: 0 })
  for (const s of sales) {
    const id = s.employeeId ?? '—'
    const r = map.get(id) ?? { id, name: 'Sem vendedor', revenue: 0, qty: 0, profit: 0, count: 0 }
    r.revenue += s.total
    r.qty += saleQty(s)
    r.profit += s.total - saleCost(s)
    r.count += 1
    map.set(id, r)
  }
  return [...map.values()].filter((r) => r.count > 0 || employees.some((e) => e.id === r.id && e.active))
    .sort((a, b) => b.revenue - a.revenue)
}

export const PAYMENT_LABEL: Record<Payment, string> = {
  pix: 'Pix',
  credito: 'Crédito',
  debito: 'Débito',
  dinheiro: 'Dinheiro',
}
export const PAYMENTS: Payment[] = ['pix', 'credito', 'debito', 'dinheiro']

export function byPayment(sales: Sale[]) {
  const map = new Map<Payment, { revenue: number; count: number }>()
  for (const s of sales) {
    const r = map.get(s.payment) ?? { revenue: 0, count: 0 }
    r.revenue += s.total
    r.count += 1
    map.set(s.payment, r)
  }
  return PAYMENTS.map((key) => ({ key, label: PAYMENT_LABEL[key], ...(map.get(key) ?? { revenue: 0, count: 0 }) }))
}

export function byWeekday(sales: Sale[]) {
  const out = WEEKDAYS.map((label) => ({ label, revenue: 0, count: 0 }))
  for (const s of sales) {
    const i = weekdayIndex(new Date(s.ts))
    out[i].revenue += s.total
    out[i].count += 1
  }
  return out
}

/* ───────── Estoque ───────── */

export const stockOf = (p: Product) => p.sizes.reduce((a, s) => a + s.qty, 0)
export const marginOf = (p: { price: number; cost: number }) => (p.price ? ((p.price - p.cost) / p.price) * 100 : 0)
export const markupOf = (p: { price: number; cost: number }) => (p.cost ? ((p.price - p.cost) / p.cost) * 100 : 0)

export function stockTotals(products: Product[]) {
  let pieces = 0
  let cost = 0
  let retail = 0
  for (const p of products) {
    const q = stockOf(p)
    pieces += q
    cost += q * p.cost
    retail += q * p.price
  }
  return { pieces, cost, retail, count: products.length, potential: retail - cost }
}

export function stockByCategory(products: Product[], categories: Category[]) {
  return categories
    .map((c) => {
      const list = products.filter((p) => p.categoryId === c.id)
      const t = stockTotals(list)
      return { id: c.id, name: c.name, ...t }
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.cost - a.cost)
}

/** Peças vendidas por produto desde uma data */
export function soldMap(sales: Sale[], since: Date) {
  const a = +since
  const map = new Map<ID, number>()
  for (const s of sales) {
    if (s.ts < a) continue
    for (const i of s.items) map.set(i.productId, (map.get(i.productId) ?? 0) + i.qty)
  }
  return map
}

export type AlertLevel = 'zerado' | 'critico' | 'baixo'
export const ALERT_LABEL: Record<AlertLevel, string> = { zerado: 'Zerado', critico: 'Crítico', baixo: 'Baixo' }

export interface StockAlert {
  product: Product
  total: number
  zeroSizes: string[]
  sold30: number
  perWeek: number
  /** Dias de estoque no ritmo atual; null se não vendeu nos últimos 30 dias */
  cover: number | null
  level: AlertLevel
  suggest: number
  investment: number
}

const LEVEL_ORDER: Record<AlertLevel, number> = { zerado: 0, critico: 1, baixo: 2 }

export function reorderAlerts(products: Product[], sales: Sale[], now = new Date()): StockAlert[] {
  const sold = soldMap(sales, addDays(now, -30))
  const out: StockAlert[] = []
  for (const p of products) {
    const total = stockOf(p)
    const zeroSizes = p.sizes.filter((s) => s.qty <= 0).map((s) => s.size)
    const sold30 = sold.get(p.id) ?? 0
    const perDay = sold30 / 30
    const cover = perDay > 0 ? total / perDay : null
    const hasGap = zeroSizes.length > 0 && sold30 > 0
    if (total > p.minStock && !hasGap) continue
    let level: AlertLevel = 'baixo'
    if (total <= 0) level = 'zerado'
    else if (total <= p.minStock / 2 || (cover !== null && cover < 7)) level = 'critico'
    const target = Math.max(p.minStock * 2, Math.ceil(perDay * 30))
    // tamanho em falta: repõe no nível médio dos tamanhos que ainda têm peças
    const filled = p.sizes.filter((s) => s.qty > 0)
    const typical = filled.length ? Math.round(filled.reduce((a, s) => a + s.qty, 0) / filled.length) : 0
    const suggest = Math.max(target - total, zeroSizes.length * Math.max(2, typical), 1)
    out.push({
      product: p, total, zeroSizes, sold30, perWeek: perDay * 7, cover, level, suggest, investment: suggest * p.cost,
    })
  }
  return out.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || b.sold30 - a.sold30)
}

/** Produtos com estoque que não venderam nos últimos `days` dias */
export function stalled(products: Product[], sales: Sale[], days = 30, now = new Date()) {
  const sold = soldMap(sales, addDays(now, -days))
  return products
    .filter((p) => stockOf(p) > 0 && !sold.get(p.id))
    .map((p) => ({ product: p, total: stockOf(p), value: stockOf(p) * p.cost }))
    .sort((a, b) => b.value - a.value)
}

/* ───────── Financeiro ───────── */

export const EXPENSE_LABEL: Record<ExpenseCategory, string> = {
  aluguel: 'Aluguel',
  salarios: 'Salários',
  contas: 'Contas e serviços',
  marketing: 'Marketing',
  impostos: 'Impostos',
  outros: 'Outros',
}
export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_LABEL) as ExpenseCategory[]

export const expensesOfMonth = (expenses: Expense[], key: string) => expenses.filter((e) => e.date.startsWith(key))
export const sumExpenses = (list: Expense[]) => list.reduce((a, e) => a + e.amount, 0)

export function expensesByCategory(list: Expense[]) {
  return EXPENSE_CATEGORIES.map((key) => ({
    key,
    label: EXPENSE_LABEL[key],
    amount: list.filter((e) => e.category === key).reduce((a, e) => a + e.amount, 0),
  })).filter((c) => c.amount > 0)
}

export const goalFor = (settings: Settings, key: string) => settings.goals[key] ?? settings.defaultGoal

export interface MonthFinance {
  period: Period
  key: string
  revenue: number
  cost: number
  gross: number
  expenses: number
  net: number
  margin: number
  netMargin: number
  count: number
  goal: number
  progress: number
  /** Projeção de faturamento até o fim do mês (apenas mês em andamento) */
  projection: number | null
  daysLeft: number
  /** Quanto falta vender por dia para bater a meta */
  perDayNeeded: number
}

export function monthFinance(
  sales: Sale[], expenses: Expense[], settings: Settings, offset = 0, now = new Date(),
): MonthFinance {
  const p = period('mes', offset, now)
  const key = monthKey(p.start)
  const t = totals(inRange(sales, p.start, p.end))
  const exp = sumExpenses(expensesOfMonth(expenses, key))
  const goal = goalFor(settings, key)
  const current = offset === 0
  const dim = daysInMonth(p.start)
  const elapsed = current ? now.getDate() - 1 + (now.getHours() + now.getMinutes() / 60) / 24 : dim
  const daysLeft = current ? dim - now.getDate() + 1 : 0
  const net = t.profit - exp
  return {
    period: p,
    key,
    revenue: t.revenue,
    cost: t.cost,
    gross: t.profit,
    expenses: exp,
    net,
    margin: t.margin,
    netMargin: t.revenue ? (net / t.revenue) * 100 : 0,
    count: t.count,
    goal,
    progress: goal ? (t.revenue / goal) * 100 : 0,
    projection: current && elapsed > 0.5 ? (t.revenue / elapsed) * dim : null,
    daysLeft,
    perDayNeeded: current && daysLeft > 0 ? Math.max(0, goal - t.revenue) / daysLeft : 0,
  }
}

export function monthlyFinanceSeries(sales: Sale[], expenses: Expense[], settings: Settings, n = 6, now = new Date()) {
  const out: (MonthFinance & { label: string; totalCosts: number })[] = []
  for (let i = n - 1; i >= 0; i--) {
    const f = monthFinance(sales, expenses, settings, -i, now)
    out.push({ ...f, label: f.period.short, totalCosts: f.cost + f.expenses })
  }
  return out
}
