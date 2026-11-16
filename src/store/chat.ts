import { create } from 'zustand'
import { answer, scopeOf, type AIAnswer, type AIScope } from '../lib/ai'
import { pickData, useStore } from './store'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  answer?: AIAnswer
  scope?: AIScope
  pending?: boolean
}

interface Chat {
  messages: ChatMessage[]
  busy: boolean
  send: (question: string) => Promise<void>
  reset: () => void
}

let nextId = 0
let generation = 0

export const useChat = create<Chat>((set, get) => ({
  messages: [],
  busy: false,
  reset: () => {
    generation++
    set({ messages: [], busy: false })
  },
  send: async (question) => {
    const text = question.trim()
    if (!text || get().busy) return
    const gen = generation
    const data = pickData(useStore.getState())
    const userMsg: ChatMessage = { id: ++nextId, role: 'user', text }
    const pendingMsg: ChatMessage = { id: ++nextId, role: 'assistant', text: '', pending: true, scope: scopeOf(data) }
    set((s) => ({ messages: [...s.messages, userMsg, pendingMsg], busy: true }))

    const result = answer(text, data)
    // a análise é instantânea; a pausa curta deixa as etapas visíveis
    await new Promise((r) => setTimeout(r, 950))
    if (gen !== generation) return
    set((s) => ({
      busy: false,
      messages: s.messages.map((m) => (m.id === pendingMsg.id ? { ...m, pending: false, text: result.text, answer: result } : m)),
    }))
  },
}))
