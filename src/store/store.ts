import { create } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import { del as idbDel, get as idbGet, set as idbSet } from 'idb-keyval'
import type {
  Catalog, Category, Data, Employee, Expense, ID, MoveType, Payment, Product, Sale, SaleItem, Settings, StockMove,
  Supplier,
} from '../types'
import { uid } from '../lib/format'
import { buildDemo, defaultSettings, emptyData } from './seed'

export interface SaleInput {
  items: SaleItem[]
  discount: number
  payment: Payment
  employeeId?: ID
  customer?: string
}

interface Actions {
  /* produtos e categorias */
  addProduct: (p: Omit<Product, 'id' | 'code' | 'createdAt'>) => Product
  updateProduct: (id: ID, patch: Partial<Product>) => void
  removeProduct: (id: ID) => void
  addCategory: (name: string) => Category
  renameCategory: (id: ID, name: string) => void
  removeCategory: (id: ID) => boolean
  /* vendas */
  addSale: (input: SaleInput) => Sale
  removeSale: (id: ID) => void
  /* estoque */
  moveStock: (productId: ID, type: MoveType, values: Record<string, number>, note?: string) => void
  setOrdered: (productId: ID, ordered: boolean) => void
  /* financeiro */
  saveExpense: (e: Omit<Expense, 'id'> & { id?: ID }) => void
  removeExpense: (id: ID) => void
  setGoal: (monthKey: string, value: number, asDefault?: boolean) => void
  /* fornecedores, equipe, catálogos */
  saveSupplier: (s: Omit<Supplier, 'id'> & { id?: ID }) => void
  removeSupplier: (id: ID) => void
  saveEmployee: (e: Omit<Employee, 'id'> & { id?: ID }) => void
  removeEmployee: (id: ID) => void
  saveCatalog: (c: Omit<Catalog, 'id' | 'createdAt'> & { id?: ID }) => Catalog
  removeCatalog: (id: ID) => void
  /* geral */
  updateSettings: (patch: Partial<Settings>) => void
  loadDemo: () => void
  wipe: () => void
  importData: (data: Data) => void
}

export type Store = Data & Actions

const DATA_KEYS: (keyof Data)[] = [
  'categories', 'products', 'sales', 'moves', 'expenses', 'suppliers', 'employees', 'catalogs', 'settings', 'ordered',
]

export const pickData = (s: Store): Data => {
  const out = {} as Record<string, unknown>
  for (const k of DATA_KEYS) out[k] = s[k]
  return out as unknown as Data
}

/* Persistência em IndexedDB (aguenta fotos; localStorage estouraria em poucos produtos) */
let pending: { name: string; value: StorageValue<Data> } | null = null
let timer: ReturnType<typeof setTimeout> | undefined
const flush = () => {
  if (!pending) return
  const { name, value } = pending
  pending = null
  idbSet(name, value).catch((err) => console.error('Falha ao salvar os dados', err))
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush())
}

const storage: PersistStorage<Data> = {
  getItem: async (name) => (await idbGet<StorageValue<Data>>(name)) ?? null,
  setItem: (name, value) => {
    pending = { name, value }
    clearTimeout(timer)
    timer = setTimeout(flush, 250)
  },
  removeItem: (name) => idbDel(name),
}

const mirrorTheme = (theme: Settings['theme']) => {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('allnova-theme', theme)
  } catch {
    /* modo privado: segue sem lembrar o tema */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f0d15' : '#f3f2f8')
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...emptyData(),

      addProduct: (p) => {
        const code = get().products.reduce((m, x) => Math.max(m, x.code), 0) + 1
        const product: Product = { ...p, id: uid(), code, createdAt: Date.now() }
        set((s) => ({ products: [...s.products, product] }))
        return product
      },
      updateProduct: (id, patch) =>
        set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removeProduct: (id) =>
        set((s) => {
          const ordered = { ...s.ordered }
          delete ordered[id]
          return {
            products: s.products.filter((p) => p.id !== id),
            catalogs: s.catalogs.map((c) => ({ ...c, productIds: c.productIds.filter((x) => x !== id) })),
            ordered,
          }
        }),

      addCategory: (name) => {
        const category: Category = { id: uid(), name: name.trim() }
        set((s) => ({ categories: [...s.categories, category] }))
        return category
      },
      renameCategory: (id, name) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)) })),
      removeCategory: (id) => {
        if (get().products.some((p) => p.categoryId === id)) return false
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))
        return true
      },

      addSale: (input) => {
        const gross = input.items.reduce((a, i) => a + i.price * i.qty, 0)
        const discount = Math.min(Math.max(0, input.discount || 0), gross)
        const sale: Sale = {
          id: uid(),
          ts: Date.now(),
          items: input.items,
          discount,
          total: Math.round((gross - discount) * 100) / 100,
          payment: input.payment,
          employeeId: input.employeeId || undefined,
          customer: input.customer?.trim() || undefined,
        }
        set((s) => {
          // baixa o estoque por produto/tamanho e registra a saída no histórico de movimentações
          const moves: StockMove[] = []
          const products = s.products.map((p) => {
            const mine = input.items.filter((i) => i.productId === p.id)
            if (!mine.length) return p
            const changes: StockMove['changes'] = []
            const sizes = p.sizes.map((sz) => {
              const q = mine.filter((i) => i.size === sz.size).reduce((a, i) => a + i.qty, 0)
              if (!q) return sz
              const next = Math.max(0, sz.qty - q)
              if (next !== sz.qty) changes.push({ size: sz.size, delta: next - sz.qty })
              return { ...sz, qty: next }
            })
            if (changes.length) {
              moves.push({ id: uid(), ts: sale.ts, productId: p.id, productName: p.name, type: 'saida', changes, note: 'Venda' })
            }
            return { ...p, sizes }
          })
          return { sales: [...s.sales, sale], products, moves: [...moves, ...s.moves].slice(0, 300) }
        })
        return sale
      },
      removeSale: (id) =>
        set((s) => {
          const sale = s.sales.find((x) => x.id === id)
          if (!sale) return {}
          const moves: StockMove[] = []
          // devolve as peças ao estoque
          const products = s.products.map((p) => {
            const mine = sale.items.filter((i) => i.productId === p.id)
            if (!mine.length) return p
            const changes: StockMove['changes'] = []
            const sizes = p.sizes.map((sz) => {
              const q = mine.filter((i) => i.size === sz.size).reduce((a, i) => a + i.qty, 0)
              if (!q) return sz
              changes.push({ size: sz.size, delta: q })
              return { ...sz, qty: sz.qty + q }
            })
            if (changes.length) {
              moves.push({ id: uid(), ts: Date.now(), productId: p.id, productName: p.name, type: 'entrada', changes, note: 'Venda excluída' })
            }
            return { ...p, sizes }
          })
          return { sales: s.sales.filter((x) => x.id !== id), products, moves: [...moves, ...s.moves].slice(0, 300) }
        }),

      moveStock: (productId, type, values, note) =>
        set((s) => {
          const product = s.products.find((p) => p.id === productId)
          if (!product) return {}
          const changes: StockMove['changes'] = []
          const sizes = product.sizes.map((sz) => {
            const v = values[sz.size]
            if (v === undefined || Number.isNaN(v)) return sz
            const next = Math.max(0, type === 'entrada' ? sz.qty + v : type === 'saida' ? sz.qty - v : v)
            if (next !== sz.qty) changes.push({ size: sz.size, delta: next - sz.qty })
            return { ...sz, qty: next }
          })
          if (!changes.length) return {}
          const move: StockMove = {
            id: uid(), ts: Date.now(), productId, productName: product.name, type, changes, note: note?.trim() || undefined,
          }
          const ordered = { ...s.ordered }
          if (type === 'entrada') delete ordered[productId]
          return {
            products: s.products.map((p) => (p.id === productId ? { ...p, sizes } : p)),
            moves: [move, ...s.moves].slice(0, 300),
            ordered,
          }
        }),
      setOrdered: (productId, on) =>
        set((s) => {
          const ordered = { ...s.ordered }
          if (on) ordered[productId] = Date.now()
          else delete ordered[productId]
          return { ordered }
        }),

      saveExpense: (e) =>
        set((s) => ({
          expenses: e.id
            ? s.expenses.map((x) => (x.id === e.id ? { ...x, ...e, id: x.id } : x))
            : [...s.expenses, { ...e, id: uid() }],
        })),
      removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),
      setGoal: (monthKey, value, asDefault) =>
        set((s) => ({
          settings: {
            ...s.settings,
            goals: { ...s.settings.goals, [monthKey]: value },
            defaultGoal: asDefault || !s.settings.defaultGoal ? value : s.settings.defaultGoal,
          },
        })),

      saveSupplier: (sp) =>
        set((s) => ({
          suppliers: sp.id
            ? s.suppliers.map((x) => (x.id === sp.id ? { ...x, ...sp, id: x.id } : x))
            : [...s.suppliers, { ...sp, id: uid() }],
        })),
      removeSupplier: (id) =>
        set((s) => ({
          suppliers: s.suppliers.filter((x) => x.id !== id),
          products: s.products.map((p) => (p.supplierId === id ? { ...p, supplierId: undefined } : p)),
        })),

      saveEmployee: (e) =>
        set((s) => ({
          employees: e.id
            ? s.employees.map((x) => (x.id === e.id ? { ...x, ...e, id: x.id } : x))
            : [...s.employees, { ...e, id: uid() }],
        })),
      removeEmployee: (id) => set((s) => ({ employees: s.employees.filter((x) => x.id !== id) })),

      saveCatalog: (c) => {
        const existing = c.id ? get().catalogs.find((x) => x.id === c.id) : undefined
        const catalog: Catalog = existing
          ? { ...existing, ...c, id: existing.id }
          : { ...c, id: uid(), createdAt: Date.now() }
        set((s) => ({
          catalogs: existing ? s.catalogs.map((x) => (x.id === catalog.id ? catalog : x)) : [catalog, ...s.catalogs],
        }))
        return catalog
      },
      removeCatalog: (id) => set((s) => ({ catalogs: s.catalogs.filter((x) => x.id !== id) })),

      updateSettings: (patch) => {
        if (patch.theme) mirrorTheme(patch.theme)
        set((s) => ({ settings: { ...s.settings, ...patch } }))
      },
      loadDemo: () => set((s) => buildDemo({ ...s.settings, onboarded: true })),
      wipe: () => set((s) => emptyData({ ...s.settings, goals: {}, onboarded: true })),
      importData: (data) => {
        const base = emptyData()
        const merged = { ...base, ...data, settings: { ...defaultSettings(), ...data.settings, onboarded: true } }
        mirrorTheme(merged.settings.theme)
        set(merged)
      },
    }),
    {
      name: 'allnova-v1',
      version: 1,
      storage,
      partialize: (s) => pickData(s),
      onRehydrateStorage: () => (state) => {
        if (state) mirrorTheme(state.settings.theme)
      },
    },
  ),
)

/** Grava imediatamente (usado antes de recarregar a página) */
export const flushStore = flush
