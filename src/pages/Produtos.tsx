import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Camera, ImagePlus, Plus, Settings2, Shirt, Trash2, X } from 'lucide-react'
import type { Product, SizeStock } from '../types'
import { marginOf, stockOf } from '../lib/analytics'
import { brl, code, normalize, num, pct, plural } from '../lib/format'
import { fileToPhoto } from '../lib/image'
import { useCategoryNames } from '../hooks'
import { useStore } from '../store/store'
import { toast, useUI } from '../store/ui'
import { ProductThumb } from '../components/ProductThumb'
import {
  Badge, Button, Card, Chip, cn, Empty, Field, IconButton, Input, Modal, NumInput, SearchInput, Select, Textarea,
} from '../components/ui'

type Form = Omit<Product, 'id' | 'code' | 'createdAt'> & { id?: string; code?: number }
type Sort = 'recentes' | 'nome' | 'preco' | 'estoque'

const PRESETS: { label: string; sizes: string[] }[] = [
  { label: 'PP ao GG', sizes: ['PP', 'P', 'M', 'G', 'GG'] },
  { label: 'P ao GG', sizes: ['P', 'M', 'G', 'GG'] },
  { label: '36 ao 46', sizes: ['36', '38', '40', '42', '44', '46'] },
  { label: 'Tamanho único', sizes: ['Único'] },
]

export function Produtos() {
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const catNames = useCategoryNames()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [cat, setCat] = useState('todas')
  const [sort, setSort] = useState<Sort>('recentes')
  const [form, setForm] = useState<Form | null>(null)
  const [catsOpen, setCatsOpen] = useState(false)

  const blank = (): Form => ({
    name: '', brand: '', categoryId: cat !== 'todas' ? cat : categories[0]?.id ?? '', price: 0, cost: 0,
    sizes: PRESETS[1].sizes.map((size) => ({ size, qty: 0 })), minStock: 6, photos: [],
  })

  useEffect(() => {
    const q = params.get('q')
    if (q !== null) setQuery(q)
    if (params.get('novo')) {
      setForm(blank())
      setParams({}, { replace: true })
    }
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of products) m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1)
    return m
  }, [products])

  const list = useMemo(() => {
    const n = normalize(query.trim())
    const out = products.filter(
      (p) => (cat === 'todas' || p.categoryId === cat)
        && (!n || normalize(`${p.name} ${p.brand} ${code(p.code)} ${catNames.get(p.categoryId) ?? ''}`).includes(n)),
    )
    const by: Record<Sort, (a: Product, b: Product) => number> = {
      recentes: (a, b) => b.code - a.code,
      nome: (a, b) => a.name.localeCompare(b.name),
      preco: (a, b) => b.price - a.price,
      estoque: (a, b) => stockOf(a) - stockOf(b),
    }
    return out.sort(by[sort])
  }, [products, query, cat, sort, catNames])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nome, marca ou número" className="min-w-[200px] flex-1 sm:max-w-sm" />
        <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-44 [&>select]:rounded-full [&>select]:border-transparent [&>select]:shadow-card" aria-label="Ordenar por">
          <option value="recentes">Mais recentes</option>
          <option value="nome">Nome (A–Z)</option>
          <option value="preco">Maior preço</option>
          <option value="estoque">Menor estoque</option>
        </Select>
        <span className="flex-1" />
        <Button icon={<Plus size={16} />} onClick={() => setForm(blank())}>Novo produto</Button>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
        <Chip active={cat === 'todas'} onClick={() => setCat('todas')}>Todas <span className="opacity-60">{products.length}</span></Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
            {c.name} <span className="opacity-60">{counts.get(c.id) ?? 0}</span>
          </Chip>
        ))}
        <Chip onClick={() => setCatsOpen(true)} className="border-dashed"><Settings2 size={14} /> Categorias</Chip>
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty
            icon={<Shirt size={24} />}
            title={products.length ? 'Nenhum produto encontrado' : 'Cadastre o primeiro produto'}
            text={products.length ? 'Tente outra busca ou categoria.' : 'Informe tamanhos, marca, preço e custo, e adicione fotos para usar no catálogo.'}
            action={!products.length && <Button variant="brand" onClick={() => setForm(blank())}>Novo produto</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
          {list.map((p) => {
            const total = stockOf(p)
            return (
              <button
                key={p.id} type="button" onClick={() => setForm({ ...p, sizes: p.sizes.map((s) => ({ ...s })), photos: [...p.photos] })}
                className="group overflow-hidden rounded-3xl bg-surface text-left shadow-card transition hover:-translate-y-0.5"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <ProductThumb product={p} categoryName={catNames.get(p.categoryId)} className="h-full w-full transition duration-300 group-hover:scale-[1.03]" />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur">{code(p.code)}</span>
                  {p.photos.length > 1 && (
                    <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                      <Camera size={11} /> {p.photos.length}
                    </span>
                  )}
                  {total === 0 && <Badge tone="bad" className="absolute right-2.5 top-2.5">Zerado</Badge>}
                  {total > 0 && total <= p.minStock && <Badge tone="warn" className="absolute right-2.5 top-2.5">Baixo</Badge>}
                </div>
                <div className="p-3.5">
                  <div className="truncate text-xs text-ink-3">{p.brand || 'Sem marca'} · {catNames.get(p.categoryId) ?? 'Sem categoria'}</div>
                  <div className="mt-0.5 truncate text-[13.5px] font-semibold text-ink">{p.name}</div>
                  <div className="mt-1.5 text-[17px] font-semibold tracking-tight text-ink">{brl(p.price)}</div>
                  <div className="truncate text-xs text-ink-3">Custo {brl(p.cost)} · margem {pct(marginOf(p))}</div>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {p.sizes.map((s) => (
                      <span
                        key={s.size}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                          s.qty === 0 ? 'bg-bad-soft text-bad-ink' : 'bg-surface-2 text-ink-2',
                        )}
                      >
                        {s.size} <b className="font-semibold">{s.qty}</b>
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <ProductForm form={form} onClose={() => setForm(null)} />
      <CategoriesModal open={catsOpen} onClose={() => setCatsOpen(false)} />
    </div>
  )
}

/* ───────── Cadastro do produto ───────── */

function ProductForm({ form: initial, onClose }: { form: Form | null; onClose: () => void }) {
  const categories = useStore((s) => s.categories)
  const products = useStore((s) => s.products)
  const suppliers = useStore((s) => s.suppliers)
  const vip = useStore((s) => s.settings.vip)
  const addProduct = useStore((s) => s.addProduct)
  const updateProduct = useStore((s) => s.updateProduct)
  const removeProduct = useStore((s) => s.removeProduct)
  const addCategory = useStore((s) => s.addCategory)
  const ask = useUI((s) => s.ask)

  const [f, setF] = useState<Form | null>(initial)
  const [newCat, setNewCat] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setF(initial)
    setNewCat(null)
  }, [initial])

  const brands = useMemo(() => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort(), [products])
  if (!f) return <Modal open={false} onClose={onClose} title="">{null}</Modal>

  const set = (patch: Partial<Form>) => setF((cur) => (cur ? { ...cur, ...patch } : cur))
  const setSize = (i: number, patch: Partial<SizeStock>) => set({ sizes: f.sizes.map((s, k) => (k === i ? { ...s, ...patch } : s)) })
  const applyPreset = (sizes: string[]) =>
    set({ sizes: sizes.map((size) => ({ size, qty: f.sizes.find((s) => s.size === size)?.qty ?? 0 })) })

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const photos = await Promise.all([...files].slice(0, 8).map((file) => fileToPhoto(file)))
      setF((cur) => (cur ? { ...cur, photos: [...cur.photos, ...photos].slice(0, 8) } : cur))
    } catch {
      toast('Não foi possível ler uma das imagens', 'bad')
    } finally {
      setBusy(false)
    }
  }

  const cleanSizes = f.sizes
    .map((s) => ({ size: s.size.trim(), qty: Math.max(0, Math.round(s.qty)) }))
    .filter((s, i, arr) => s.size && arr.findIndex((x) => normalize(x.size) === normalize(s.size)) === i)
  const valid = f.name.trim() && f.price > 0 && cleanSizes.length > 0 && (newCat === null ? f.categoryId : newCat.trim())

  const save = () => {
    if (!valid) return
    const categoryId = newCat !== null ? addCategory(newCat).id : f.categoryId
    const data = {
      name: f.name.trim(), brand: f.brand.trim(), categoryId, price: f.price, cost: f.cost, sizes: cleanSizes,
      minStock: Math.max(0, Math.round(f.minStock)), photos: f.photos, supplierId: f.supplierId || undefined,
      notes: f.notes?.trim() || undefined,
    }
    if (f.id) {
      updateProduct(f.id, data)
      toast('Produto atualizado')
    } else {
      const p = addProduct(data)
      toast(`Produto ${code(p.code)} cadastrado`)
    }
    onClose()
  }

  return (
    <Modal
      open onClose={onClose} size="lg"
      title={f.id ? `Editar produto ${f.code ? code(f.code) : ''}` : 'Novo produto'}
      subtitle={f.id ? undefined : 'O número do produto é gerado automaticamente.'}
      footer={
        <>
          {f.id && (
            <Button
              variant="danger" className="mr-auto" icon={<Trash2 size={15} />}
              onClick={() => ask({
                title: 'Excluir este produto?', text: 'Ele sai do estoque e dos catálogos. As vendas já registradas continuam nos relatórios.',
                confirmLabel: 'Excluir produto', danger: true,
                onConfirm: () => {
                  removeProduct(f.id!)
                  toast('Produto excluído')
                  onClose()
                },
              })}
            >
              Excluir
            </Button>
          )}
          <Button variant="soft" onClick={onClose}>Cancelar</Button>
          <Button variant="brand" disabled={!valid || busy} onClick={save}>Salvar produto</Button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Fotos */}
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Fotos de prévia</span>
          <div className="grid grid-cols-4 gap-2 md:grid-cols-2">
            {f.photos.map((src, i) => (
              <div key={i} className={cn('group relative overflow-hidden rounded-2xl bg-surface-2', i === 0 ? 'col-span-2 row-span-2 aspect-square md:aspect-[4/5]' : 'aspect-square')}>
                <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button" aria-label={`Remover foto ${i + 1}`}
                  onClick={() => set({ photos: f.photos.filter((_, k) => k !== i) })}
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                >
                  <X size={13} />
                </button>
                {i === 0 && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">Capa</span>}
              </div>
            ))}
            {f.photos.length < 8 && (
              <label
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line bg-surface-2 text-center text-xs text-ink-2 transition hover:border-brand hover:text-brand-ink',
                  f.photos.length === 0 ? 'col-span-4 aspect-[2/1] md:col-span-2 md:aspect-[4/5]' : 'aspect-square',
                )}
              >
                <ImagePlus size={f.photos.length ? 18 : 24} />
                {f.photos.length === 0 && <span className="px-3">{busy ? 'Carregando…' : 'Adicionar fotos'}</span>}
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} />
              </label>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-3">Até 8 fotos. A primeira é a capa no catálogo.</p>
        </div>

        {/* Dados */}
        <div className="space-y-4">
          <Field label="Nome do produto">
            <Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Polo Piquet Clássica" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca">
              <Input value={f.brand} onChange={(e) => set({ brand: e.target.value })} list="marcas" placeholder="Marca" />
              <datalist id="marcas">{brands.map((b) => <option key={b} value={b} />)}</datalist>
            </Field>
            <Field label="Categoria">
              {newCat === null ? (
                <Select value={f.categoryId} onChange={(e) => (e.target.value === '__nova' ? setNewCat('') : set({ categoryId: e.target.value }))}>
                  {!f.categoryId && <option value="">Selecione</option>}
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="__nova">+ Nova categoria…</option>
                </Select>
              ) : (
                <span className="flex gap-1.5">
                  <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nome da categoria" autoFocus />
                  <IconButton label="Cancelar nova categoria" onClick={() => setNewCat(null)}><X size={16} /></IconButton>
                </span>
              )}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço de venda">
              <NumInput value={f.price} onChange={(price) => set({ price })} prefix="R$" placeholder="0,00" />
            </Field>
            <Field label="Custo">
              <NumInput value={f.cost} onChange={(cost) => set({ cost })} prefix="R$" placeholder="0,00" />
            </Field>
          </div>
          {f.price > 0 && f.cost > 0 && (
            <p className="-mt-1 rounded-xl bg-brand-soft px-3 py-2 text-xs text-brand-ink">
              Margem de <b>{pct(marginOf(f))}</b> · lucro de <b>{brl(f.price - f.cost)}</b> por peça
            </p>
          )}

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-ink-2">Tamanhos e estoque</span>
              <span className="flex flex-wrap gap-1">
                {PRESETS.map((p) => (
                  <button key={p.label} type="button" onClick={() => applyPreset(p.sizes)} className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-2 hover:text-brand-ink">
                    {p.label}
                  </button>
                ))}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {f.sizes.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-2xl bg-surface-2 p-1.5">
                  <input
                    value={s.size} onChange={(e) => setSize(i, { size: e.target.value })} aria-label="Tamanho" placeholder="Tam."
                    className="h-9 w-14 rounded-xl bg-surface px-2 text-center text-sm font-semibold text-ink"
                  />
                  <NumInput integer value={s.qty} onChange={(qty) => setSize(i, { qty })} placeholder="0" aria-label={`Quantidade do tamanho ${s.size}`} className="!h-9 !px-2 text-center" />
                  <IconButton label="Remover tamanho" variant="ghost" size="sm" onClick={() => set({ sizes: f.sizes.filter((_, k) => k !== i) })}><X size={14} /></IconButton>
                </div>
              ))}
              <button
                type="button" onClick={() => set({ sizes: [...f.sizes, { size: '', qty: 0 }] })}
                className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand-ink"
              >
                <Plus size={14} /> Tamanho
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ink-3">Total: {plural(f.sizes.reduce((a, s) => a + (s.qty || 0), 0), 'peça', 'peças')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Estoque mínimo" hint="Abaixo disso, entra nos avisos">
              <NumInput integer value={f.minStock} onChange={(minStock) => set({ minStock })} suffix="pç" placeholder="0" />
            </Field>
            <Field label="Fornecedor">
              <Select value={f.supplierId ?? ''} onChange={(e) => set({ supplierId: e.target.value || undefined })}>
                <option value="">Não informado</option>
                {suppliers.filter((s) => s.kind === 'meu' || vip).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Observações (opcional)">
            <Textarea value={f.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Tecido, modelagem, cores disponíveis…" />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

/* ───────── Categorias ───────── */

function CategoriesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useStore((s) => s.categories)
  const products = useStore((s) => s.products)
  const addCategory = useStore((s) => s.addCategory)
  const renameCategory = useStore((s) => s.renameCategory)
  const removeCategory = useStore((s) => s.removeCategory)
  const [name, setName] = useState('')

  const add = () => {
    const n = name.trim()
    if (!n) return
    if (categories.some((c) => normalize(c.name) === normalize(n))) {
      toast('Essa categoria já existe', 'bad')
      return
    }
    addCategory(n)
    setName('')
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Categorias" subtitle="Organize os produtos como fizer sentido para a sua loja.">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add() }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria (ex.: Bermudas)" />
        <Button type="submit" variant="brand" disabled={!name.trim()}>Adicionar</Button>
      </form>
      <ul className="mt-4 space-y-2">
        {categories.map((c) => {
          const count = products.filter((p) => p.categoryId === c.id).length
          return (
            <li key={c.id} className="flex items-center gap-2">
              <Input defaultValue={c.name} aria-label={`Nome da categoria ${c.name}`} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== c.name && renameCategory(c.id, e.target.value)} />
              <span className="w-20 shrink-0 text-right text-xs text-ink-3">{num(count)} {count === 1 ? 'produto' : 'produtos'}</span>
              <IconButton
                label={`Excluir categoria ${c.name}`} variant="ghost" size="sm" disabled={count > 0}
                onClick={() => removeCategory(c.id) && toast('Categoria excluída')}
              >
                <Trash2 size={15} />
              </IconButton>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-3">Só é possível excluir categorias sem produtos.</p>
    </Modal>
  )
}
