import { create } from 'zustand'
import type { ID } from '../types'

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
  menuOpen: boolean
  /** Modal de movimentação de estoque (com produto pré-selecionado, se houver) */
  stockMove: { productId?: ID } | null
  toasts: Toast[]
  confirm: ConfirmOptions | null
  openSale: () => void
  closeSale: () => void
  setAI: (open: boolean) => void
  setMenu: (open: boolean) => void
  openStockMove: (productId?: ID) => void
  closeStockMove: () => void
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
  stockMove: null,
  toasts: [],
  confirm: null,
  openSale: () => set({ saleOpen: true, menuOpen: false }),
  closeSale: () => set({ saleOpen: false }),
  setAI: (aiOpen) => set({ aiOpen, menuOpen: false }),
  setMenu: (menuOpen) => set({ menuOpen }),
  openStockMove: (productId) => set({ stockMove: { productId }, menuOpen: false }),
  closeStockMove: () => set({ stockMove: null }),
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
