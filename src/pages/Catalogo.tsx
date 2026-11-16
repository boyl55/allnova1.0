import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookImage, Check, ChevronRight, Copy, MessageCircle, Pencil, Plus, Printer, Send, Share2, Trash2 } from 'lucide-react'
import type { Catalog, Product, Settings } from '../types'
import { stockOf } from '../lib/analytics'
import { fmtDate } from '../lib/dates'
import { brl, normalize, plural, whatsappLink } from '../lib/format'
import { copyText, dataUrlToFile } from '../lib/image'
import { useCategoryNames } from '../hooks'
import { useStore } from '../store/store'
import { toast, useUI } from '../store/ui'
import { Folder } from '../components/Folder'
import { ProductThumb } from '../components/ProductThumb'
import {
  Button, Card, Chip, cn, Empty, Field, IconButton, Input, Modal, SearchInput, Textarea, Toggle,
} from '../components/ui'

type Draft = Omit<Catalog, 'id' | 'createdAt'> & { id?: string }

const sizesInStock = (p: Product) => p.sizes.filter((s) => s.qty > 0).map((s) => s.size)

/** Texto pronto para colar ou enviar no WhatsApp */
export function catalogText(c: Pick<Catalog, 'name' | 'message' | 'showPrices'>, products: Product[], settings: Settings) {
  const lines = products.map((p) => {
    const sizes = sizesInStock(p)
    return `• *${p.name}*${c.showPrices ? ` — ${brl(p.price)}` : ''}\n   ${sizes.length ? `Tamanhos: ${sizes.join(', ')}` : 'Esgotado no momento'}`
  })
  return `*${settings.storeName} — ${c.name}*\n${c.message ? `${c.message}\n` : ''}\n${lines.join('\n\n')}`
}

const productsOf = (c: Pick<Catalog, 'productIds'>, products: Product[]) =>
  c.productIds.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => Boolean(p))

/* ───────── Lista de catálogos ───────── */

export function Catalogo() {
  const catalogs = useStore((s) => s.catalogs)
  const products = useStore((s) => s.products)
  const removeCatalog = useStore((s) => s.removeCatalog)
  const ask = useUI((s) => s.ask)
  const catNames = useCategoryNames()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [sharing, setSharing] = useState<Catalog | null>(null)
  const [picking, setPicking] = useState(false)

  const blank = (): Draft => ({
    name: '', message: 'Oi! Separei algumas peças que acho que você vai gostar. Qualquer uma, é só me chamar.', productIds: [], showPrices: true,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[13px] text-ink-2">
          Monte uma seleção de produtos e envie ao cliente pelo WhatsApp, com fotos, preços e os tamanhos disponíveis no estoque.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={<Send size={16} />} onClick={() => setPicking(true)} disabled={!products.length}>Enviar produtos avulsos</Button>
          <Button icon={<Plus size={16} />} onClick={() => setDraft(blank())} disabled={!products.length}>Novo catálogo</Button>
        </div>
      </div>

      {/* Atalho: escolher peças direto da lista de produtos e enviar, sem montar um catálogo */}
      {products.length > 0 && (
        <button
          type="button" onClick={() => setPicking(true)}
          className="glass flex w-full items-center gap-3 rounded-[24px] p-3 text-left transition active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white"><Send size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-ink">Enviar peças separadas</span>
            <span className="block truncate text-xs text-ink-2">Escolha produtos da aba Produtos e mande fotos, preços e tamanhos pelo WhatsApp.</span>
          </span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-surface"><ChevronRight size={16} /></span>
        </button>
      )}

      {catalogs.length === 0 ? (
        <Card>
          <Empty
            icon={<BookImage size={24} />} title="Nenhum catálogo ainda"
            text={products.length ? 'Crie o primeiro para enviar prévias dos produtos aos seus clientes.' : 'Cadastre produtos primeiro; depois é só selecionar os que entram no catálogo.'}
            action={products.length > 0 && <Button variant="brand" onClick={() => setDraft(blank())}>Criar catálogo</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {catalogs.map((c, n) => {
            const items = productsOf(c, products)
            const hasPhotos = items.slice(0, 4).some((p) => p.photos.length > 0)
            return (
              <Folder
                key={c.id} tab={36} tabShare={0.45}
                tone={(['brand', 'ocean', 'sunset', 'mint'] as const)[n % 4]}
                backdrop={
                  // com fotos: elas aparecem na aba e, desfocadas, através do vidro. Sem fotos: malha de cores.
                  hasPhotos ? (
                    <div className="grid h-full grid-cols-4">
                      {Array.from({ length: 4 }, (_, i) => items[i]).map((p, i) =>
                        p ? (
                          <ProductThumb key={p.id} product={p} categoryName={catNames.get(p.categoryId)} className="h-full w-full" />
                        ) : (
                          <span key={i} className="bg-surface-3" />
                        ),
                      )}
                    </div>
                  ) : undefined
                }
                bodyClassName="flex min-h-[210px] flex-col"
              >
                <div className="flex flex-1 flex-col p-5 pt-0">
                  <h3 className="truncate text-base font-semibold text-ink">{c.name}</h3>
                  <p className="mt-0.5 text-xs text-ink-3">{plural(items.length, 'produto', 'produtos')} · criado em {fmtDate(c.createdAt)}</p>
                  {c.message && <p className="mt-2 line-clamp-2 text-[13px] text-ink-2">{c.message}</p>}
                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Button size="sm" variant="brand" icon={<Send size={14} />} onClick={() => setSharing(c)} disabled={!items.length}>Enviar</Button>
                    <Link to={`/catalogo/${c.id}`} className="inline-flex h-9 items-center rounded-full border border-line px-3.5 text-[13px] font-semibold text-ink hover:bg-surface-2">Abrir</Link>
                    <span className="flex-1" />
                    <IconButton label="Editar catálogo" variant="ghost" size="sm" onClick={() => setDraft({ ...c, productIds: [...c.productIds] })}><Pencil size={15} /></IconButton>
                    <IconButton
                      label="Excluir catálogo" variant="ghost" size="sm"
                      onClick={() => ask({
                        title: 'Excluir este catálogo?', text: `“${c.name}” será removido. Os produtos continuam cadastrados.`,
                        confirmLabel: 'Excluir', danger: true,
                        onConfirm: () => {
                          removeCatalog(c.id)
                          toast('Catálogo excluído')
                        },
                      })}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </div>
              </Folder>
            )
          })}
        </div>
      )}

      <CatalogEditor draft={draft} onClose={() => setDraft(null)} />
      <ShareModal catalog={sharing} onClose={() => setSharing(null)} />
      <PickProducts
        open={picking} onClose={() => setPicking(false)}
        onSend={(ids) => {
          setPicking(false)
          setSharing({ id: 'avulso', name: 'Peças selecionadas', message: 'Oi! Separei estas peças para você. Qualquer uma, é só me chamar.', productIds: ids, showPrices: true, createdAt: Date.now() })
        }}
      />
    </div>
  )
}

/* ───────── Escolher produtos avulsos para enviar ───────── */

function PickProducts({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (ids: string[]) => void }) {
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const catNames = useCategoryNames()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('todas')
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => {
    if (!open) return
    setQuery('')
    setCat('todas')
    setIds([])
  }, [open])

  const visible = useMemo(() => {
    const n = normalize(query.trim())
    return products
      .filter((p) => (cat === 'todas' || p.categoryId === cat) && (!n || normalize(`${p.name} ${p.brand}`).includes(n)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, query, cat])
  const toggle = (id: string) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <Modal
      open={open} onClose={onClose} size="lg" title="Enviar produtos avulsos" subtitle="Toque nas peças que você quer mandar ao cliente."
      footer={
        <>
          <span className="mr-auto text-[13px] text-ink-2">{plural(ids.length, 'produto selecionado', 'produtos selecionados')}</span>
          <Button variant="soft" onClick={onClose}>Cancelar</Button>
          <Button variant="brand" disabled={!ids.length} icon={<Send size={15} />} onClick={() => onSend(ids)}>Continuar</Button>
        </>
      }
    >
      <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nome ou marca" className="[&>input]:bg-surface-2 [&>input]:shadow-none" />
      <div className="no-scrollbar my-3 flex gap-2 overflow-x-auto">
        <Chip active={cat === 'todas'} onClick={() => setCat('todas')}>Todas</Chip>
        {categories.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</Chip>)}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {visible.map((p) => {
          const on = ids.includes(p.id)
          return (
            <button
              key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={on}
              className={cn('relative overflow-hidden rounded-2xl text-left ring-2 transition active:scale-[0.97]', on ? 'ring-brand' : 'ring-transparent')}
            >
              <ProductThumb product={p} categoryName={catNames.get(p.categoryId)} className={cn('aspect-[4/5] w-full', stockOf(p) === 0 && 'opacity-50')} />
              <span className={cn('absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border-2', on ? 'border-brand bg-brand text-white' : 'border-white bg-black/25 text-transparent')}>
                <Check size={13} strokeWidth={3} />
              </span>
              <span className="block bg-surface-2 px-2 py-1.5">
                <span className="block truncate text-[11px] font-semibold text-ink">{p.name}</span>
                <span className="block text-[11px] text-ink-3">{stockOf(p) === 0 ? 'Esgotado' : brl(p.price)}</span>
              </span>
            </button>
          )
        })}
      </div>
      {visible.length === 0 && <p className="py-8 text-center text-[13px] text-ink-3">Nenhum produto encontrado.</p>}
    </Modal>
  )
}

/* ───────── Editor ───────── */

export function CatalogEditor({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const saveCatalog = useStore((s) => s.saveCatalog)
  const catNames = useCategoryNames()
  const [f, setF] = useState<Draft | null>(draft)
  const [cat, setCat] = useState('todas')
  useEffect(() => {
    setF(draft)
    setCat('todas')
  }, [draft])

  const visible = useMemo(
    () => products.filter((p) => cat === 'todas' || p.categoryId === cat).sort((a, b) => a.name.localeCompare(b.name)),
    [products, cat],
  )
  if (!f) return null

  const toggle = (id: string) =>
    setF({ ...f, productIds: f.productIds.includes(id) ? f.productIds.filter((x) => x !== id) : [...f.productIds, id] })
  const allVisible = visible.length > 0 && visible.every((p) => f.productIds.includes(p.id))
  const toggleAll = () =>
    setF({
      ...f,
      productIds: allVisible
        ? f.productIds.filter((id) => !visible.some((p) => p.id === id))
        : [...new Set([...f.productIds, ...visible.map((p) => p.id)])],
    })
  const valid = f.name.trim() && f.productIds.length > 0

  return (
    <Modal
      open onClose={onClose} size="lg" title={f.id ? 'Editar catálogo' : 'Novo catálogo'}
      footer={
        <>
          <span className="mr-auto text-[13px] text-ink-2">{plural(f.productIds.length, 'produto selecionado', 'produtos selecionados')}</span>
          <Button variant="soft" onClick={onClose}>Cancelar</Button>
          <Button
            variant="brand" disabled={!valid}
            onClick={() => {
              saveCatalog({ ...f, name: f.name.trim(), message: f.message.trim() })
              toast(f.id ? 'Catálogo atualizado' : 'Catálogo criado')
              onClose()
            }}
          >
            Salvar catálogo
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome do catálogo">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Novidades da semana" />
          </Field>
          <div className="flex items-end pb-2">
            <div className="w-full"><Toggle checked={f.showPrices} onChange={(showPrices) => setF({ ...f, showPrices })} label="Mostrar preços" /></div>
          </div>
        </div>
        <Field label="Mensagem para o cliente">
          <Textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Uma saudação curta que vai junto com as peças" />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-ink-2">Produtos do catálogo</span>
            <button type="button" onClick={toggleAll} className="text-xs font-semibold text-brand-ink">{allVisible ? 'Desmarcar todos' : 'Selecionar todos'}</button>
          </div>
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            <Chip active={cat === 'todas'} onClick={() => setCat('todas')}>Todas</Chip>
            {categories.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</Chip>)}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {visible.map((p) => {
              const on = f.productIds.includes(p.id)
              return (
                <button
                  key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={on}
                  className={cn('relative overflow-hidden rounded-2xl text-left ring-2 transition', on ? 'ring-brand' : 'ring-transparent')}
                >
                  <ProductThumb product={p} categoryName={catNames.get(p.categoryId)} className={cn('aspect-[4/5] w-full', stockOf(p) === 0 && 'opacity-50')} />
                  <span className={cn('absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border-2', on ? 'border-brand bg-brand text-white' : 'border-white bg-black/25 text-transparent')}>
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span className="block bg-surface-2 px-2 py-1.5">
                    <span className="block truncate text-[11px] font-semibold text-ink">{p.name}</span>
                    <span className="block text-[11px] text-ink-3">{stockOf(p) === 0 ? 'Esgotado' : brl(p.price)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ───────── Envio ───────── */

export function ShareModal({ catalog, onClose }: { catalog: Catalog | null; onClose: () => void }) {
  const products = useStore((s) => s.products)
  const settings = useStore((s) => s.settings)
  const [phone, setPhone] = useState('')
  useEffect(() => setPhone(''), [catalog])
  if (!catalog) return null

  const items = productsOf(catalog, products)
  const text = catalogText(catalog, items, settings)
  const photos = items.flatMap((p) => (p.photos[0] ? [{ name: p.name, src: p.photos[0] }] : []))
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const shareWithPhotos = async () => {
    try {
      const files = await Promise.all(photos.slice(0, 10).map((p, i) => dataUrlToFile(p.src, `${i + 1}-${p.name.replace(/[^\w]+/g, '-')}.jpg`)))
      if (files.length && navigator.canShare?.({ files })) await navigator.share({ files, text, title: catalog.name })
      else await navigator.share({ text, title: catalog.name })
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') toast('Não foi possível abrir o compartilhamento', 'bad')
    }
  }

  return (
    <Modal open onClose={onClose} title={`Enviar “${catalog.name}”`} subtitle={`${plural(items.length, 'produto', 'produtos')} · ${plural(photos.length, 'foto', 'fotos')}`}>
      <div className="space-y-4">
        <Field label="WhatsApp do cliente (opcional)" hint="Com DDD. Em branco, você escolhe o contato no WhatsApp.">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 90000-0000" inputMode="tel" autoComplete="off" />
        </Field>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Mensagem</span>
          <pre className="thin-scrollbar max-h-56 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-surface-2 p-3.5 font-sans text-[13px] leading-relaxed text-ink-2">{text}</pre>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <a
            href={whatsappLink(text, phone)} target="_blank" rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-strong sm:col-span-2"
          >
            <MessageCircle size={17} /> Enviar pelo WhatsApp
          </a>
          {canShare && (
            <Button variant="outline" icon={<Share2 size={16} />} onClick={shareWithPhotos}>
              {photos.length ? 'Compartilhar com fotos' : 'Compartilhar'}
            </Button>
          )}
          <Button
            variant="outline" icon={<Copy size={16} />} className={cn(!canShare && 'sm:col-span-2')}
            onClick={async () => toast((await copyText(text)) ? 'Mensagem copiada' : 'Não foi possível copiar')}
          >
            Copiar mensagem
          </Button>
        </div>
        {photos.length === 0 && (
          <p className="text-xs text-ink-3">Estes produtos ainda não têm fotos. Adicione no cadastro para enviá-las junto com a mensagem.</p>
        )}
      </div>
    </Modal>
  )
}

/* ───────── Prévia do catálogo (o que o cliente vê) ───────── */

export function CatalogoView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const catalog = useStore((s) => s.catalogs.find((c) => c.id === id))
  const products = useStore((s) => s.products)
  const settings = useStore((s) => s.settings)
  const catNames = useCategoryNames()
  const [sharing, setSharing] = useState(false)
  const [editing, setEditing] = useState(false)

  if (!catalog) {
    return (
      <Card>
        <Empty title="Catálogo não encontrado" text="Ele pode ter sido excluído." action={<Button variant="outline" onClick={() => navigate('/catalogo')}>Voltar aos catálogos</Button>} />
      </Card>
    )
  }
  const items = productsOf(catalog, products)

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => navigate('/catalogo')} className="hidden lg:inline-flex">Catálogos</Button>
        <div className="flex flex-1 flex-wrap justify-end gap-2">
          <Button variant="outline" icon={<Pencil size={15} />} onClick={() => setEditing(true)}>Editar</Button>
          <Button variant="outline" icon={<Printer size={15} />} onClick={() => window.print()}>Imprimir ou PDF</Button>
          <Button variant="brand" icon={<Send size={15} />} onClick={() => setSharing(true)} disabled={!items.length}>Enviar</Button>
        </div>
      </div>

      <Card className="mx-auto max-w-4xl p-6 sm:p-10">
        <header className="border-b border-line pb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-3">{settings.storeName}</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{catalog.name}</h2>
          {catalog.message && <p className="mx-auto mt-3 max-w-xl text-sm text-ink-2">{catalog.message}</p>}
        </header>

        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-3">Este catálogo está sem produtos.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
            {items.map((p) => {
              const sizes = sizesInStock(p)
              return (
                <article key={p.id} className="break-inside-avoid">
                  <div className="relative overflow-hidden rounded-2xl">
                    <ProductThumb product={p} categoryName={catNames.get(p.categoryId)} className={cn('aspect-[4/5] w-full', !sizes.length && 'opacity-50')} />
                    {!sizes.length && <span className="absolute left-2.5 top-2.5 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white">Esgotado</span>}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold leading-snug text-ink">{p.name}</h3>
                  <p className="text-xs text-ink-3">{p.brand}</p>
                  {catalog.showPrices && <p className="mt-1 text-base font-semibold tracking-tight text-ink">{brl(p.price)}</p>}
                  {sizes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sizes.map((s) => <span key={s} className="rounded-lg border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-2">{s}</span>)}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
        <footer className="mt-10 border-t border-line pt-4 text-center text-xs text-ink-3">
          Tamanhos conforme o estoque de {fmtDate(new Date())}. Sujeito à disponibilidade.
        </footer>
      </Card>

      <ShareModal catalog={sharing ? catalog : null} onClose={() => setSharing(false)} />
      <CatalogEditor draft={editing ? { ...catalog, productIds: [...catalog.productIds] } : null} onClose={() => setEditing(false)} />
    </div>
  )
}
