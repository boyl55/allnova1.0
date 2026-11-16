import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import type { Payment, Product, SaleItem } from '../types'
import { PAYMENT_LABEL, PAYMENTS, stockOf } from '../lib/analytics'
import { brl, code, normalize, plural } from '../lib/format'
import { useCategoryNames } from '../hooks'
import { useStore } from '../store/store'
import { toast, useUI } from '../store/ui'
import { ProductThumb } from './ProductThumb'
import { Button, cn, Empty, Field, IconButton, Input, Modal, NumInput, SearchInput, Segmented, Select } from './ui'

export function SaleModal() {
  const open = useUI((s) => s.saleOpen)
  const close = useUI((s) => s.closeSale)
  const products = useStore((s) => s.products)
  const employees = useStore((s) => s.employees)
  const addSale = useStore((s) => s.addSale)
  const catNames = useCategoryNames()

  const [query, setQuery] = useState('')
  const [picking, setPicking] = useState<string | null>(null)
  const [cart, setCart] = useState<SaleItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [payment, setPayment] = useState<Payment>('pix')
  const [employeeId, setEmployeeId] = useState('')
  const [customer, setCustomer] = useState('')

  useEffect(() => {
    if (!open) return
    setQuery('')
    setPicking(null)
    setCart([])
    setDiscount(0)
    setPayment('pix')
    setCustomer('')
  }, [open])

  const list = useMemo(() => {
    const n = normalize(query.trim())
    return products
      .filter((p) => stockOf(p) > 0)
      .filter((p) => !n || normalize(`${p.name} ${p.brand} ${p.code}`).includes(n))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, query])

  const inCart = (productId: string, size: string) =>
    cart.find((i) => i.productId === productId && i.size === size)?.qty ?? 0
  const available = (p: Product, size: string) => (p.sizes.find((s) => s.size === size)?.qty ?? 0) - inCart(p.id, size)

  const add = (p: Product, size: string) => {
    if (available(p, size) <= 0) return
    setCart((c) => {
      const i = c.findIndex((x) => x.productId === p.id && x.size === size)
      if (i >= 0) return c.map((x, k) => (k === i ? { ...x, qty: x.qty + 1 } : x))
      return [...c, { productId: p.id, name: p.name, categoryId: p.categoryId, size, qty: 1, price: p.price, cost: p.cost }]
    })
  }
  const change = (idx: number, by: number) =>
    setCart((c) => c.flatMap((x, k) => (k !== idx ? [x] : x.qty + by <= 0 ? [] : [{ ...x, qty: x.qty + by }])))

  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0)
  const total = Math.max(0, subtotal - Math.min(discount, subtotal))
  const pieces = cart.reduce((a, i) => a + i.qty, 0)

  const submit = () => {
    if (!cart.length) return
    addSale({ items: cart, discount, payment, employeeId: employeeId || undefined, customer })
    toast(`Venda de ${brl(total)} registrada`)
    close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Nova venda"
      subtitle="Escolha as peças e os tamanhos. O estoque é baixado automaticamente."
      footer={
        <>
          <Button variant="soft" onClick={close}>Cancelar</Button>
          <Button variant="brand" disabled={!cart.length} onClick={submit}>
            Registrar venda{cart.length ? ` · ${brl(total)}` : ''}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        {/* Produtos */}
        <div className="min-w-0">
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nome, marca ou número" className="[&>input]:bg-surface-2 [&>input]:shadow-none" />
          <ul className="thin-scrollbar mt-3 max-h-[42dvh] space-y-1 overflow-y-auto md:max-h-[52dvh]">
            {list.length === 0 && (
              <li className="py-8 text-center text-sm text-ink-3">
                {products.length ? 'Nenhum produto com estoque encontrado.' : 'Cadastre produtos para começar a vender.'}
              </li>
            )}
            {list.map((p) => {
              const expanded = picking === p.id || p.sizes.length === 1
              return (
                <li key={p.id} className={cn('rounded-2xl transition', expanded && p.sizes.length > 1 && 'bg-surface-2')}>
                  <button
                    type="button"
                    onClick={() => (p.sizes.length === 1 ? add(p, p.sizes[0].size) : setPicking(picking === p.id ? null : p.id))}
                    className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-surface-2"
                  >
                    <ProductThumb product={p} categoryName={catNames.get(p.categoryId)} className="h-11 w-11 shrink-0 rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">{p.name}</span>
                      <span className="block text-xs text-ink-3">{code(p.code)} · {plural(stockOf(p), 'peça', 'peças')}</span>
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums text-ink">{brl(p.price)}</span>
                  </button>
                  {expanded && p.sizes.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 px-2 pb-2.5 pl-[68px]">
                      {p.sizes.map((s) => {
                        const left = available(p, s.size)
                        return (
                          <button
                            key={s.size} type="button" disabled={left <= 0} onClick={() => add(p, s.size)}
                            className="flex h-9 min-w-11 items-center justify-center gap-1 rounded-full border border-line bg-surface px-3 text-[13px] font-semibold text-ink transition hover:border-brand hover:text-brand-ink disabled:opacity-35"
                            title={`${left} em estoque`}
                          >
                            {s.size}
                            <span className="text-[11px] font-normal text-ink-3">{left}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Carrinho */}
        <div className="min-w-0 rounded-3xl bg-surface-2 p-4">
          {cart.length === 0 ? (
            <Empty icon={<ShoppingBag size={22} />} title="Nenhuma peça ainda" text="Toque em um produto e escolha o tamanho para adicionar." />
          ) : (
            <>
              <ul className="space-y-2.5">
                {cart.map((i, idx) => {
                  const p = products.find((x) => x.id === i.productId)
                  return (
                    <li key={`${i.productId}-${i.size}`} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">{i.name}</span>
                        <span className="block text-xs text-ink-3">Tam. {i.size} · {brl(i.price)}</span>
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-surface p-0.5">
                        <IconButton label="Diminuir" variant="ghost" size="sm" onClick={() => change(idx, -1)}>
                          {i.qty === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                        </IconButton>
                        <span className="w-5 text-center text-[13px] font-semibold tabular-nums">{i.qty}</span>
                        <IconButton label="Aumentar" variant="ghost" size="sm" disabled={!p || available(p, i.size) <= 0} onClick={() => change(idx, 1)}>
                          <Plus size={14} />
                        </IconButton>
                      </span>
                      <span className="w-20 text-right text-[13px] font-semibold tabular-nums text-ink">{brl(i.price * i.qty)}</span>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-4 space-y-3 border-t border-line pt-4">
                <Segmented
                  label="Forma de pagamento" className="w-full [&>button]:flex-1 [&>button]:px-1"
                  value={payment} onChange={setPayment}
                  options={PAYMENTS.map((p) => ({ value: p, label: PAYMENT_LABEL[p] }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Desconto">
                    <NumInput value={discount} onChange={setDiscount} prefix="R$" placeholder="0,00" />
                  </Field>
                  <Field label="Vendedor">
                    <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                      <option value="">Sem vendedor</option>
                      {employees.filter((e) => e.active).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="Cliente (opcional)">
                  <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nome do cliente" />
                </Field>
                <div className="flex items-end justify-between pt-1">
                  <span className="text-[13px] text-ink-2">{plural(pieces, 'peça', 'peças')}{discount > 0 && ` · desconto de ${brl(Math.min(discount, subtotal))}`}</span>
                  <span className="text-2xl font-semibold tracking-tight text-ink">{brl(total)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
