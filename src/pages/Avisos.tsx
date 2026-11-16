import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ClipboardList, PackageCheck, PackagePlus, Truck } from 'lucide-react'
import type { StockAlert } from '../lib/analytics'
import { fmtDay } from '../lib/dates'
import { brl0, code, num, plural } from '../lib/format'
import { copyText } from '../lib/image'
import { useAlerts, useCategoryNames } from '../hooks'
import { useStore } from '../store/store'
import { toast, useUI } from '../store/ui'
import { AlertBadge } from '../components/AlertBadge'
import { Chat, ChatHeader } from '../components/Chat'
import { ProductThumb } from '../components/ProductThumb'
import { Badge, Button, Card, Empty, Segmented } from '../components/ui'
import { SizeChips } from './Estoque'

type Filter = 'todos' | 'zerado' | 'critico' | 'baixo' | 'pedidos'

export function Avisos() {
  const alerts = useAlerts()
  const suppliers = useStore((s) => s.suppliers)
  const settings = useStore((s) => s.settings)
  const ordered = useStore((s) => s.ordered)
  const setOrdered = useStore((s) => s.setOrdered)
  const openStockMove = useUI((s) => s.openStockMove)
  const catNames = useCategoryNames()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('todos')

  const count = (level: StockAlert['level']) => alerts.filter((a) => a.level === level).length
  const pending = alerts.filter((a) => !ordered[a.product.id])
  const list = useMemo(
    () => alerts.filter((a) => (filter === 'todos' ? true : filter === 'pedidos' ? Boolean(ordered[a.product.id]) : a.level === filter)),
    [alerts, filter, ordered],
  )

  const supplierOf = (a: StockAlert) => {
    const s = suppliers.find((x) => x.id === a.product.supplierId)
    return s && (s.kind === 'meu' || settings.vip) ? s : undefined
  }

  const copyList = async () => {
    const lines = pending.map(
      (a) => `• ${a.product.name} (${code(a.product.code)}) — ${num(a.suggest)} peças${a.zeroSizes.length ? ` · em falta: ${a.zeroSizes.join(', ')}` : ''}`,
    )
    const ok = await copyText(`Lista de reposição — ${settings.storeName}\n\n${lines.join('\n')}`)
    toast(ok ? 'Lista de compras copiada' : 'Não foi possível copiar', ok ? 'good' : 'bad')
  }

  /** Conversa com a Nova sobre reposição (mesmo histórico da Nova IA) */
  const chat = (
    <Card raised className="flex h-[440px] flex-col overflow-hidden p-0">
      <ChatHeader />
      <Chat
        suggestions={[
          'O que preciso repor com urgência?',
          'Quanto vou gastar para repor o estoque?',
          'Quais produtos vendem mais rápido e vão acabar?',
        ]}
      />
    </Card>
  )

  if (alerts.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <Empty
            icon={<PackageCheck size={24} />} title="Estoque em dia"
            text="Nenhum produto está abaixo do estoque mínimo. Os avisos aparecem aqui assim que algo começar a acabar."
            action={<Button variant="outline" onClick={() => navigate('/estoque')}>Ver estoque</Button>}
          />
        </Card>
        {chat}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {chat}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 lg:mx-0 lg:w-auto lg:px-0">
          <Segmented
            label="Filtrar avisos" value={filter} onChange={setFilter}
            options={[
              { value: 'todos', label: `Todos (${alerts.length})` },
              { value: 'zerado', label: 'Zerados' },
              { value: 'critico', label: 'Críticos' },
              { value: 'baixo', label: 'Baixos' },
              { value: 'pedidos', label: 'Pedidos feitos' },
            ]}
          />
        </div>
        <Button variant="outline" icon={<ClipboardList size={16} />} onClick={copyList} disabled={!pending.length}>Copiar lista de compras</Button>
      </div>

      {list.length === 0 ? (
        <Card><p className="py-8 text-center text-[13px] text-ink-3">Nenhum aviso neste filtro.</p></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((a) => {
            const p = a.product
            const supplier = supplierOf(a)
            const done = ordered[p.id]
            return (
              <Card key={p.id}>
                <div className="flex gap-4">
                  <ProductThumb product={p} categoryName={catNames.get(p.categoryId)} className="h-[76px] w-[76px] shrink-0 rounded-2xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-semibold text-ink">{p.name}</h3>
                        <p className="truncate text-xs text-ink-3">{code(p.code)} · {p.brand} · {catNames.get(p.categoryId)}</p>
                      </div>
                      <AlertBadge level={a.level} />
                    </div>
                    <SizeChips sizes={p.sizes} className="mt-2.5" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-surface-2 p-3">
                  <Fact label="Estoque / mínimo" value={`${num(a.total)} / ${num(p.minStock)}`} />
                  <Fact label="Ritmo de venda" value={a.sold30 ? `${a.perWeek.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/semana` : 'Sem vendas'} />
                  <Fact label="Dura cerca de" value={a.cover === null ? '—' : a.total === 0 ? 'Acabou' : plural(Math.max(1, Math.round(a.cover)), 'dia', 'dias')} />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-2">
                  <span>
                    Sugestão: comprar <b className="font-semibold text-ink">{plural(a.suggest, 'peça', 'peças')}</b> (cerca de {brl0(a.investment)})
                  </span>
                  {done && <Badge tone="good" icon={<Check size={13} />}>Pedido em {fmtDay(new Date(done))}</Badge>}
                </div>
                {supplier && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3">
                    <Truck size={13} /> {supplier.name} · entrega em {supplier.leadDays} dias
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to="/fornecedores"
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-brand px-3.5 text-[13px] font-semibold text-white transition hover:bg-brand-strong"
                  >
                    <Truck size={15} /> {supplier ? 'Ver fornecedores' : 'Escolher fornecedor'}
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => setOrdered(p.id, !done)}>{done ? 'Desmarcar pedido' : 'Marcar como pedido'}</Button>
                  <Button size="sm" variant="soft" icon={<PackagePlus size={15} />} onClick={() => openStockMove(p.id)}>Dar entrada</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <p className="text-center text-xs text-ink-3">
        O estoque mínimo de cada produto é definido no cadastro, em Produtos. A sugestão de compra considera o ritmo de venda dos últimos 30 dias.
      </p>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[13px] font-semibold text-ink">{value}</div>
      <div className="text-[11px] leading-tight text-ink-3">{label}</div>
    </div>
  )
}
