import { useMemo, useState } from 'react'
import {
  byCategory, byProduct, compare, dailySeries, delta, inRange, periodSeries, stalled,
} from '../lib/analytics'
import { prevLabel, WEEKDAYS, type PeriodKind } from '../lib/dates'
import { brl, brl0, num, pct, plural } from '../lib/format'
import { useCategoryNames, useData, useNow } from '../hooks'
import { BarList, Columns, CompareLines } from '../components/charts'
import { ProductThumb } from '../components/ProductThumb'
import { Badge, Card, CardHead, PeriodNav, Segmented, StatTile } from '../components/ui'

export function Gestao() {
  const d = useData()
  const now = useNow()
  const catNames = useCategoryNames()
  const [kind, setKind] = useState<PeriodKind>('semana')
  const [offset, setOffset] = useState(0)

  const c = useMemo(() => compare(d.sales, kind, offset, now), [d.sales, kind, offset, now])
  const series = useMemo(() => periodSeries(d.sales, kind, kind === 'semana' ? 12 : 6, now), [d.sales, kind, now])
  const activeIndex = series.findIndex((p) => p.offset === offset)

  const lines = useMemo(() => {
    const cur = dailySeries(c.curSales, c.cur.start, c.cur.end)
    const prev = dailySeries(inRange(d.sales, c.prev.start, c.prev.end), c.prev.start, c.prev.end)
    const n = Math.max(cur.length, prev.length)
    return Array.from({ length: n }, (_, i) => ({
      label: kind === 'semana' ? WEEKDAYS[i] : String(i + 1),
      atual: cur[i] && +cur[i].date <= +now ? cur[i].revenue : null,
      anterior: prev[i]?.revenue ?? null,
    }))
  }, [c, d.sales, kind, now])

  const cats = useMemo(() => byCategory(c.curSales, d.categories), [c, d.categories])
  const top = useMemo(() => byProduct(c.curSales).slice(0, 6), [c])
  const idle = useMemo(() => stalled(d.products, d.sales, 30, now), [d.products, d.sales, now])

  const versus = `vs. ${c.partial ? 'mesmo trecho da' : ''} ${prevLabel(kind)}`.replace('da mês', 'do mês').replace(/\s+/g, ' ')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Tipo de período" value={kind}
          onChange={(k) => {
            setKind(k)
            setOffset(0)
          }}
          options={[{ value: 'semana', label: 'Semanal' }, { value: 'mes', label: 'Mensal' }]}
        />
        <PeriodNav label={c.cur.label} onPrev={() => setOffset((o) => o - 1)} onNext={() => setOffset((o) => o + 1)} canNext={offset < 0} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatTile featured label="Faturamento" value={brl0(c.curT.revenue)} delta={delta(c.curT.revenue, c.prevT.revenue)} hint={versus} />
        <StatTile label="Lucro bruto" value={brl0(c.curT.profit)} delta={delta(c.curT.profit, c.prevT.profit)} hint={`Margem de ${pct(c.curT.margin)}`} />
        <StatTile label="Vendas" value={num(c.curT.count)} delta={delta(c.curT.count, c.prevT.count)} hint={versus} />
        <StatTile label="Ticket médio" value={brl0(c.curT.ticket)} delta={delta(c.curT.ticket, c.prevT.ticket)} hint={versus} />
        <StatTile label="Peças vendidas" value={num(c.curT.items)} delta={delta(c.curT.items, c.prevT.items)} hint={versus} className="col-span-2 md:col-span-1" />
      </div>

      <Card raised>
        <CardHead
          title="Evolução do faturamento"
          subtitle={`${kind === 'semana' ? 'Últimas 12 semanas' : 'Últimos 6 meses'} — toque em uma coluna para ver o período`}
        />
        <div className="mt-4">
          <Columns
            data={series.map((p) => ({ label: p.label, value: p.revenue, full: kind === 'semana' ? `Semana de ${p.full}` : p.full }))}
            name="Faturamento" format={brl} height={320}
            activeIndex={activeIndex >= 0 ? activeIndex : undefined}
            onSelect={(i) => setOffset(series[i].offset)}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHead title="Dia a dia" subtitle={`Faturamento por dia, contra ${kind === 'semana' ? 'a semana anterior' : 'o mês anterior'}`} />
          <div className="mt-4">
            <CompareLines
              data={lines} format={brl} height={262}
              currentName={kind === 'semana' ? 'Semana selecionada' : 'Mês selecionado'}
              previousName={kind === 'semana' ? 'Semana anterior' : 'Mês anterior'}
            />
          </div>
        </Card>
        <Card className="lg:col-span-5">
          <CardHead title="Categorias" subtitle="Faturamento no período" />
          <div className="mt-4">
            <BarList
              items={cats.map((x) => ({
                key: x.id, label: x.name, value: x.revenue,
                sub: c.curT.revenue ? pct((x.revenue / c.curT.revenue) * 100) : undefined,
              }))}
              format={brl0}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Produtos em alta" subtitle="Mais peças vendidas no período" />
          <div className="mt-4">
            <BarList items={top.map((p) => ({ key: p.id, label: p.name, value: p.qty, sub: brl0(p.revenue) }))} format={(n) => `${num(n)} un.`} />
          </div>
        </Card>
        <Card>
          <CardHead
            title="Produtos parados" subtitle="Com estoque e sem venda há 30 dias"
            right={idle.length > 0 && <Badge tone="warn">{brl0(idle.reduce((a, x) => a + x.value, 0))} parados</Badge>}
          />
          {idle.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-3">Todos os produtos com estoque venderam nos últimos 30 dias.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {idle.slice(0, 5).map((x) => (
                <li key={x.product.id} className="flex items-center gap-3">
                  <ProductThumb product={x.product} categoryName={catNames.get(x.product.categoryId)} className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-ink">{x.product.name}</div>
                    <div className="text-xs text-ink-3">{plural(x.total, 'peça', 'peças')} em estoque</div>
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums text-ink">{brl0(x.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
