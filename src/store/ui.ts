import { create } from 'zustand'
import type { ID, SaleItem } from '../types'
import { useStore } from './store'

export interface Toast {
  id: number
  text: string
  tone: 'good' | 'bad' | 'neutral'
}

export interface ConfirmOptions {
  title: string
  text?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
}

interface UI {
  saleOpen: boolean
  aiOpen: boolean
  /** Menu de seções (botão do centro no celular) */
  menuOpen: boolean
  /** Menu de ações rápidas (último botão no celular) */
  actionsOpen: boolean
  /** Modal de movimentação de estoque (com produto pré-selecionado, se houver) */
  stockMove: { productId?: ID } | null
  /** Carrinho da venda em andamento: dá para ir juntando peças e finalizar depois */
  cart: SaleItem[]
  /** Produto cujo tamanho está sendo escolhido para entrar no carrinho */
  cartPicker: ID | null
  toasts: Toast[]
  confirm: ConfirmOptions | null
  openSale: () => void
  closeSale: () => void
  setAI: (open: boolean) => void
  setMenu: (open: boolean) => void
  setActions: (open: boolean) => void
  openStockMove: (productId?: ID) => void
  closeStockMove: () => void
  /** Põe 1 peça no carrinho. Devolve false quando não há mais estoque daquele tamanho. */
  addToCart: (productId: ID, size: string) => boolean
  /** Entrada do botão de carrinho dos produtos: adiciona direto se só há um tamanho, senão pergunta o tamanho */
  quickAdd: (productId: ID) => void
  changeCart: (productId: ID, size: string, by: number) => void
  clearCart: () => void
  closeCartPicker: () => void
  toast: (text: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
  ask: (options: ConfirmOptions) => void
  closeConfirm: () => void
}

let toastId = 0

export const useUI = create<UI>((set, get) => ({
  saleOpen: false,
  aiOpen: false,
  menuOpen: false,
  actionsOpen: false,
  stockMove: null,
  cart: [],
  cartPicker: null,
  toasts: [],
  confirm: null,
  openSale: () => set({ saleOpen: true, menuOpen: false, actionsOpen: false, cartPicker: null }),
  closeSale: () => set({ saleOpen: false }),
  setAI: (aiOpen) => set({ aiOpen, menuOpen: false, actionsOpen: false }),
  setMenu: (menuOpen) => set({ menuOpen, actionsOpen: false }),
  setActions: (actionsOpen) => set({ actionsOpen, menuOpen: false }),
  openStockMove: (productId) => set({ stockMove: { productId }, menuOpen: false, actionsOpen: false }),
  closeStockMove: () => set({ stockMove: null }),

  addToCart: (productId, size) => {
    const product = useStore.getState().products.find((p) => p.id === productId)
    if (!product) return false
    const have = product.sizes.find((s) => s.size === size)?.qty ?? 0
    const inCart = get().cart.find((i) => i.productId === productId && i.size === size)?.qty ?? 0
    if (inCart >= have) return false
    set((s) => ({
      cart: inCart
        ? s.cart.map((i) => (i.productId === productId && i.size === size ? { ...i, qty: i.qty + 1 } : i))
        : [...s.cart, { productId, name: product.name, categoryId: product.categoryId, size, qty: 1, price: product.price, cost: product.cost }],
    }))
    return true
  },
  quickAdd: (productId) => {
    const product = useStore.getState().products.find((p) => p.id === productId)
    if (!product) return
    const available = product.sizes.filter((s) => s.qty > 0)
    if (available.length === 0) {
      get().toast('Esse produto está sem estoque', 'bad')
      return
    }
    if (product.sizes.length === 1) {
      const ok = get().addToCart(productId, available[0].size)
      get().toast(ok ? `${product.name} no carrinho` : 'Não há mais peças desse tamanho', ok ? 'good' : 'bad')
      return
    }
    set({ cartPicker: productId })
  },
  changeCart: (productId, size, by) => {
    if (by > 0) {
      get().addToCart(productId, size)
      return
    }
    set((s) => ({
      cart: s.cart.flatMap((i) =>
        i.productId !== productId || i.size !== size ? [i] : i.qty + by <= 0 ? [] : [{ ...i, qty: i.qty + by }],
      ),
    }))
  },
  clearCart: () => set({ cart: [] }),
  closeCartPicker: () => set({ cartPicker: null }),

  toast: (text, tone = 'good') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }))
    setTimeout(() => get().dismissToast(id), 3200)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  ask: (confirm) => set({ confirm }),
  closeConfirm: () => set({ confirm: null }),
}))

export const toast = (text: string, tone?: Toast['tone']) => useUI.getState().toast(text, tone)
