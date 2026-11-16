import { useEffect, useMemo, useState } from 'react'
import { Banknote, Check, CreditCard, Minus, Plus, QrCode, ShoppingBag, Trash2 } from 'lucide-react'
import type { Payment, Product } from '../types'
import { PAYMENT_LABEL, PAYMENTS, stockOf } from '../lib/analytics'
import { brl, code, normalize, plural } from '../lib/format'
import { useCategoryNames, useIsDesktop } from '../hooks'
import { useStore } from '../store/store'
import { toast, useUI } from '../store/ui'
import { ProductThumb } from './ProductThumb'
import { Avatar, Button, Chip, cn, Empty, Field, IconButton, Input, Modal, NumInput, SearchInput, Segmented } from './ui'

const PAY_ICON: Record<Payment, React.ReactNode> = {
  pix: <QrCode size={18} />,
  credito: <CreditCard size={18} />,
  debito: <CreditCard size={18} />,
  dinheiro: <Banknote size={18} />,
}

type Tab = 'pecas' | 'carrinho'

export function SaleModal() {
  const open = useUI((s) => s.saleOpen)
  const close = useUI((s) => s.closeSale)
  const cart = useUI((s) => s.cart)
  const addToCart = useUI((s) => s.addToCart)
  const changeCart = useUI((s) => s.changeCart)
  const clearCart = useUI((s) => s.clearCart)
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const employees = useStore((s) => s.employees)
  const addSale = useStore((s) => s.addSale)
  const catNames = useCategoryNames()
  const desktop = useIsDesktop()

  const [tab, setTab] = useState<Tab>('pecas')
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('todas')
  const [discount, setDiscount] = useState(0)
  const [payment, setPayment] = useState<Payment>('pix')
  const [employeeId, setEmployeeId] = useState('')
  const [customer, setCustomer] = useState('')

  // Ao abrir: volta para a lista de peças. O carrinho NÃO é zerado, porque ele também é alimentado pelos botões de carrinho dos produtos.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setCat('todas')
    setTab(useUI.getState().cart.length ? 'carrinho' : 'pecas')
  }, [open])

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  /** Itens do carrinho que ainda existem no estoque, com a quantidade limitada ao que há de fato */
  const lines = useMemo(
    () =>
      cart.flatMap((i) => {
        const p = byId.get(i.productId)
        const max = p?.sizes.find((s) => s.size === i.size)?.qty ?? 0
        return p && max > 0 ? [{ item: { ...i, qty: Math.min(i.qty, max) }, product: p, max }] : []
      }),
    [cart, byId],
  )

  const qtyIn = (productId: string, size: string) => cart.find((i) => i.productId === productId && i.size === size)?.qty ?? 0
  const countOf = (p: Product) => cart.filter((i) => i.productId === p.id).reduce((a, i) => a + i.qty, 0)

  const list = useMemo(() => {
    const n = normalize(query.trim())
    return products
      .filter((p) => stockOf(p) > 0 && (cat === 'todas' || p.categoryId === cat))
      .filter((p) => !n || normalize(`${p.name} ${p.brand} ${code(p.code)}`).includes(n))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, query, cat])

  const subtotal = lines.reduce((a, l) => a + l.item.price * l.item.qty, 0)
  const off = Math.min(Math.max(0, discount), subtotal)
  const total = Math.max(0, subtotal - off)
  const pieces = lines.reduce((a, l) => a + l.item.qty, 0)

  const add = (p: Product, size: string) => {
    if (!addToCart(p.id, size)) toast('Não há mais peças desse tamanho no estoque', 'bad')
  }

  const submit = () => {
    if (!lines.length) return
    addSale({ items: lines.map((l) => l.item), discount: off, payment, employeeId: employeeId || undefined, customer })
    toast(`Venda de ${brl(total)} registrada · estoque atualizado`)
    clearCart()
    setDiscount(0)
    setPayment('pix')
    setEmployeeId('')
    setCustomer('')
    close()
  }

  // No celular a lista e o carrinho ficam em abas; o botão principal leva ao carrinho antes de finalizar
  const goCart = !desktop && tab === 'pecas'

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      title="Nova venda"
      subtitle="Toque no tamanho para juntar a peça. O estoque baixa assim que a venda é registrada."
      footer={
        <>
          <Button variant="soft" onClick={close}>{lines.length ? 'Continuar depois' : 'Cancelar'}</Button>
          <Button
            variant="brand" disabled={!lines.length}
            onClick={goCart ? () => setTab('carrinho') : submit}
          >
            {goCart ? 'Ver carrinho' : 'Registrar venda'}{lines.length ? ` · ${brl(total)}` : ''}
          </Button>
        </>
      }
    >
      <Segmented
        label="Etapa da venda" className="mb-4 w-full md:hidden [&>button]:flex-1"
        value={tab} onChange={setTab}
        options={[{ value: 'pecas', label: 'Peças' }, { value: 'carrinho', label: `Carrinho${pieces ? ` (${pieces})` : ''}` }]}
      />

      <div className="grid gap-5 md:grid-cols-[1.15fr_1fr]">
        {/* ───── Peças ───── */}
        <div className={cn('min-w-0', tab === 'carrinho' && 'hidden md:block')}>
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nome, marca ou número" className="[&>input]:bg-surface-2 [&>input]:shadow-none" />
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            <Chip active={cat === 'todas'} onClick={() => setCat('todas')}>Todas</Chip>
            {categories.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</Chip>)}
          </div>
          <ul className="thin-scrollbar mt-3 max-h-[46dvh] space-y-2 overflow-y-auto pr-0.5 md:max-h-[56dvh]">
            {list.length === 0 && (
              <li className="py-10 text-center text-sm text-ink-3">
                {products.length ? 'Nenhum produto com estoque encontrado.' : 'Cadastre produtos para começar a vender.'}
              </li>
            )}
            {list.map((p) => {
              const n = countOf(p)
              return (
                <li
                  key={p.id}
                  className={cn(
                    'rounded-[20px] border p-2.5 transition',
                    n > 0 ? 'border-brand/40 bg-brand-soft/60' : 'border-line bg-surface hover:bg-surface-2',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="relative shrink-0">
                      <ProductThumb product={p} categoryName={catNames.get(p.categoryId)} className="h-12 w-12 rounded-xl" />
                      {n > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-white ring-2 ring-surface">
                          {n}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{p.name}</span>
                      <span className="block truncate text-xs text-ink-3">{code(p.code)} · {plural(stockOf(p), 'peça', 'peças')}</span>
                    </span>
                    <span className="text-[14px] font-semibold tabular-nums text-ink">{brl(p.price)}</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {p.sizes.map((s) => {
                      const inCart = qtyIn(p.id, s.size)
                      const left = s.qty - inCart
                      return (
                        <button
                          key={s.size} type="button" disabled={s.qty <= 0 || left <= 0}
                          onClick={() => add(p, s.size)}
                          aria-label={`Adicionar ${p.name} tamanho ${s.size}. ${left} disponíveis${inCart ? `, ${inCart} no carrinho` : ''}`}
                          className={cn(
                            'flex h-10 min-w-12 items-center justify-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition active:scale-95',
                            inCart > 0
                              ? 'border-brand bg-brand text-white'
                              : 'border-line bg-surface text-ink hover:border-brand hover:text-brand-ink disabled:opacity-35 disabled:hover:border-line disabled:hover:text-ink',
                          )}
                        >
                          {s.size}
                          <span className={cn('text-[11px] font-medium', inCart > 0 ? 'text-white/80' : 'text-ink-3')}>
                            {inCart > 0 ? `×${inCart}` : s.qty}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* ───── Carrinho ───── */}
        <div className={cn('min-w-0', tab === 'pecas' && 'hidden md:block')}>
          <div className="glass-strong rounded-[28px] p-4 md:sticky md:top-0">
            {lines.length === 0 ? (
              <Empty icon={<ShoppingBag size={22} />} title="Carrinho vazio" text="Toque no tamanho de uma peça para adicioná-la à venda." />
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink">{plural(pieces, 'peça', 'peças')} na venda</span>
                  <button type="button" onClick={clearCart} className="text-xs font-semibold text-ink-3 hover:text-bad-ink">Limpar</button>
                </div>
                <ul className="space-y-2">
                  {lines.map(({ item: i, product: p, max }) => (
                    <li key={`${i.productId}-${i.size}`} className="flex items-center gap-2.5 rounded-2xl bg-surface p-2">
                      <ProductThumb product={p} categoryName={catNames.get(p.categoryId)} className="h-10 w-10 shrink-0 rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">{i.name}</span>
                        <span className="block text-xs text-ink-3">Tam. {i.size} · {brl(i.price)}</span>
                      </span>
                      <span className="flex items-center gap-0.5 rounded-full bg-surface-2 p-0.5">
                        <IconButton label="Diminuir" variant="ghost" size="sm" onClick={() => changeCart(i.productId, i.size, -1)}>
                          {i.qty === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                        </IconButton>
                        <span className="w-5 text-center text-[13px] font-semibold tabular-nums">{i.qty}</span>
                        <IconButton label="Aumentar" variant="ghost" size="sm" disabled={i.qty >= max} onClick={() => changeCart(i.productId, i.size, 1)}>
                          <Plus size={14} />
                        </IconButton>
                      </span>
                      <span className="w-[74px] text-right text-[13px] font-semibold tabular-nums text-ink">{brl(i.price * i.qty)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 space-y-4">
                  <div>
                    <span className="mb-2 block text-[13px] font-medium text-ink-2">Forma de pagamento</span>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENTS.map((p) => {
                        const on = payment === p
                        return (
                          <button
                            key={p} type="button" aria-pressed={on} onClick={() => setPayment(p)}
                            className={cn(
                              'flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition',
                              on ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:bg-surface-2',
                            )}
                          >
                            <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', on ? 'bg-brand text-white' : 'bg-surface-2 text-ink-2')}>{PAY_ICON[p]}</span>
                            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{PAYMENT_LABEL[p]}</span>
                            {on && <Check size={16} className="shrink-0 text-brand" strokeWidth={3} />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {employees.some((e) => e.active) && (
                    <div>
                      <span className="mb-2 block text-[13px] font-medium text-ink-2">Vendedor</span>
                      <div className="no-scrollbar flex gap-2 overflow-x-auto">
                        <Chip active={!employeeId} onClick={() => setEmployeeId('')}>Sem vendedor</Chip>
                        {employees.filter((e) => e.active).map((e) => (
                          <Chip key={e.id} active={employeeId === e.id} onClick={() => setEmployeeId(e.id)} className="pl-1.5">
                            <Avatar name={e.name} color={e.color} size={22} /> {e.name.split(' ')[0]}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  <Field label="Desconto">
                    <NumInput value={discount} onChange={setDiscount} prefix="R$" placeholder="0,00" />
                    <div className="mt-2 flex gap-1.5">
                      {[5, 10, 15].map((p) => (
                        <button
                          key={p} type="button" onClick={() => setDiscount(Math.round(subtotal * p) / 100)}
                          className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink-2 hover:text-brand-ink"
                        >
                          {p}%
                        </button>
                      ))}
                      {discount > 0 && (
                        <button type="button" onClick={() => setDiscount(0)} className="rounded-full px-3 py-1 text-xs font-semibold text-ink-3 hover:text-bad-ink">Zerar</button>
                      )}
                    </div>
                  </Field>

                  <Field label="Cliente (opcional)">
                    <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nome do cliente" />
                  </Field>

                  <div className="raised rounded-2xl p-3.5">
                    <div className="flex justify-between text-[13px] text-ink-2"><span>Subtotal</span><span className="tabular-nums">{brl(subtotal)}</span></div>
                    {off > 0 && <div className="mt-1 flex justify-between text-[13px] text-ink-2"><span>Desconto</span><span className="tabular-nums">− {brl(off)}</span></div>}
                    <div className="mt-2 flex items-end justify-between border-t border-line pt-2.5">
                      <span className="text-[13px] font-medium text-ink-2">Total</span>
                      <span className="text-[28px] font-semibold leading-none tracking-tight text-ink">{brl(total)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
