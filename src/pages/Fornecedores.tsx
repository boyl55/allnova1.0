import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Clock, Crown, Lock, Mail, MessageCircle, Pencil, Phone, Plus, Star, Trash2, Truck, X } from 'lucide-react'
import type { Quote, Supplier } from '../types'
import { brl, brl0, normalize, pct, plural, whatsappLink } from '../lib/format'
import { useStore } from '../store/store'
import { toast, useUI } from '../store/ui'
import {
  Avatar, Badge, Button, Card, Chip, cn, Empty, Field, IconButton, Input, Modal, NumInput, SearchInput, Segmented, Select,
  TD, TH, Textarea,
} from '../components/ui'

type Tab = 'meus' | 'vip' | 'comparar'
type Draft = Omit<Supplier, 'id'> & { id?: string }

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums text-ink" title={`Nota ${value} de 5`}>
      <Star size={14} className="fill-warn text-warn" /> {value.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
    </span>
  )
}

export function Fornecedores() {
  const suppliers = useStore((s) => s.suppliers)
  const vip = useStore((s) => s.settings.vip)
  const [tab, setTab] = useState<Tab>('meus')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [unlock, setUnlock] = useState(false)

  const mine = suppliers.filter((s) => s.kind === 'meu')
  const vips = suppliers.filter((s) => s.kind === 'vip')
  const blank = (): Draft => ({ kind: 'meu', name: '', contact: '', phone: '', email: '', city: '', minOrder: 0, leadDays: 7, rating: 4, notes: '', quotes: [] })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 lg:mx-0 lg:w-auto lg:px-0">
          <Segmented
            label="Seção de fornecedores" value={tab} onChange={setTab}
            options={[
              { value: 'meus', label: `Meus contatos (${mine.length})` },
              { value: 'vip', label: `Contatos VIP (${vips.length})` },
              { value: 'comparar', label: 'Comparar preços' },
            ]}
          />
        </div>
        {tab === 'meus' && <Button icon={<Plus size={16} />} onClick={() => setDraft(blank())}>Novo fornecedor</Button>}
      </div>

      {tab === 'meus' && <Mine list={mine} onEdit={(s) => setDraft({ ...s, quotes: s.quotes.map((q) => ({ ...q })) })} onNew={() => setDraft(blank())} />}
      {tab === 'vip' && <Vip list={vips} unlocked={vip} onUnlock={() => setUnlock(true)} />}
      {tab === 'comparar' && <Compare unlocked={vip} onUnlock={() => setUnlock(true)} />}

      <SupplierForm draft={draft} onClose={() => setDraft(null)} />
      <UnlockModal open={unlock} onClose={() => setUnlock(false)} />
    </div>
  )
}

/* ───────── Cartão ───────── */

function SupplierCard({ s, locked, index, onEdit, onUnlock }: {
  s: Supplier; locked?: boolean; index?: number; onEdit?: () => void; onUnlock?: () => void
}) {
  const settings = useStore((x) => x.settings)
  const hello = `Olá, ${s.contact.split(' ')[0]}! Aqui é ${settings.ownerName ? `${settings.ownerName.split(' ')[0]}, da ` : 'da '}${settings.storeName}. Gostaria de consultar preços e disponibilidade.`
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {locked
            ? <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink"><Lock size={18} /></span>
            : <Avatar name={s.name} size={44} color={s.kind === 'vip' ? 'var(--brand)' : 'var(--ink)'} />}
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 truncate text-[15px] font-semibold text-ink">
              <span className="truncate">{locked ? `Fornecedor VIP ${index}` : s.name}</span>
              {s.kind === 'vip' && <BadgeCheck size={15} className="shrink-0 text-brand" aria-label="Contato VIP verificado" />}
            </h3>
            <p className="truncate text-xs text-ink-3">{locked ? s.city : `${s.contact} · ${s.city}`}</p>
          </div>
        </div>
        <Rating value={s.rating} />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {s.quotes.map((q) => (
          <span key={q.item} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2">
            {q.item} <b className="font-semibold tabular-nums text-ink">{brl(q.price)}</b>
          </span>
        ))}
        {s.quotes.length === 0 && <span className="text-xs text-ink-3">Sem preços cadastrados</span>}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-ink-3" /> Entrega em {plural(s.leadDays, 'dia', 'dias')}</span>
        <span className="inline-flex items-center gap-1.5"><Truck size={13} className="text-ink-3" /> Pedido mínimo {brl0(s.minOrder)}</span>
      </div>
      {!locked && s.notes && <p className="mt-3 text-xs text-ink-3">{s.notes}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        {locked ? (
          <>
            <span className="select-none text-[13px] tracking-wider text-ink-3 blur-[3px]" aria-hidden>(00) 90000-0000</span>
            <span className="flex-1" />
            <Button size="sm" variant="brand" icon={<Lock size={14} />} onClick={onUnlock}>Desbloquear contato</Button>
          </>
        ) : (
          <>
            <a href={whatsappLink(hello, s.phone)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-strong">
              <MessageCircle size={15} /> WhatsApp
            </a>
            <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-3.5 text-[13px] font-semibold text-ink hover:bg-surface-2">
              <Phone size={14} /> {s.phone}
            </a>
            {s.email && (
              <a href={`mailto:${s.email}`} aria-label={`E-mail para ${s.name}`} title={s.email} className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-2 hover:bg-surface-2">
                <Mail size={15} />
              </a>
            )}
            <span className="flex-1" />
            {onEdit && <IconButton label="Editar fornecedor" variant="ghost" size="sm" onClick={onEdit}><Pencil size={15} /></IconButton>}
          </>
        )}
      </div>
    </Card>
  )
}

function Mine({ list, onEdit, onNew }: { list: Supplier[]; onEdit: (s: Supplier) => void; onNew: () => void }) {
  const [query, setQuery] = useState('')
  const n = normalize(query.trim())
  const shown = list.filter((s) => !n || normalize(`${s.name} ${s.contact} ${s.city} ${s.quotes.map((q) => q.item).join(' ')}`).includes(n))
  if (list.length === 0) {
    return (
      <Card>
        <Empty
          icon={<Truck size={24} />} title="Nenhum fornecedor cadastrado"
          text="Adicione seus contatos com os preços por categoria para comparar e pedir reposição com um toque."
          action={<Button variant="brand" onClick={onNew}>Novo fornecedor</Button>}
        />
      </Card>
    )
  }
  return (
    <>
      <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nome, cidade ou categoria" className="sm:max-w-sm" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((s) => <SupplierCard key={s.id} s={s} onEdit={() => onEdit(s)} />)}
      </div>
      {shown.length === 0 && <p className="py-8 text-center text-[13px] text-ink-3">Nenhum fornecedor encontrado.</p>}
    </>
  )
}

function Vip({ list, unlocked, onUnlock }: { list: Supplier[]; unlocked: boolean; onUnlock: () => void }) {
  return (
    <>
      <Card className="hero-bg flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80"><Crown size={14} /> Contatos VIP</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Fornecedores selecionados, com preço de fábrica</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed opacity-80">
            Uma lista paga de contatos verificados pela ALLNOVA. Você vê os preços e as condições de cada um; o nome e o contato direto ficam disponíveis no plano VIP.
          </p>
        </div>
        {unlocked
          ? <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white/80 px-4 text-[13px] font-semibold text-[#1d1235]"><BadgeCheck size={16} /> Plano VIP ativo</span>
          : <button type="button" onClick={onUnlock} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#17141f] px-5 text-sm font-semibold text-white hover:opacity-90"><Lock size={15} /> Desbloquear contatos VIP</button>}
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((s, i) => <SupplierCard key={s.id} s={s} locked={!unlocked} index={i + 1} onUnlock={onUnlock} />)}
      </div>
    </>
  )
}

/* ───────── Comparação de preços ───────── */

function Compare({ unlocked, onUnlock }: { unlocked: boolean; onUnlock: () => void }) {
  const suppliers = useStore((s) => s.suppliers)
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const items = useMemo(() => [...new Set(suppliers.flatMap((s) => s.quotes.map((q) => q.item)))].sort((a, b) => a.localeCompare(b)), [suppliers])
  const [item, setItem] = useState('')
  const current = items.includes(item) ? item : items[0] ?? ''

  const rows = useMemo(() => {
    const vipIndex = new Map(suppliers.filter((s) => s.kind === 'vip').map((s, i) => [s.id, i + 1]))
    return suppliers
      .flatMap((s) => s.quotes.filter((q) => q.item === current).map((q) => ({ s, price: q.price, vipN: vipIndex.get(s.id) })))
      .sort((a, b) => a.price - b.price)
  }, [suppliers, current])

  const mine = useMemo(() => {
    const cat = categories.find((c) => normalize(c.name) === normalize(current))
    const list = cat ? products.filter((p) => p.categoryId === cat.id && p.cost > 0) : []
    return { count: list.length, avg: list.length ? list.reduce((a, p) => a + p.cost, 0) / list.length : 0 }
  }, [products, categories, current])

  if (!items.length) {
    return <Card><Empty icon={<Truck size={24} />} title="Sem preços para comparar" text="Cadastre os preços por categoria nos seus fornecedores para ver a comparação." /></Card>
  }
  const max = Math.max(...rows.map((r) => r.price), 1)
  const best = rows[0]
  const saving = mine.avg && best ? ((mine.avg - best.price) / mine.avg) * 100 : 0

  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
        {items.map((i) => <Chip key={i} active={i === current} onClick={() => setItem(i)}>{i}</Chip>)}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label={`Seu custo médio em ${current}`} value={mine.count ? brl(mine.avg) : '—'} hint={mine.count ? plural(mine.count, 'produto cadastrado', 'produtos cadastrados') : 'Sem produtos nesta categoria'} />
        <Summary label="Melhor preço encontrado" value={brl(best.price)} hint={best.s.kind === 'vip' && !unlocked ? `Fornecedor VIP ${best.vipN} (bloqueado)` : best.s.name} />
        <Summary
          label="Economia possível por peça" value={mine.count && saving > 0 ? pct(saving, 1) : '—'}
          hint={mine.count && saving > 0 ? `${brl(mine.avg - best.price)} a menos que o seu custo médio` : 'Seu custo já está no melhor nível'}
        />
      </div>

      <Card>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className={TH}>Fornecedor</th>
                <th className={`${TH} w-[26%]`}>Preço por peça</th>
                <th className={TH}>vs. seu custo</th>
                <th className={TH}>Entrega</th>
                <th className={TH}>Pedido mínimo</th>
                <th className={`${TH} text-right`}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const locked = r.s.kind === 'vip' && !unlocked
                const diff = mine.avg ? ((r.price - mine.avg) / mine.avg) * 100 : null
                return (
                  <tr key={r.s.id}>
                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{locked ? `Fornecedor VIP ${r.vipN}` : r.s.name}</span>
                        {r.s.kind === 'vip' && <Badge tone="brand" icon={locked ? <Lock size={11} /> : <BadgeCheck size={12} />}>VIP</Badge>}
                        {i === 0 && <Badge tone="good">Melhor preço</Badge>}
                      </div>
                      <div className="text-xs text-ink-3">{r.s.city}</div>
                    </td>
                    <td className={TD}>
                      <div className="font-semibold tabular-nums">{brl(r.price)}</div>
                      <div className="mt-1 h-1.5"><div className="h-1.5 rounded-r-[3px] bg-[var(--series-1)]" style={{ width: `${(r.price / max) * 100}%` }} /></div>
                    </td>
                    <td className={`${TD} whitespace-nowrap tabular-nums`}>
                      {diff === null ? <span className="text-ink-3">—</span> : (
                        <span className={cn('font-semibold', diff < -0.5 ? 'text-good-ink' : diff > 0.5 ? 'text-bad-ink' : 'text-ink-3')}>
                          {diff < 0 ? '−' : '+'}{pct(Math.abs(diff), 1)} {diff < -0.5 ? '(mais barato)' : diff > 0.5 ? '(mais caro)' : ''}
                        </span>
                      )}
                    </td>
                    <td className={`${TD} whitespace-nowrap text-ink-2`}>{plural(r.s.leadDays, 'dia', 'dias')}</td>
                    <td className={`${TD} whitespace-nowrap tabular-nums text-ink-2`}>{brl0(r.s.minOrder)}</td>
                    <td className={`${TD} pr-0 text-right`}><Rating value={r.s.rating} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!unlocked && rows.some((r) => r.s.kind === 'vip') && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-soft p-4">
            <p className="text-[13px] text-brand-ink">Os fornecedores VIP entram na comparação com o contato oculto. Desbloqueie para falar direto com eles.</p>
            <Button size="sm" variant="brand" icon={<Lock size={14} />} onClick={onUnlock}>Desbloquear VIP</Button>
          </div>
        )}
      </Card>
    </>
  )
}

function Summary({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <div className="text-[13px] font-semibold text-ink">{label}</div>
      <div className="mt-3 text-[26px] font-semibold leading-none tracking-tight text-ink">{value}</div>
      <div className="mt-1.5 truncate text-xs text-ink-3">{hint}</div>
    </Card>
  )
}

/* ───────── Cadastro ───────── */

function SupplierForm({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  const categories = useStore((s) => s.categories)
  const saveSupplier = useStore((s) => s.saveSupplier)
  const removeSupplier = useStore((s) => s.removeSupplier)
  const ask = useUI((s) => s.ask)
  const [f, setF] = useState<Draft | null>(draft)
  useEffect(() => setF(draft), [draft])
  if (!f) return null

  const set = (patch: Partial<Draft>) => setF({ ...f, ...patch })
  const setQuote = (i: number, patch: Partial<Quote>) => set({ quotes: f.quotes.map((q, k) => (k === i ? { ...q, ...patch } : q)) })
  const options = [...new Set([...categories.map((c) => c.name), ...f.quotes.map((q) => q.item).filter(Boolean)])]
  const valid = f.name.trim() && f.phone.trim()

  return (
    <Modal
      open onClose={onClose} title={f.id ? 'Editar fornecedor' : 'Novo fornecedor'}
      footer={
        <>
          {f.id && (
            <Button
              variant="danger" className="mr-auto" icon={<Trash2 size={15} />}
              onClick={() => ask({
                title: 'Excluir fornecedor?', text: `${f.name} sai da sua lista de contatos.`, confirmLabel: 'Excluir', danger: true,
                onConfirm: () => {
                  removeSupplier(f.id!)
                  toast('Fornecedor excluído')
                  onClose()
                },
              })}
            >
              Excluir
            </Button>
          )}
          <Button variant="soft" onClick={onClose}>Cancelar</Button>
          <Button
            variant="brand" disabled={!valid}
            onClick={() => {
              saveSupplier({
                ...f, name: f.name.trim(), contact: f.contact.trim() || f.name.trim(), email: f.email?.trim() || undefined,
                notes: f.notes?.trim() || undefined, rating: Math.min(5, Math.max(1, f.rating || 1)),
                quotes: f.quotes.filter((q) => q.item && q.price > 0),
              })
              toast(f.id ? 'Fornecedor atualizado' : 'Fornecedor adicionado')
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
          <Field label="Nome da empresa"><Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Confecções Aurora" /></Field>
          <Field label="Pessoa de contato"><Input value={f.contact} onChange={(e) => set({ contact: e.target.value })} placeholder="Nome" /></Field>
          <Field label="WhatsApp / telefone"><Input value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="(11) 90000-0000" inputMode="tel" /></Field>
          <Field label="E-mail (opcional)"><Input type="email" value={f.email ?? ''} onChange={(e) => set({ email: e.target.value })} placeholder="contato@empresa.com" /></Field>
          <Field label="Cidade"><Input value={f.city} onChange={(e) => set({ city: e.target.value })} placeholder="Cidade, UF" /></Field>
          <Field label="Sua nota (1 a 5)"><NumInput value={f.rating} onChange={(rating) => set({ rating })} placeholder="4,5" /></Field>
          <Field label="Pedido mínimo"><NumInput value={f.minOrder} onChange={(minOrder) => set({ minOrder })} prefix="R$" placeholder="0,00" /></Field>
          <Field label="Prazo de entrega"><NumInput integer value={f.leadDays} onChange={(leadDays) => set({ leadDays })} suffix="dias" placeholder="0" /></Field>
        </div>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Preço médio por peça, por categoria</span>
          <div className="space-y-2">
            {f.quotes.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={q.item} onChange={(e) => setQuote(i, { item: e.target.value })} className="flex-1" aria-label="Categoria">
                  <option value="">Categoria</option>
                  {options.map((o) => <option key={o} value={o} disabled={o !== q.item && f.quotes.some((x) => x.item === o)}>{o}</option>)}
                </Select>
                <span className="w-36"><NumInput value={q.price} onChange={(price) => setQuote(i, { price })} prefix="R$" placeholder="0,00" aria-label="Preço por peça" /></span>
                <IconButton label="Remover preço" variant="ghost" size="sm" onClick={() => set({ quotes: f.quotes.filter((_, k) => k !== i) })}><X size={15} /></IconButton>
              </div>
            ))}
          </div>
          <Button variant="soft" size="sm" className="mt-2" icon={<Plus size={14} />} onClick={() => set({ quotes: [...f.quotes, { item: '', price: 0 }] })}>Adicionar preço</Button>
        </div>

        <Field label="Observações (opcional)">
          <Textarea value={f.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Condições de pagamento, grade mínima, dias de atendimento…" />
        </Field>
      </div>
    </Modal>
  )
}

function UnlockModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const update = useStore((s) => s.updateSettings)
  return (
    <Modal
      open={open} onClose={onClose} size="sm" title="Plano VIP"
      subtitle="Acesso aos contatos diretos dos fornecedores selecionados."
      footer={
        <>
          <Button variant="soft" onClick={onClose}>Agora não</Button>
          <Button
            variant="brand"
            onClick={() => {
              update({ vip: true })
              toast('Contatos VIP desbloqueados')
              onClose()
            }}
          >
            Ativar nesta demonstração
          </Button>
        </>
      }
    >
      <ul className="space-y-2.5 text-[13px] text-ink-2">
        <li className="flex gap-2.5"><BadgeCheck size={17} className="mt-0.5 shrink-0 text-brand" /> Nome, WhatsApp e e-mail de cada fornecedor VIP</li>
        <li className="flex gap-2.5"><BadgeCheck size={17} className="mt-0.5 shrink-0 text-brand" /> Preços de fábrica na comparação com os seus contatos</li>
        <li className="flex gap-2.5"><BadgeCheck size={17} className="mt-0.5 shrink-0 text-brand" /> A Nova passa a considerar os VIP ao sugerir onde comprar</li>
      </ul>
      <p className="mt-4 rounded-2xl bg-surface-2 p-3.5 text-xs leading-relaxed text-ink-2">
        A cobrança do plano ainda não está conectada nesta versão. O botão abaixo libera os contatos de exemplo neste aparelho para você avaliar como a área VIP funciona.
      </p>
    </Modal>
  )
}
