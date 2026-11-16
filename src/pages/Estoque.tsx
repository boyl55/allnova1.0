import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, CircleCheck, ClipboardCheck, Package, PackagePlus } from 'lucide-react'
import type { MoveType } from '../types'
import { stockOf, stockTotals } from '../lib/analytics'
import { fmtDateTime } from '../lib/dates'
import { brl0, code, normalize, num, plural } from '../lib/format'
import { useAlerts, useCategoryNames } from '../hooks'
import { useStore } from '../store/store'
import { useUI } from '../store/ui'
import { AlertBadge } from '../components/AlertBadge'
import { ProductThumb } from '../components/ProductThumb'
import { Badge, Button, Card, CardHead, cn, Empty, IconButton, SearchInput, Segmented, Select, StatTile } from '../components/ui'

type Filter = 'todos' | 'alerta' | 'emdia'

const MOVE: Record<MoveType, { label: string; icon: React.ReactNode }> = {
  entrada: { label: 'Entrada', icon: <ArrowDownToLine size={16} /> },
  saida: { label: 'Saída', icon: <ArrowUpFromLine size={16} /> },
  ajuste: { label: 'Contagem', icon: <ClipboardCheck size={16} /> },
}

export function SizeChips({ sizes, className }: { sizes: { size: string; qty: number }[]; className?: string }) {
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {sizes.map((s) => (
        <span
          key={s.size}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium tabular-nums',
            s.qty === 0 ? 'bg-bad-soft text-bad-ink' : s.qty <= 2 ? 'bg-warn-soft text-warn-ink' : 'bg-surface-2 text-ink-2',
          )}
        >
          {s.size} <b className="font-semibold">{s.qty}</b>
        </span>
      ))}
    </span>
  )
}

export function Estoque() {
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const moves = useStore((s) => s.moves)
  const openStockMove = useUI((s) => s.openStockMove)
  const catNames = useCategoryNames()
  const alerts = useAlerts()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')

  const totals = useMemo(() => stockTotals(products), [products])
  const alertBy = useMemo(() => new Map(alerts.map((a) => [a.product.id, a])), [alerts])

  const list = useMemo(() => {
    const n = normalize(query.trim())
    return products
      .filter((p) => (!cat || p.categoryId === cat) && (!n || normalize(`${p.name} ${p.brand} ${code(p.code)}`).includes(n)))
      .filter((p) => (filter === 'todos' ? true : filter === 'alerta' ? alertBy.has(p.id) : !alertBy.has(p.id)))
      .sort((a, b) => Number(alertBy.has(b.id)) - Number(alertBy.has(a.id)) || stockOf(a) - stockOf(b))
  }, [products, query, cat, filter, alertBy])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Peças em estoque" value={num(totals.pieces)} unit="peças" />
        <StatTile label="Produtos" value={num(totals.count)} hint={`${num(products.reduce((a, p) => a + p.sizes.length, 0))} tamanhos cadastrados`} />
        <StatTile label="Valor a custo" value={brl0(totals.cost)} hint="Quanto você investiu" />
        <StatTile label="Valor de venda" value={brl0(totals.retail)} hint={`Lucro potencial de ${brl0(totals.potential)}`} />
        <StatTile label="Em alerta" value={num(alerts.length)} unit={alerts.length === 1 ? 'produto' : 'produtos'} hint="Abaixo do mínimo ou com tamanho em falta" className="col-span-2 md:col-span-1" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar produto" className="min-w-[180px] flex-1 sm:max-w-xs" />
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-56 [&>select]:rounded-full [&>select]:border-transparent [&>select]:shadow-card" aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Segmented
          label="Situação" value={filter} onChange={setFilter}
          options={[{ value: 'todos', label: 'Todos' }, { value: 'alerta', label: 'Em alerta' }, { value: 'emdia', label: 'Em dia' }]}
        />
        <span className="flex-1" />
        <Button icon={<PackagePlus size={16} />} onClick={() => openStockMove()} disabled={!products.length}>Movimentar</Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHead icon={<Package size={18} />} title="Produtos em estoque" subtitle={plural(list.length, 'produto', 'produtos')} />
          {list.length === 0 ? (
            <Empty title={products.length ? 'Nada encontrado' : 'Estoque vazio'} text={products.length ? 'Ajuste a busca ou os filtros.' : 'Cadastre produtos para controlar o estoque por tamanho.'} />
          ) : (
            <ul className="mt-3">
              {list.map((p) => {
                const alert = alertBy.get(p.id)
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line py-3 first:border-t-0">
                    <div className="flex min-w-0 flex-1 basis-52 items-center gap-3">
                      <ProductThumb product={p} categoryName={catNames.get(p.categoryId)} className="h-11 w-11 shrink-0 rounded-xl" />
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-ink">{p.name}</div>
                        <div className="truncate text-xs text-ink-3">{code(p.code)} · {catNames.get(p.categoryId) ?? 'Sem categoria'}</div>
                      </div>
                    </div>
                    <SizeChips sizes={p.sizes} className="order-last basis-full md:order-none md:basis-[230px]" />
                    <div className="w-16 text-right">
                      <div className="text-[15px] font-semibold tabular-nums text-ink">{num(stockOf(p))}</div>
                      <div className="text-[11px] text-ink-3">mín. {p.minStock}</div>
                    </div>
                    <div className="flex w-[88px] justify-end">
                      {alert ? <AlertBadge level={alert.level} /> : <Badge tone="good" icon={<CircleCheck size={13} />}>Em dia</Badge>}
                    </div>
                    <IconButton label={`Movimentar estoque de ${p.name}`} variant="soft" size="sm" onClick={() => openStockMove(p.id)}>
                      <PackagePlus size={15} />
                    </IconButton>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-4 xl:self-start">
          <CardHead title="Últimas movimentações" subtitle="Entradas, saídas e contagens" />
          {moves.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-3">Nenhuma movimentação registrada.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {moves.slice(0, 10).map((m) => (
                <li key={m.id} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2">{MOVE[m.type].icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-ink">{m.productName}</span>
                      <span className="shrink-0 text-[11px] text-ink-3">{fmtDateTime(m.ts)}</span>
                    </div>
                    <div className="text-xs text-ink-2">
                      {MOVE[m.type].label}: {m.changes.map((c) => `${c.size} ${c.delta > 0 ? '+' : '−'}${Math.abs(c.delta)}`).join(' · ')}
                    </div>
                    {m.note && <div className="truncate text-xs text-ink-3">{m.note}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
