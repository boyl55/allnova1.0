import { useMemo, useState } from 'react'
import { Download, Printer, Trash2 } from 'lucide-react'
import {
  byCategory, byEmployee, byPayment, byProduct, compare, dailySeries, delta, PAYMENT_LABEL, periodSeries, saleQty,
} from '../lib/analytics'
import { fmtDate, fmtDateTime, fmtTime, prevLabel, WEEKDAYS, WEEKDAYS_FULL, weekdayIndex, type PeriodKind } from '../lib/dates'
import { brl, brl0, num, pct, plural } from '../lib/format'
import { download } from '../lib/image'
import { useData, useNow } from '../hooks'
import { useStore } from '../store/store'
import { toast, useUI } from '../store/ui'
import { BarList, Columns, Donut, MeterBar, MiniBars } from '../components/charts'
import { Badge, Button, Card, CardHead, Empty, IconButton, PeriodNav, Segmented, StatTile, TD, TH } from '../components/ui'

export function Relatorios() {
  const d = useData()
  const now = useNow()
  const removeSale = useStore((s) => s.removeSale)
  const ask = useUI((s) => s.ask)
  const openSale = useUI((s) => s.openSale)
  const [kind, setKind] = useState<PeriodKind>('semana')
  const [offset, setOffset] = useState(0)
  const [allProducts, setAllProducts] = useState(false)
  const [shown, setShown] = useState(12)
  const [view, setView] = useState<'dia' | 'semana' | 'mes'>('dia')

  const c = useMemo(() => compare(d.sales, kind, offset, now), [d.sales, kind, offset, now])
  const daily = useMemo(() => dailySeries(c.curSales, c.cur.start, c.cur.end), [c])
  /** Dados do gráfico de faturamento: dia a dia no período, ou semana a semana / mês a mês */
  const chart = useMemo(() => {
    if (view === 'dia') {
      return daily.map((p) => ({
        label: kind === 'semana' ? WEEKDAYS[weekdayIndex(p.date)] : String(p.date.getDate()),
        value: p.revenue, full: `${WEEKDAYS_FULL[weekdayIndex(p.date)]}, ${p.label} · ${plural(p.count, 'venda', 'vendas')}`,
      }))
    }
    return periodSeries(d.sales, view, view === 'semana' ? 12 : 12, now).map((p) => ({
      label: p.label, value: p.revenue, full: `${view === 'semana' ? 'Semana de ' : ''}${p.full} · ${plural(p.count, 'venda', 'vendas')}`,
    }))
  }, [view, daily, kind, d.sales, now])
  const payments = useMemo(() => byPayment(c.curSales), [c])
  const cats = useMemo(() => byCategory(c.curSales, d.categories), [c, d.categories])
  const team = useMemo(() => byEmployee(c.curSales, d.employees).filter((e) => e.count > 0), [c, d.employees])
  const products = useMemo(() => byProduct(c.curSales), [c])
  const sales = useMemo(() => [...c.curSales].sort((a, b) => b.ts - a.ts), [c])
  const empName = useMemo(() => new Map(d.employees.map((e) => [e.id, e.name])), [d.employees])

  const versus = `vs. ${c.partial ? (kind === 'semana' ? 'mesmo trecho da' : 'mesmo trecho do') : ''} ${prevLabel(kind)}`.replace(/\s+/g, ' ')
  const title = `Relatório ${kind === 'semana' ? 'semanal' : 'mensal'} — ${c.cur.label}`

  const exportCsv = () => {
    const rows = [
      ['Data', 'Hora', 'Itens', 'Peças', 'Vendedor', 'Pagamento', 'Desconto', 'Total'],
      ...sales.map((s) => [
        fmtDate(s.ts), fmtTime(s.ts), s.items.map((i) => `${i.qty}x ${i.name} (${i.size})`).join(' + '), String(saleQty(s)),
        s.employeeId ? empName.get(s.employeeId) ?? '' : '', PAYMENT_LABEL[s.payment],
        s.discount.toFixed(2).replace('.', ','), s.total.toFixed(2).replace('.', ','),
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(';')).join('\r\n')
    download(`allnova-vendas-${kind}-${c.cur.label.replace(/[^\w]+/g, '-')}.csv`, `﻿${csv}`, 'text/csv;charset=utf-8')
    toast('Relatório exportado em CSV')
  }

  return (
    <div className="space-y-4">
      <div className="hidden print:block">
        <h1 className="text-xl font-semibold">{d.settings.storeName}</h1>
        <p className="text-sm capitalize">{title}</p>
      </div>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Tipo de relatório" value={kind}
            onChange={(k) => {
              setKind(k)
              setOffset(0)
              setShown(12)
            }}
            options={[{ value: 'semana', label: 'Semanal' }, { value: 'mes', label: 'Mensal' }]}
          />
          <PeriodNav label={c.cur.label} onPrev={() => setOffset((o) => o - 1)} onNext={() => setOffset((o) => o + 1)} canNext={offset < 0} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Download size={16} />} onClick={exportCsv} disabled={!sales.length}>Exportar CSV</Button>
          <Button variant="outline" icon={<Printer size={16} />} onClick={() => window.print()}>Imprimir</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile featured label="Faturamento" value={brl0(c.curT.revenue)} delta={delta(c.curT.revenue, c.prevT.revenue)} hint={versus} viz={<MiniBars data={daily.map((p) => p.revenue)} highlight={daily.length} height={44} label="Faturamento por dia" />} />
        <StatTile label="Vendas" value={num(c.curT.count)} delta={delta(c.curT.count, c.prevT.count)} hint={versus} viz={<MiniBars data={daily.map((p) => p.count)} highlight={daily.length} height={44} label="Vendas por dia" />} />
        <StatTile label="Lucro bruto" value={brl0(c.curT.profit)} delta={delta(c.curT.profit, c.prevT.profit)} hint={`Margem de ${pct(c.curT.margin)}`} viz={<MeterBar value={c.curT.profit} total={c.curT.revenue} label="Lucro sobre o faturamento" />} />
      </div>

      <Card raised>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardHead title="Faturamento" subtitle={view === 'dia' ? c.cur.label : view === 'semana' ? 'Últimas 12 semanas' : 'Últimos 12 meses'} />
          <Segmented
            label="Agrupar faturamento" value={view} onChange={setView}
            options={[{ value: 'dia', label: 'Diário' }, { value: 'semana', label: 'Semanal' }, { value: 'mes', label: 'Mensal' }]}
          />
        </div>
        <div className="mt-4">
          <Columns data={chart} name="Faturamento" format={brl} height={260} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHead title="Formas de pagamento" subtitle="Participação no faturamento" />
          <div className="mt-4">
            <Donut
              items={payments.map((p) => ({ key: p.key, label: p.label, value: p.revenue }))}
              format={brl0} centerLabel="Total" centerValue={brl0(c.curT.revenue)} size={190}
            />
          </div>
        </Card>
        <Card>
          <CardHead title="Por categoria" subtitle="Faturamento no período" />
          <div className="mt-4">
            <BarList items={cats.map((x) => ({ key: x.id, label: x.name, value: x.revenue, sub: `${num(x.qty)} un.` }))} format={brl0} />
          </div>
        </Card>
        <Card>
          <CardHead title="Por vendedor" subtitle="Faturamento no período" />
          <div className="mt-4">
            <BarList items={team.map((x) => ({ key: x.id, label: x.name, value: x.revenue, sub: plural(x.count, 'venda', 'vendas') }))} format={brl0} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHead
          title="Produtos vendidos" subtitle={`${plural(products.length, 'produto diferente', 'produtos diferentes')} no período`}
          right={products.length > 8 && (
            <Button variant="soft" size="sm" className="no-print" onClick={() => setAllProducts((v) => !v)}>
              {allProducts ? 'Ver menos' : 'Ver todos'}
            </Button>
          )}
        />
        {products.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink-3">Sem vendas no período.</p>
        ) : (
          <div className="relative mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr>
                  <th className={`${TH} w-10`}>#</th>
                  <th className={TH}>Produto</th>
                  <th className={`${TH} text-right`}>Peças</th>
                  <th className={`${TH} text-right`}>Faturamento</th>
                  <th className={`${TH} text-right`}>Lucro bruto</th>
                  <th className={`${TH} text-right`}>Margem</th>
                </tr>
              </thead>
              <tbody>
                {(allProducts ? products : products.slice(0, 8)).map((p, i) => (
                  <tr key={p.id}>
                    <td className={`${TD} tabular-nums text-ink-3`}>{i + 1}</td>
                    <td className={`${TD} font-medium`}>{p.name}</td>
                    <td className={`${TD} text-right tabular-nums`}>{num(p.qty)}</td>
                    <td className={`${TD} text-right font-semibold tabular-nums`}>{brl(p.revenue)}</td>
                    <td className={`${TD} text-right tabular-nums`}>{brl(p.profit)}</td>
                    <td className={`${TD} pr-0 text-right tabular-nums text-ink-2`}>{pct(p.revenue ? (p.profit / p.revenue) * 100 : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHead title="Vendas do período" subtitle={`${plural(sales.length, 'venda', 'vendas')} · ${brl(c.curT.revenue)}`} />
        {sales.length === 0 ? (
          <Empty
            title="Nenhuma venda neste período"
            text="Registre as vendas do dia para acompanhar o faturamento aqui."
            action={<Button variant="brand" size="sm" onClick={openSale}>Registrar venda</Button>}
          />
        ) : (
          <>
            <div className="relative mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Data</th>
                    <th className={TH}>Itens</th>
                    <th className={TH}>Vendedor</th>
                    <th className={TH}>Pagamento</th>
                    <th className={`${TH} text-right`}>Total</th>
                    <th className={`${TH} no-print`}><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, shown).map((s) => (
                    <tr key={s.id}>
                      <td className={`${TD} whitespace-nowrap tabular-nums text-ink-2`}>{fmtDateTime(s.ts)}</td>
                      <td className={`${TD} max-w-[320px]`}>
                        <span className="line-clamp-2">{s.items.map((i) => `${i.qty}× ${i.name} (${i.size})`).join(', ')}</span>
                        {s.customer && <span className="block text-xs text-ink-3">Cliente: {s.customer}</span>}
                      </td>
                      <td className={`${TD} whitespace-nowrap text-ink-2`}>{s.employeeId ? empName.get(s.employeeId) ?? '—' : '—'}</td>
                      <td className={TD}><Badge>{PAYMENT_LABEL[s.payment]}</Badge></td>
                      <td className={`${TD} whitespace-nowrap text-right font-semibold tabular-nums`}>
                        {brl(s.total)}
                        {s.discount > 0 && <span className="block text-xs font-normal text-ink-3">desc. {brl(s.discount)}</span>}
                      </td>
                      <td className={`${TD} no-print w-10 pr-0 text-right`}>
                        <IconButton
                          label="Excluir venda" variant="ghost" size="sm"
                          onClick={() => ask({
                            title: 'Excluir esta venda?', text: 'As peças voltam para o estoque e a venda sai dos relatórios.',
                            confirmLabel: 'Excluir venda', danger: true,
                            onConfirm: () => {
                              removeSale(s.id)
                              toast('Venda excluída e estoque devolvido')
                            },
                          })}
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sales.length > shown && (
              <div className="no-print mt-4 text-center">
                <Button variant="soft" size="sm" onClick={() => setShown((n) => n + 30)}>
                  Mostrar mais ({num(sales.length - shown)} restantes)
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
