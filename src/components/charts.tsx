import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { axisFormatter, pct } from '../lib/format'
import { cn } from './ui'

/*
 * Gráficos da ALLNOVA. Convenções:
 * marcas finas (colunas ≤ 24px, linhas de 2px), grade em fio sólido e discreta,
 * um único eixo por gráfico, texto sempre nas cores de texto (nunca na cor da série)
 * e dica ao passar o mouse/tocar em todos eles.
 */

const TICK = { fill: 'var(--ink-3)', fontSize: 11 }
const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)']
export const seriesColor = (i: number) => SERIES[i % SERIES.length]

type Fmt = (n: number) => string

/* eslint-disable @typescript-eslint/no-explicit-any */
function Tip({ active, payload, label, format }: any) {
  if (!active || !payload?.length) return null
  const title = payload[0]?.payload?.full ?? label
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-ink-2">{title}</div>
      {payload
        .filter((p: any) => p.value !== null && p.value !== undefined)
        .map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.stroke ?? p.fill }} />
            <span className="text-ink-2">{p.name}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums text-ink">{format(p.value)}</span>
          </div>
        ))}
    </div>
  )
}

export function Legend({ items, className }: { items: { label: string; color: string }[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2', className)}>
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

interface Point {
  label: string
  value: number
  full?: string
}

/** Evolução no tempo de uma única medida */
export function TrendArea({ data, name, format, height = 220 }: { data: Point[]; name: string; format: Fmt; height?: number }) {
  const fmt = axisFormatter(Math.max(0, ...data.map((d) => d.value)))
  return (
    <div style={{ height }} role="img" aria-label={`Gráfico de ${name.toLowerCase()} ao longo do tempo`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--axis)' }} tick={TICK} minTickGap={28} interval="preserveStartEnd" tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tick={TICK} width={44} tickFormatter={fmt} />
          <Tooltip cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }} content={<Tip format={format} />} />
          <Area
            type="monotone" dataKey="value" name={name} stroke="var(--series-1)" strokeWidth={2}
            fill="var(--series-1)" fillOpacity={0.1} dot={false}
            activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2, fill: 'var(--series-1)' }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Colunas de uma única série; `activeIndex` destaca um período e suaviza os demais */
export function Columns({
  data, name, format, height = 220, activeIndex, onSelect,
}: { data: Point[]; name: string; format: Fmt; height?: number; activeIndex?: number; onSelect?: (i: number) => void }) {
  const fmt = axisFormatter(Math.max(0, ...data.map((d) => d.value)))
  return (
    <div style={{ height }} role="img" aria-label={`Gráfico de colunas de ${name.toLowerCase()}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--axis)' }} tick={TICK} minTickGap={12} interval="preserveStartEnd" tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tick={TICK} width={44} tickFormatter={fmt} />
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<Tip format={format} />} />
          <Bar
            dataKey="value" name={name} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}
            onClick={onSelect ? (_: unknown, i: number) => onSelect(i) : undefined}
            className={onSelect ? 'cursor-pointer' : undefined}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={activeIndex === undefined || activeIndex === i ? 'var(--series-1)' : 'var(--series-dim)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Período atual contra o anterior, no mesmo eixo */
export function CompareLines({
  data, currentName, previousName, format, height = 200, showAxis = true,
}: {
  data: { label: string; atual: number | null; anterior: number | null }[]
  currentName: string; previousName: string; format: Fmt; height?: number; showAxis?: boolean
}) {
  const fmt = axisFormatter(Math.max(0, ...data.map((d) => Math.max(d.atual ?? 0, d.anterior ?? 0))))
  return (
    <div>
      <Legend
        className="mb-2"
        items={[{ label: currentName, color: 'var(--series-1)' }, { label: previousName, color: 'var(--axis)' }]}
      />
      <div style={{ height }} role="img" aria-label={`Comparação entre ${currentName.toLowerCase()} e ${previousName.toLowerCase()}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--axis)' }} tick={TICK} minTickGap={16} interval="preserveStartEnd" tickMargin={8} />
            <YAxis hide={!showAxis} tickLine={false} axisLine={false} tick={TICK} width={44} tickFormatter={fmt} />
            <Tooltip cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }} content={<Tip format={format} />} />
            <Line type="monotone" dataKey="anterior" name={previousName} stroke="var(--axis)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="atual" name={currentName} stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Duas medidas da mesma unidade lado a lado por período */
export function GroupedColumns({
  data, names, format, height = 240,
}: { data: { label: string; a: number; b: number; full?: string }[]; names: [string, string]; format: Fmt; height?: number }) {
  const fmt = axisFormatter(Math.max(0, ...data.map((d) => Math.max(d.a, d.b))))
  return (
    <div>
      <Legend className="mb-2" items={[{ label: names[0], color: seriesColor(0) }, { label: names[1], color: seriesColor(1) }]} />
      <div style={{ height }} role="img" aria-label={`Gráfico comparando ${names[0].toLowerCase()} e ${names[1].toLowerCase()}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--axis)' }} tick={TICK} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tick={TICK} width={44} tickFormatter={fmt} />
            <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<Tip format={format} />} />
            <Bar dataKey="a" name={names[0]} fill={seriesColor(0)} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
            <Bar dataKey="b" name={names[1]} fill={seriesColor(1)} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Ranking em barras horizontais finas, com o valor escrito ao lado */
export function BarList({
  items, format, max, empty = 'Sem dados no período.',
}: { items: { key: string; label: string; value: number; sub?: string }[]; format: Fmt; max?: number; empty?: string }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-ink-3">{empty}</p>
  const top = max ?? Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-3.5">
      {items.map((i) => (
        <li key={i.key}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-ink">
              {i.label}
              {i.sub && <span className="ml-1.5 text-xs text-ink-3">{i.sub}</span>}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{format(i.value)}</span>
          </div>
          <div className="mt-1.5 h-2">
            <div
              className="h-2 rounded-r-[4px] bg-[var(--series-1)]"
              style={{ width: `${Math.max(1.5, (i.value / top) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Um todo dividido em partes: barra fina segmentada + legenda com os valores */
export function SplitBar({ items, format }: { items: { key: string; label: string; value: number }[]; format: Fmt }) {
  const total = items.reduce((a, i) => a + i.value, 0)
  if (!total) return <p className="py-6 text-center text-sm text-ink-3">Sem dados no período.</p>
  return (
    <div>
      <div className="flex h-2 gap-0.5" role="img" aria-label={items.map((i) => `${i.label} ${pct((i.value / total) * 100)}`).join(', ')}>
        {items.map((i, idx) =>
          i.value > 0 ? (
            <div
              key={i.key}
              className="h-2 rounded-full"
              style={{ width: `${(i.value / total) * 100}%`, background: seriesColor(idx) }}
              title={`${i.label}: ${format(i.value)}`}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((i, idx) => (
          <li key={i.key} className="flex items-center gap-2 text-[13px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: seriesColor(idx) }} />
            <span className="text-ink">{i.label}</span>
            <span className="ml-auto tabular-nums text-ink-3">{pct((i.value / total) * 100)}</span>
            <span className="w-24 text-right font-semibold tabular-nums text-ink">{format(i.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Medidor em "pílulas": o preenchimento mostra o avanço rumo a uma meta */
export function PillMeter({ value, total, pills = 24, className }: { value: number; total: number; pills?: number; className?: string }) {
  const ratio = total > 0 ? Math.min(1, value / total) : 0
  const filled = ratio * pills
  return (
    <div
      className={cn('flex h-12 items-stretch gap-[3px]', className)}
      role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}
    >
      {Array.from({ length: pills }, (_, i) => {
        const state = i + 1 <= filled ? 1 : i < filled ? filled - i : 0
        return (
          <span
            key={i}
            className="flex-1 rounded-full"
            style={{ background: state === 0 ? 'var(--brand-soft)' : `color-mix(in srgb, var(--brand) ${Math.round(30 + state * 70)}%, var(--brand-soft))` }}
          />
        )
      })}
    </div>
  )
}
