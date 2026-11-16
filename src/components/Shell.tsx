import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Bell, BookImage, ChevronRight, House, LayoutGrid, Moon, PackagePlus, Plus, Settings, Shirt, ShoppingCart, Sparkles, Sun,
  Trash2, Truck, Zap,
} from 'lucide-react'
import { NAV, navFor } from '../nav'
import { greeting } from '../lib/dates'
import { brl, code, firstName, normalize, plural } from '../lib/format'
import { useAlerts, useCategoryNames, useIsDesktop } from '../hooks'
import { useStore } from '../store/store'
import { useUI } from '../store/ui'
import { Chat, ChatHeader } from './Chat'
import { Logo } from './Logo'
import { ProductThumb } from './ProductThumb'
import { SaleModal } from './SaleModal'
import { StockMoveModal } from './StockMoveModal'
import { Avatar, Button, cn, ConfirmHost, IconButton, Modal, SearchInput, Toasts } from './ui'

/* ───────── Busca global ───────── */

export function SearchBox({ className }: { className?: string }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const products = useStore((s) => s.products)
  const suppliers = useStore((s) => s.suppliers)
  const employees = useStore((s) => s.employees)
  const vip = useStore((s) => s.settings.vip)
  const navigate = useNavigate()

  const results = useMemo(() => {
    const n = normalize(q.trim())
    if (n.length < 2) return null
    const groups = [
      {
        title: 'Seções',
        items: NAV.filter((x) => normalize(`${x.label} ${x.title}`).includes(n)).slice(0, 4)
          .map((x) => ({ key: x.to, label: x.title, sub: x.subtitle, to: x.to })),
      },
      {
        title: 'Produtos',
        items: products.filter((p) => normalize(`${p.name} ${p.brand} ${code(p.code)}`).includes(n)).slice(0, 5)
          .map((p) => ({ key: p.id, label: p.name, sub: `${code(p.code)} · ${p.brand}`, to: `/produtos?q=${encodeURIComponent(p.name)}` })),
      },
      {
        title: 'Fornecedores',
        items: suppliers.filter((s) => (s.kind === 'meu' || vip) && normalize(`${s.name} ${s.city} ${s.contact}`).includes(n)).slice(0, 3)
          .map((s) => ({ key: s.id, label: s.name, sub: s.city, to: '/fornecedores' })),
      },
      {
        title: 'Equipe',
        items: employees.filter((e) => normalize(e.name).includes(n)).slice(0, 3)
          .map((e) => ({ key: e.id, label: e.name, sub: e.role, to: '/equipe' })),
      },
    ].filter((g) => g.items.length)
    return groups
  }, [q, products, suppliers, employees, vip])

  const go = (to: string) => {
    navigate(to)
    setQ('')
    setOpen(false)
  }

  return (
    <div
      className={cn('relative', className)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOpen(false)}
    >
      <SearchInput
        value={q}
        onChange={(v) => {
          setQ(v)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Enter' && results?.[0]?.items[0]) go(results[0].items[0].to)
        }}
        placeholder="Buscar produtos, seções, contatos"
        aria-label="Buscar no aplicativo"
      />
      {open && results && (
        <div
          className="thin-scrollbar absolute inset-x-0 top-full z-40 mt-2 max-h-[60dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.length === 0 && <p className="px-3 py-4 text-center text-[13px] text-ink-3">Nada encontrado para “{q}”.</p>}
          {results.map((g) => (
            <div key={g.title} className="mb-1 last:mb-0">
              <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{g.title}</div>
              {g.items.map((i) => (
                <button key={i.key} type="button" onClick={() => go(i.to)} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-surface-2">
                  <span className="block truncate text-[13px] font-semibold text-ink">{i.label}</span>
                  <span className="block truncate text-xs text-ink-3">{i.sub}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ThemeButton({ variant = 'ghost' }: { variant?: 'ghost' | 'outline' | 'soft' }) {
  const theme = useStore((s) => s.settings.theme)
  const update = useStore((s) => s.updateSettings)
  return (
    <IconButton
      label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} variant={variant}
      onClick={() => update({ theme: theme === 'dark' ? 'light' : 'dark' })}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  )
}

/* ───────── Menu lateral (desktop) ───────── */

function Sidebar({ alerts }: { alerts: number }) {
  const settings = useStore((s) => s.settings)
  const groups = [...new Set(NAV.map((n) => n.group))]
  return (
    <aside className="no-print thin-scrollbar fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col overflow-y-auto px-4 py-6 lg:flex">
      <Link to="/" className="mb-7 px-2" aria-label="ALLNOVA — início">
        <Logo />
      </Link>
      <nav className="flex-1 space-y-5" aria-label="Seções">
        {groups.map((g) => (
          <div key={g}>
            <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{g}</div>
            <ul className="space-y-0.5">
              {NAV.filter((n) => n.group === g).map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    end={n.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'group flex h-10 items-center gap-3 rounded-full px-3 text-[13.5px] font-medium transition',
                        isActive ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:bg-surface/60 hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <n.icon size={18} className={isActive ? 'text-brand' : 'text-ink-3 group-hover:text-ink-2'} />
                        <span className="flex-1">{n.label}</span>
                        {n.to === '/avisos' && alerts > 0 && (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1.5 text-[11px] font-bold text-white">{alerts}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-6 flex items-center gap-2.5 rounded-2xl bg-surface p-2.5 shadow-card">
        <Avatar name={settings.ownerName || settings.storeName} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-ink">{settings.ownerName || 'Lojista'}</div>
          <div className="truncate text-xs text-ink-3">{settings.storeName}</div>
        </div>
        <Link to="/ajustes" aria-label="Ajustes" title="Ajustes" className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
          <Settings size={17} />
        </Link>
      </div>
    </aside>
  )
}

/* ───────── Navegação do celular ───────── */

/** Barra flutuante em vidro (referência mobile.png): início · produtos · seções (centro) · Nova IA · ações rápidas */
function MobileNav() {
  const { pathname } = useLocation()
  const setMenu = useUI((s) => s.setMenu)
  const setActions = useUI((s) => s.setActions)
  const menuOpen = useUI((s) => s.menuOpen)
  const actionsOpen = useUI((s) => s.actionsOpen)
  const sheet = menuOpen || actionsOpen
  const base = 'grid h-12 w-12 place-items-center rounded-full transition active:scale-95'
  const item = (to: string, label: string, icon: React.ReactNode) => {
    const active = !sheet && (to === '/' ? pathname === '/' : pathname.startsWith(to))
    return (
      <Link
        to={to} aria-label={label} aria-current={active ? 'page' : undefined}
        className={cn(base, active ? 'bg-ink text-surface shadow-md' : 'text-ink-2')}
      >
        {icon}
      </Link>
    )
  }
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      aria-label="Navegação principal"
    >
      <div className="glass-strong flex items-center gap-1.5 rounded-full p-2">
        {item('/', 'Início', <House size={20} />)}
        {item('/produtos', 'Produtos', <Shirt size={20} />)}
        <button
          type="button" onClick={() => setMenu(!menuOpen)} aria-label="Menu de seções" aria-expanded={menuOpen}
          className={cn(base, 'shadow-md', menuOpen ? 'bg-ink text-surface' : 'bg-brand text-white')}
        >
          <LayoutGrid size={21} />
        </button>
        {item('/ia', 'Nova IA', <Sparkles size={20} />)}
        <button
          type="button" onClick={() => setActions(!actionsOpen)} aria-label="Ações rápidas" aria-expanded={actionsOpen}
          className={cn(base, actionsOpen ? 'bg-ink text-surface shadow-md' : 'text-ink-2')}
        >
          <Zap size={20} />
        </button>
      </div>
    </nav>
  )
}

/** Linha-cartão com seta em círculo escuro (referência mobile.png) */
function RowCard({ icon, title, text, onClick, badge }: { icon: React.ReactNode; title: string; text?: string; onClick: () => void; badge?: number }) {
  return (
    <button
      type="button" onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[22px] bg-surface p-2.5 text-left shadow-card transition active:scale-[0.99]"
    >
      <span className="key-tile relative h-12 w-12 shrink-0 text-brand">
        {icon}
        {!!badge && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1 text-[11px] font-bold text-white">{badge}</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">{title}</span>
        {text && <span className="block truncate text-xs text-ink-3">{text}</span>}
      </span>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-surface"><ChevronRight size={16} /></span>
    </button>
  )
}

/** Botão do centro: as seções do app */
const SECTION_ORDER = ['/gestao', '/financeiro', '/relatorios', '/estoque', '/avisos', '/catalogo', '/fornecedores', '/equipe']

function MenuSheet({ alerts }: { alerts: number }) {
  const open = useUI((s) => s.menuOpen)
  const setMenu = useUI((s) => s.setMenu)
  const navigate = useNavigate()
  const go = (to: string) => {
    setMenu(false)
    navigate(to)
  }
  const sections = SECTION_ORDER.flatMap((to) => NAV.find((n) => n.to === to) ?? [])
  return (
    <Modal open={open} onClose={() => setMenu(false)} title="Seções" subtitle="Para onde você quer ir?">
      <div className="grid grid-cols-2 gap-2.5">
        {sections.map((n) => (
          <button
            key={n.to} type="button" onClick={() => go(n.to)}
            className="relative flex flex-col items-start gap-3 rounded-[22px] bg-surface-2 p-3.5 text-left transition active:scale-[0.98]"
          >
            <span className="key-tile h-12 w-12 text-brand"><n.icon size={20} /></span>
            <span className="text-[14px] font-semibold leading-tight text-ink">{n.label}</span>
            {n.to === '/avisos' && alerts > 0 && (
              <span className="absolute right-3 top-3 grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1.5 text-[11px] font-bold text-white">{alerts}</span>
            )}
          </button>
        ))}
      </div>
    </Modal>
  )
}

/** Último botão: ações rápidas (antes, "todas as seções") */
function ActionsSheet() {
  const open = useUI((s) => s.actionsOpen)
  const setActions = useUI((s) => s.setActions)
  const openSale = useUI((s) => s.openSale)
  const openStockMove = useUI((s) => s.openStockMove)
  const cartPieces = useUI((s) => s.cart.reduce((a, i) => a + i.qty, 0))
  const navigate = useNavigate()
  const go = (to: string) => {
    setActions(false)
    navigate(to)
  }
  return (
    <Modal open={open} onClose={() => setActions(false)} title="Ações rápidas" subtitle="O que você quer fazer agora?">
      <div className="space-y-2.5">
        <RowCard icon={<Plus size={20} />} title="Nova venda" text={cartPieces ? `${plural(cartPieces, 'peça', 'peças')} no carrinho` : 'Escolha as peças e registre'} onClick={openSale} />
        <RowCard icon={<Shirt size={19} />} title="Novo produto" text="Cadastre com fotos, tamanhos e preço" onClick={() => go('/produtos?novo=1')} />
        <RowCard icon={<PackagePlus size={19} />} title="Entrada de estoque" text="Chegou mercadoria? Dê entrada" onClick={() => openStockMove()} />
        <RowCard icon={<BookImage size={19} />} title="Enviar catálogo" text="Catálogos e peças avulsas para o cliente" onClick={() => go('/catalogo')} />
        <RowCard icon={<Truck size={19} />} title="Novo fornecedor" text="Salve contato e preço médio por peça" onClick={() => go('/fornecedores?novo=1')} />
        <RowCard icon={<Settings size={19} />} title="Ajustes" text="Loja, aparência e seus dados" onClick={() => go('/ajustes')} />
      </div>
    </Modal>
  )
}

/** Escolha de tamanho ao tocar no carrinho de um produto com vários tamanhos */
function CartPicker() {
  const id = useUI((s) => s.cartPicker)
  const close = useUI((s) => s.closeCartPicker)
  const addToCart = useUI((s) => s.addToCart)
  const cart = useUI((s) => s.cart)
  const product = useStore((s) => s.products.find((p) => p.id === id))
  const catNames = useCategoryNames()
  if (!product) return <Modal open={false} onClose={close} title="">{null}</Modal>
  return (
    <Modal open onClose={close} size="sm" title="Qual tamanho?" subtitle="Toque quantas vezes precisar. Depois é só finalizar a venda.">
      <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-2.5">
        <ProductThumb product={product} categoryName={catNames.get(product.categoryId)} className="h-14 w-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-ink">{product.name}</div>
          <div className="text-xs text-ink-3">{code(product.code)}</div>
        </div>
        <div className="text-[15px] font-semibold tabular-nums text-ink">{brl(product.price)}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {product.sizes.map((s) => {
          const inCart = cart.find((i) => i.productId === product.id && i.size === s.size)?.qty ?? 0
          const left = s.qty - inCart
          return (
            <button
              key={s.size} type="button" disabled={left <= 0} onClick={() => addToCart(product.id, s.size)}
              className={cn(
                'flex h-12 min-w-16 flex-col items-center justify-center rounded-2xl border px-3 text-[14px] font-semibold leading-none transition active:scale-95 disabled:opacity-35',
                inCart > 0 ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:border-brand',
              )}
            >
              {s.size}
              <span className={cn('mt-1 text-[10px] font-medium', inCart > 0 ? 'text-white/80' : 'text-ink-3')}>
                {inCart > 0 ? `${inCart} no carrinho` : `${s.qty} em estoque`}
              </span>
            </button>
          )
        })}
      </div>
      <Button variant="brand" full className="mt-5" onClick={close}>Pronto</Button>
    </Modal>
  )
}

/** Pílula em vidro com o carrinho em andamento: dá para continuar navegando e finalizar depois */
function CartBar() {
  const cart = useUI((s) => s.cart)
  const saleOpen = useUI((s) => s.saleOpen)
  const openSale = useUI((s) => s.openSale)
  const clearCart = useUI((s) => s.clearCart)
  const pieces = cart.reduce((a, i) => a + i.qty, 0)
  const total = cart.reduce((a, i) => a + i.qty * i.price, 0)
  if (!pieces || saleOpen) return null
  return (
    <div className="no-print fixed inset-x-0 bottom-[5.25rem] z-30 flex justify-center px-4 lg:bottom-6 lg:left-[248px]">
      <div className="glass-strong flex animate-rise items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5">
        <ShoppingCart size={17} className="text-brand" />
        <span className="text-[13px] font-semibold text-ink">{plural(pieces, 'peça', 'peças')}</span>
        <span className="text-[13px] tabular-nums text-ink-2">· {brl(total)}</span>
        <button type="button" onClick={clearCart} aria-label="Esvaziar carrinho" className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-bad-ink">
          <Trash2 size={15} />
        </button>
        <button type="button" onClick={openSale} className="h-10 rounded-full bg-ink px-4 text-[13px] font-semibold text-surface">
          Finalizar venda
        </button>
      </div>
    </div>
  )
}

/* ───────── Painel da assistente (desktop) ───────── */

function AIDrawer() {
  const open = useUI((s) => s.aiOpen)
  const setAI = useUI((s) => s.setAI)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAI(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setAI])
  if (!open) return null
  return (
    <div className="no-print fixed inset-0 z-40">
      <div className="absolute inset-0 animate-fade bg-black/25" onClick={() => setAI(false)} aria-hidden />
      <aside
        role="dialog" aria-label="Nova IA"
        className="absolute bottom-3 right-3 top-3 flex w-[410px] max-w-[calc(100vw-1.5rem)] animate-slide flex-col overflow-hidden rounded-[28px] bg-surface shadow-2xl ring-1 ring-line"
      >
        <ChatHeader onClose={() => setAI(false)} />
        <Chat onNavigate={() => setAI(false)} />
      </aside>
    </div>
  )
}

/* ───────── Estrutura ───────── */

export function Shell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const desktop = useIsDesktop()
  const settings = useStore((s) => s.settings)
  const alerts = useAlerts().length
  const openSale = useUI((s) => s.openSale)
  const setAI = useUI((s) => s.setAI)

  const home = pathname === '/'
  const nav = navFor(pathname)
  const title = home
    ? `${greeting()}${settings.ownerName ? `, ${firstName(settings.ownerName)}` : ''}!`
    : pathname.startsWith('/ajustes') ? 'Ajustes' : nav?.title ?? 'ALLNOVA'
  const subtitle = home
    ? `Veja como está a ${settings.storeName} hoje.`
    : pathname.startsWith('/ajustes') ? 'Loja, aparência e seus dados.' : nav?.subtitle

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = home ? 'ALLNOVA' : `${pathname.startsWith('/ajustes') ? 'Ajustes' : nav?.label ?? ''} · ALLNOVA`
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const openAI = () => (desktop && pathname !== '/ia' ? setAI(true) : navigate('/ia'))

  return (
    <div className="min-h-dvh text-ink">
      <div className="app-backdrop" aria-hidden />
      <Sidebar alerts={alerts} />

      <div className="lg:pl-[248px]">
        {/* Cabeçalho desktop */}
        <header className="no-print hidden items-center justify-between gap-6 px-8 pb-5 pt-7 lg:flex">
          <div className="min-w-0">
            <h1 className="truncate text-[28px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-0.5 truncate text-[13px] text-ink-2">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <SearchBox className="w-72 xl:w-80" />
            <ThemeButton variant="outline" />
            <IconButton label={alerts ? `${alerts} avisos de reposição` : 'Avisos de reposição'} variant="outline" onClick={() => navigate('/avisos')}>
              <Bell size={18} />
              {alerts > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-bad ring-2 ring-surface" />}
            </IconButton>
            <Button variant="outline" icon={<Sparkles size={16} className="text-brand" />} onClick={openAI}>Nova IA</Button>
            <Button icon={<Plus size={17} />} onClick={openSale}>Nova venda</Button>
          </div>
        </header>

        {/* Cabeçalho das telas internas no celular (a Início tem o seu próprio) */}
        {!home && (
          <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--glass-line)] bg-[var(--glass)] px-4 py-3 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
            <IconButton label="Voltar ao início" variant="outline" onClick={() => navigate(pathname.startsWith('/catalogo/') ? '/catalogo' : '/')}>
              <ArrowLeft size={18} />
            </IconButton>
            <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold text-ink">{title}</h1>
            <IconButton label="Nova IA" variant="outline" onClick={openAI} className={cn(pathname === '/ia' && 'invisible')}>
              <Sparkles size={18} className="text-brand" />
            </IconButton>
          </header>
        )}

        <main className={cn('mx-auto max-w-[1440px] pb-28 lg:px-8 lg:pb-10', home ? '' : 'px-4')}>
          <Outlet />
        </main>
      </div>

      <MobileNav />
      <MenuSheet alerts={alerts} />
      <ActionsSheet />
      <CartBar />
      <CartPicker />
      <AIDrawer />
      <SaleModal />
      <StockMoveModal />
      <ConfirmHost />
      <Toasts />
    </div>
  )
}
