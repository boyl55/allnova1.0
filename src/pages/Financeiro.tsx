import { useEffect, useMemo, useState } from 'react'
import { Boxes, Pencil, Plus, ReceiptText, Target, Trash2, TrendingUp } from 'lucide-react'
import type { Expense, ExpenseCategory } from '../types'
import {
  compare, dailySeries, delta, EXPENSE_CATEGORIES, EXPENSE_LABEL, expensesByCategory, expensesOfMonth, monthFinance,
  stockByCategory, stockTotals,
} from '../lib/analytics'
import { dayKey, fmtDay, parseDay } from '../lib/dates'
import { brl, brl0, num, pct } from '../lib/format'
import { useData, useNow } from '../hooks'
import { useStore } from '../store/store'
import { toast, useUI } from '../store/ui'
import { BarList, Donut, MiniBars } from '../components/charts'
import { Folder } from '../components/Folder'
import {
  Badge, Button, Card, CardHead, Delta, Empty, Field, IconButton, Input, Modal, NumInput, PeriodNav, Progress, Select,
  StatTile, TD, TH, Toggle,
} from '../components/ui'

type Draft = Omit<Expense, 'id'> & { id?: string }

export function Financeiro() {
  const d = useData()
  const now = useNow()
  const saveExpense = useStore((s) => s.saveExpense)
  const removeExpense = useStore((s) => s.removeExpense)
  const setGoal = useStore((s) => s.setGoal)
  const ask = useUI((s) => s.ask)
  const [offset, setOffset] = useState(0)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [goalOpen, setGoalOpen] = useState(false)

  const fin = useMemo(() => monthFinance(d.sales, d.expenses, d.settings, offset, now), [d, offset, now])
  const cmp = useMemo(() => compare(d.sales, 'mes', offset, now), [d.sales, offset, now])
  const dayRevenue = useMemo(() => dailySeries(cmp.curSales, cmp.cur.start, cmp.cur.end).map((p) => p.revenue), [cmp])
  const list = useMemo(() => expensesOfMonth(d.expenses, fin.key).sort((a, b) => b.date.localeCompare(a.date)), [d.expenses, fin.key])
  const cats = useMemo(() => expensesByCategory(list).sort((a, b) => b.amount - a.amount), [list])
  const stock = useMemo(() => stockTotals(d.products), [d.products])
  const stockCats = useMemo(() => stockByCategory(d.products, d.categories), [d.products, d.categories])

  const current = offset === 0
  const newExpense = (): Draft => ({
    date: current ? dayKey(now) : dayKey(fin.period.start), description: '', category: 'outros', amount: 0,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodNav label={fin.period.label} onPrev={() => setOffset((o) => o - 1)} onNext={() => setOffset((o) => o + 1)} canNext={offset < 0} />
        <div className="flex gap-2">
          <Button variant="outline" icon={<Target size={16} />} onClick={() => setGoalOpen(true)}>Definir meta</Button>
          <Button icon={<Plus size={16} />} onClick={() => setDraft(newExpense())}>Nova despesa</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Faturamento em destaque */}
        <Folder tone="brand" tab={34} className="lg:col-span-7" bodyClassName="flex h-full flex-col justify-between gap-6 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[13px] font-semibold opacity-80"><TrendingUp size={15} /> Faturamento</div>
              <div className="mt-0.5 text-xs opacity-70">{fin.period.label}</div>
            </div>
            <span className="glass rounded-full px-3 py-1 text-xs font-semibold">
              {cmp.partial ? 'vs. mesmo trecho do mês anterior' : 'vs. mês anterior'}
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-[44px] font-semibold leading-none tracking-tight sm:text-[56px]">{brl0(fin.revenue)}</span>
              <Delta value={delta(cmp.curT.revenue, cmp.prevT.revenue)} className="text-sm" />
            </div>
            <p className="mt-2 text-[13px] opacity-75">
              {fin.revenue ? `Lucro bruto de ${brl0(fin.gross)} · margem de ${pct(fin.margin)}` : 'Nenhuma venda registrada neste mês.'}
            </p>
          </div>
          <div className="glass rounded-2xl p-3">
            <MiniBars data={dayRevenue} highlight={dayRevenue.length} height={64} label="Faturamento por dia do mês" />
            <div className="mt-1.5 flex justify-between text-[11px] opacity-70"><span>Dia 1</span><span>Faturamento por dia</span><span>Dia {dayRevenue.length}</span></div>
          </div>
        </Folder>

        <Card raised className="flex flex-col lg:col-span-5">
          <CardHead icon={<Target size={18} />} title="Meta de faturamento" subtitle={fin.period.label} />
          {fin.goal > 0 ? (
            <>
              <div className="mt-6 flex flex-wrap items-baseline gap-x-2">
                <span className="text-[34px] font-semibold leading-none tracking-tight text-ink">{brl0(fin.revenue)}</span>
                <span className="text-[13px] text-ink-3">de {brl0(fin.goal)}</span>
              </div>
              <Progress value={fin.progress} tone={fin.progress >= 100 ? 'good' : 'brand'} className="mt-4 h-2.5" />
              <div className="mt-2 flex justify-between text-xs text-ink-3">
                <span>{pct(fin.progress)} atingido</span>
                <span>{fin.progress >= 100 ? `${brl0(fin.revenue - fin.goal)} acima` : `faltam ${brl0(fin.goal - fin.revenue)}`}</span>
              </div>
              {current && (
                <div className="mt-auto grid grid-cols-3 gap-3 pt-6">
                  <Mini label="Projeção do mês" value={fin.projection === null ? '—' : brl0(fin.projection)} />
                  <Mini label="Necessário por dia" value={fin.progress >= 100 ? '—' : brl0(fin.perDayNeeded)} />
                  <Mini label="Dias restantes" value={num(fin.daysLeft)} />
                </div>
              )}
            </>
          ) : (
            <div className="mt-5">
              <p className="text-[13px] text-ink-2">Sem meta definida para este mês. Com uma meta, você acompanha o ritmo e quanto falta vender por dia.</p>
              <Button className="mt-4" variant="brand" size="sm" onClick={() => setGoalOpen(true)}>Definir meta</Button>
            </div>
          )}
        </Card>

      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Custo das peças vendidas" value={brl0(fin.cost)} hint={fin.revenue ? `${pct((fin.cost / fin.revenue) * 100)} do faturamento` : undefined} />
        <StatTile label="Lucro bruto" value={brl0(fin.gross)} hint={`Margem de ${pct(fin.margin)}`} />
        <StatTile label="Despesas" value={brl0(fin.expenses)} hint={fin.revenue ? `${pct((fin.expenses / fin.revenue) * 100)} do faturamento` : `${num(list.length)} lançamentos`} />
        <StatTile
          label="Lucro líquido" value={brl0(fin.net)}
          hint={current ? 'Até agora, com as despesas já lançadas' : `Margem líquida de ${pct(fin.netMargin)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHead icon={<Boxes size={18} />} title="Valor do estoque" subtitle={`${num(stock.pieces)} peças em ${num(stock.count)} produtos`} />
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Mini label="A preço de custo" value={brl0(stock.cost)} big />
            <Mini label="A preço de venda" value={brl0(stock.retail)} big />
            <Mini label="Lucro potencial" value={brl0(stock.potential)} big />
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-3 text-xs text-ink-3">Valor a custo por categoria</div>
            <BarList items={stockCats.map((c) => ({ key: c.id, label: c.name, value: c.cost, sub: `${num(c.pieces)} peças` }))} format={brl0} empty="Cadastre produtos para ver o valor do estoque." />
          </div>
        </Card>

        <Card className="lg:col-span-5">
          <CardHead title="Despesas por categoria" subtitle={fin.period.label} />
          <div className="mt-4">
            <Donut
              items={cats.map((c) => ({ key: c.key, label: c.label, value: c.amount }))}
              format={brl0} centerLabel="Despesas" centerValue={brl0(fin.expenses)}
            />
          </div>
        </Card>
      </div>

      <div>
        <Card>
          <CardHead icon={<ReceiptText size={18} />} title="Despesas do mês" subtitle={`${num(list.length)} lançamentos · ${brl(fin.expenses)}`} />
          {list.length === 0 ? (
            <Empty
              title="Nenhuma despesa neste mês"
              text="Lance aluguel, salários, contas e impostos para calcular o lucro líquido de verdade."
              action={<Button variant="brand" size="sm" onClick={() => setDraft(newExpense())}>Lançar despesa</Button>}
            />
          ) : (
            <div className="relative mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Data</th>
                    <th className={TH}>Descrição</th>
                    <th className={TH}>Categoria</th>
                    <th className={`${TH} text-right`}>Valor</th>
                    <th className={TH}><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((e) => (
                    <tr key={e.id}>
                      <td className={`${TD} tabular-nums text-ink-2`}>{fmtDay(parseDay(e.date))}</td>
                      <td className={`${TD} font-medium`}>{e.description}</td>
                      <td className={TD}><Badge>{EXPENSE_LABEL[e.category]}</Badge></td>
                      <td className={`${TD} text-right font-semibold tabular-nums`}>{brl(e.amount)}</td>
                      <td className={`${TD} w-20 pr-0 text-right`}>
                        <IconButton label="Editar despesa" variant="ghost" size="sm" onClick={() => setDraft({ ...e })}><Pencil size={15} /></IconButton>
                        <IconButton
                          label="Excluir despesa" variant="ghost" size="sm"
                          onClick={() => ask({
                            title: 'Excluir despesa?', text: `${e.description} — ${brl(e.amount)}`, confirmLabel: 'Excluir', danger: true,
                            onConfirm: () => {
                              removeExpense(e.id)
                              toast('Despesa excluída')
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
          )}
        </Card>
      </div>

      <ExpenseModal
        draft={draft} onClose={() => setDraft(null)}
        onSave={(e) => {
          saveExpense(e)
          toast(e.id ? 'Despesa atualizada' : 'Despesa lançada')
          setDraft(null)
        }}
      />
      <GoalModal
        open={goalOpen} onClose={() => setGoalOpen(false)} month={fin.period.label} value={fin.goal}
        onSave={(value, all) => {
          setGoal(fin.key, value, all)
          toast('Meta atualizada')
          setGoalOpen(false)
        }}
      />
    </div>
  )
}

function Mini({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="min-w-0">
      <div className={`truncate font-semibold tracking-tight text-ink ${big ? 'text-lg' : 'text-[15px]'}`}>{value}</div>
      <div className="text-xs leading-tight text-ink-3">{label}</div>
    </div>
  )
}

function ExpenseModal({ draft, onClose, onSave }: { draft: Draft | null; onClose: () => void; onSave: (e: Draft) => void }) {
  const [form, setForm] = useState<Draft | null>(draft)
  useEffect(() => setForm(draft), [draft])
  const valid = form && form.description.trim() && form.amount > 0 && form.date
  return (
    <Modal
      open={Boolean(draft)} onClose={onClose} size="sm" title={draft?.id ? 'Editar despesa' : 'Nova despesa'}
      footer={
        <>
          <Button variant="soft" onClick={onClose}>Cancelar</Button>
          <Button variant="brand" disabled={!valid} onClick={() => form && onSave({ ...form, description: form.description.trim() })}>Salvar</Button>
        </>
      }
    >
      {form && (
        <div className="space-y-4">
          <Field label="Descrição">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: Aluguel da loja" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <NumInput value={form.amount} onChange={(amount) => setForm({ ...form, amount })} prefix="R$" placeholder="0,00" />
            </Field>
            <Field label="Data">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
          </div>
          <Field label="Categoria">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_LABEL[c]}</option>)}
            </Select>
          </Field>
        </div>
      )}
    </Modal>
  )
}

function GoalModal({ open, onClose, month, value, onSave }: {
  open: boolean; onClose: () => void; month: string; value: number; onSave: (value: number, all: boolean) => void
}) {
  const [goal, setGoalValue] = useState(value)
  const [all, setAll] = useState(true)
  useEffect(() => {
    if (open) setGoalValue(value)
  }, [open, value])
  return (
    <Modal
      open={open} onClose={onClose} size="sm" title="Meta de faturamento" subtitle={`Quanto você quer faturar em ${month}?`}
      footer={
        <>
          <Button variant="soft" onClick={onClose}>Cancelar</Button>
          <Button variant="brand" disabled={goal <= 0} onClick={() => onSave(goal, all)}>Salvar meta</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Meta do mês">
          <NumInput value={goal} onChange={setGoalValue} prefix="R$" placeholder="0,00" autoFocus />
        </Field>
        <Toggle checked={all} onChange={setAll} label="Usar como meta padrão dos próximos meses" />
      </div>
    </Modal>
  )
}
