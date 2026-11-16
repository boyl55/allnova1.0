import { useEffect, useMemo, useState } from 'react'
import { Check, Pencil, Plus, Trash2, Trophy, Users } from 'lucide-react'
import type { Employee } from '../types'
import { inRange, totals } from '../lib/analytics'
import { period } from '../lib/dates'
import { brl, brl0, num, pct, plural } from '../lib/format'
import { useNow } from '../hooks'
import { useStore } from '../store/store'
import { toast, useUI } from '../store/ui'
import {
  Avatar, Badge, Button, Card, cn, Empty, Field, IconButton, Input, Modal, NumInput, PeriodNav, Progress, StatTile, Toggle,
} from '../components/ui'

type Draft = Omit<Employee, 'id'> & { id?: string }
const COLORS = ['#7c3aed', '#eb6834', '#1baf7a', '#e87ba4', '#2a78d6', '#eda100', '#16131f']

export function Equipe() {
  const employees = useStore((s) => s.employees)
  const sales = useStore((s) => s.sales)
  const now = useNow()
  const [offset, setOffset] = useState(0)
  const [draft, setDraft] = useState<Draft | null>(null)

  const p = useMemo(() => period('mes', offset, now), [offset, now])
  const monthSales = useMemo(() => inRange(sales, p.start, p.end), [sales, p])

  const rows = useMemo(
    () => employees
      .map((e) => {
        const t = totals(monthSales.filter((s) => s.employeeId === e.id))
        return { e, t, progress: e.goal ? (t.revenue / e.goal) * 100 : 0, commission: t.revenue * (e.commission / 100) }
      })
      .sort((a, b) => Number(b.e.active) - Number(a.e.active) || b.t.revenue - a.t.revenue),
    [employees, monthSales],
  )

  const sold = rows.reduce((a, r) => a + r.t.revenue, 0)
  const goal = rows.filter((r) => r.e.active).reduce((a, r) => a + r.e.goal, 0)
  const commissions = rows.reduce((a, r) => a + r.commission, 0)
  const unassigned = totals(monthSales.filter((s) => !s.employeeId || !employees.some((e) => e.id === s.employeeId)))
  const blank = (): Draft => ({ name: '', role: 'Vendedor(a)', phone: '', salary: 0, commission: 3, goal: 0, color: COLORS[employees.length % COLORS.length], active: true })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodNav label={p.label} onPrev={() => setOffset((o) => o - 1)} onNext={() => setOffset((o) => o + 1)} canNext={offset < 0} />
        <Button icon={<Plus size={16} />} onClick={() => setDraft(blank())}>Novo funcionário</Button>
      </div>

      {employees.length === 0 ? (
        <Card>
          <Empty
            icon={<Users size={24} />} title="Cadastre a sua equipe"
            text="Defina a meta mensal e a comissão de cada pessoa. Ao registrar uma venda, é só escolher quem vendeu."
            action={<Button variant="brand" onClick={() => setDraft(blank())}>Novo funcionário</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Vendido pela equipe" value={brl0(sold)} hint={plural(rows.reduce((a, r) => a + r.t.count, 0), 'venda', 'vendas')} />
            <StatTile label="Meta da equipe" value={brl0(goal)} hint={`${num(rows.filter((r) => r.e.active).length)} pessoas ativas`} />
            <StatTile label="Meta atingida" value={goal ? pct((sold / goal) * 100) : '—'} hint={goal && sold < goal ? `Faltam ${brl0(goal - sold)}` : goal ? 'Meta da equipe batida' : undefined} />
            <StatTile label="Comissões estimadas" value={brl0(commissions)} hint="Sobre as vendas do mês" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((r, i) => {
              const hit = r.e.goal > 0 && r.progress >= 100
              return (
                <Card key={r.e.id} className={cn(!r.e.active && 'opacity-60')}>
                  <div className="flex items-start gap-3">
                    <Avatar name={r.e.name} color={r.e.color} size={46} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-semibold text-ink">{r.e.name}</h3>
                      <p className="truncate text-xs text-ink-3">{r.e.role}</p>
                    </div>
                    {!r.e.active
                      ? <Badge>Inativo</Badge>
                      : i === 0 && r.t.revenue > 0 && <Badge tone="brand" icon={<Trophy size={12} />}>1º do mês</Badge>}
                    <IconButton label={`Editar ${r.e.name}`} variant="ghost" size="sm" onClick={() => setDraft({ ...r.e })}><Pencil size={15} /></IconButton>
                  </div>

                  <div className="mt-5 flex items-baseline justify-between gap-2">
                    <span className="text-[26px] font-semibold leading-none tracking-tight text-ink">{brl0(r.t.revenue)}</span>
                    {r.e.goal > 0 && <span className="text-xs text-ink-3">meta {brl0(r.e.goal)}</span>}
                  </div>
                  {r.e.goal > 0 ? (
                    <>
                      <Progress value={r.progress} tone={hit ? 'good' : 'brand'} className="mt-3" />
                      <div className="mt-1.5 flex justify-between text-xs">
                        <span className="text-ink-3">{pct(r.progress)} da meta</span>
                        {hit
                          ? <span className="inline-flex items-center gap-1 font-semibold text-good-ink"><Check size={13} /> Meta batida</span>
                          : <span className="text-ink-3">faltam {brl0(r.e.goal - r.t.revenue)}</span>}
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-xs text-ink-3">Sem meta definida.</p>
                  )}

                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
                    <Mini label="Vendas" value={num(r.t.count)} />
                    <Mini label="Ticket médio" value={brl0(r.t.ticket)} />
                    <Mini label={`Comissão (${pct(r.e.commission, r.e.commission % 1 ? 1 : 0)})`} value={brl(r.commission)} />
                  </div>
                </Card>
              )
            })}
          </div>

          {unassigned.count > 0 && (
            <p className="text-center text-xs text-ink-3">
              {plural(unassigned.count, 'venda', 'vendas')} sem vendedor neste mês, somando {brl0(unassigned.revenue)}. Elas não entram nas metas individuais.
            </p>
          )}
        </>
      )}

      <EmployeeForm draft={draft} onClose={() => setDraft(null)} />
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-semibold text-ink">{value}</div>
      <div className="truncate text-[11px] text-ink-3">{label}</div>
    </div>
  )
}

function EmployeeForm({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  const saveEmployee = useStore((s) => s.saveEmployee)
  const removeEmployee = useStore((s) => s.removeEmployee)
  const ask = useUI((s) => s.ask)
  const [f, setF] = useState<Draft | null>(draft)
  useEffect(() => setF(draft), [draft])
  if (!f) return null
  const set = (patch: Partial<Draft>) => setF({ ...f, ...patch })

  return (
    <Modal
      open onClose={onClose} title={f.id ? 'Editar funcionário' : 'Novo funcionário'}
      footer={
        <>
          {f.id && (
            <Button
              variant="danger" className="mr-auto" icon={<Trash2 size={15} />}
              onClick={() => ask({
                title: 'Excluir funcionário?', text: 'As vendas já registradas continuam nos relatórios, sem vendedor. Para manter o histórico, prefira marcar como inativo.',
                confirmLabel: 'Excluir', danger: true,
                onConfirm: () => {
                  removeEmployee(f.id!)
                  toast('Funcionário excluído')
                  onClose()
                },
              })}
            >
              Excluir
            </Button>
          )}
          <Button variant="soft" onClick={onClose}>Cancelar</Button>
          <Button
            variant="brand" disabled={!f.name.trim()}
            onClick={() => {
              saveEmployee({ ...f, name: f.name.trim(), role: f.role.trim(), phone: f.phone?.trim() || undefined })
              toast(f.id ? 'Funcionário atualizado' : 'Funcionário adicionado')
              onClose()
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome"><Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Nome completo" /></Field>
          <Field label="Cargo"><Input value={f.role} onChange={(e) => set({ role: e.target.value })} placeholder="Ex.: Vendedora" /></Field>
          <Field label="Meta mensal de vendas"><NumInput value={f.goal} onChange={(goal) => set({ goal })} prefix="R$" placeholder="0,00" /></Field>
          <Field label="Comissão sobre as vendas"><NumInput value={f.commission} onChange={(commission) => set({ commission })} suffix="%" placeholder="0" /></Field>
          <Field label="Salário"><NumInput value={f.salary} onChange={(salary) => set({ salary })} prefix="R$" placeholder="0,00" /></Field>
          <Field label="Telefone (opcional)"><Input value={f.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} placeholder="(11) 90000-0000" inputMode="tel" /></Field>
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Cor de identificação</span>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c} type="button" onClick={() => set({ color: c })} aria-label={`Cor ${c}`} aria-pressed={f.color === c}
                className={cn('grid h-8 w-8 place-items-center rounded-full text-white ring-offset-2 ring-offset-surface transition', f.color === c && 'ring-2 ring-ink')}
                style={{ background: c }}
              >
                {f.color === c && <Check size={14} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
        <Toggle checked={f.active} onChange={(active) => set({ active })} label="Funcionário ativo" />
      </div>
    </Modal>
  )
}
