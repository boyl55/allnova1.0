import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUp, ArrowUpRight, Check, ChevronDown, Copy, Database, LoaderCircle, SquarePen, X } from 'lucide-react'
import { stepsOf, SUGGESTIONS, type AICard } from '../lib/ai'
import { MONTHS_FULL } from '../lib/dates'
import { num } from '../lib/format'
import { copyText } from '../lib/image'
import { useChat, type ChatMessage } from '../store/chat'
import { useStore } from '../store/store'
import { toast } from '../store/ui'
import { LogoMark } from './Logo'
import { Badge, Button, cn, IconButton } from './ui'

/* Texto com **negrito** e listas simples */
function inline(s: string): ReactNode[] {
  return s.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 ? <strong key={i} className="font-semibold text-ink">{part}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}

function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    const L = list
    const items = L.items.map((it, i) => <li key={i}>{inline(it)}</li>)
    blocks.push(
      L.ordered
        ? <ol key={blocks.length} className="list-decimal space-y-1 pl-5">{items}</ol>
        : <ul key={blocks.length} className="list-disc space-y-1 pl-5 marker:text-ink-3">{items}</ul>,
    )
    list = null
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const bullet = line.match(/^[-•]\s+(.*)$/)
    const numbered = line.match(/^\d+[.)]\s+(.*)$/)
    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      if (!list || list.ordered !== ordered) {
        flush()
        list = { ordered, items: [] }
      }
      list.items.push((bullet ?? numbered)![1])
    } else {
      flush()
      blocks.push(<p key={blocks.length}>{inline(line)}</p>)
    }
  }
  flush()
  return <div className="space-y-2 text-[13.5px] leading-relaxed text-ink-2">{blocks}</div>
}

function StatCard({ card }: { card: AICard }) {
  const toneClass = card.tone === 'good' ? 'text-good-ink' : card.tone === 'bad' ? 'text-bad-ink' : 'text-ink-3'
  return (
    <div className={cn('min-w-0 rounded-2xl border p-3', card.highlight ? 'border-transparent bg-brand-soft' : 'border-line bg-surface')}>
      <div className={cn('truncate text-xs', card.highlight ? 'font-medium text-brand-ink' : 'text-ink-2')}>{card.label}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-lg font-semibold leading-tight tracking-tight text-ink">{card.value}</span>
        {card.delta && <span className={cn('text-xs font-medium', toneClass)}>{card.delta}</span>}
      </div>
    </div>
  )
}

function AssistantMessage({ message, last, onAsk, onNavigate }: {
  message: ChatMessage; last: boolean; onAsk: (q: string) => void; onNavigate?: () => void
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const steps = stepsOf(message.scope ?? { sales: 0, products: 0, expenses: 0 })

  useEffect(() => {
    if (!message.pending) return
    const t = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 320)
    return () => clearInterval(t)
  }, [message.pending, steps.length])

  const a = message.answer
  return (
    <div className="animate-fade space-y-3">
      <button
        type="button"
        onClick={() => !message.pending && setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-left text-xs text-ink-2"
        aria-expanded={open}
      >
        {message.pending
          ? <LoaderCircle size={15} className="shrink-0 animate-spin text-brand" />
          : <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-good text-white"><Check size={11} strokeWidth={3.5} /></span>}
        <span className="min-w-0 flex-1 truncate font-medium text-ink">
          {message.pending ? `${steps[step]}…` : `Analisei ${num(message.scope?.sales ?? 0)} vendas`}
        </span>
        {!message.pending && (
          <span className="flex shrink-0 items-center gap-1 text-ink-3">
            {steps.length} etapas <ChevronDown size={14} className={cn('transition', open && 'rotate-180')} />
          </span>
        )}
      </button>
      {open && !message.pending && (
        <ul className="space-y-1.5 pl-3 text-xs text-ink-2">
          {steps.map((s) => (
            <li key={s} className="flex items-center gap-2"><Check size={12} className="text-good" /> {s}</li>
          ))}
        </ul>
      )}

      {a && (
        <>
          <div className="flex gap-2.5">
            <LogoMark size={22} className="mt-0.5" />
            <div className="min-w-0 flex-1"><RichText text={a.text} /></div>
          </div>

          {a.cards.length > 0 && (
            <div>
              {a.cardsTitle && <div className="mb-2 text-[13px] font-semibold text-ink">{a.cardsTitle}</div>}
              <div className="grid grid-cols-2 gap-2">
                {a.cards.map((c, i) => <StatCard key={i} card={c} />)}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-ink-3">
            <Database size={12} />
            Fonte: dados da sua loja · {num(message.scope?.sales ?? 0)} vendas · estoque · despesas
          </div>

          <div className="flex gap-2">
            {a.action && (
              <Button
                className="flex-1" size="sm"
                onClick={() => {
                  navigate(a.action!.to)
                  onNavigate?.()
                }}
              >
                {a.action.label}
              </Button>
            )}
            <Button
              variant="outline" size="sm" icon={<Copy size={14} />}
              onClick={async () => toast((await copyText(a.text.replace(/\*\*/g, ''))) ? 'Resposta copiada' : 'Não foi possível copiar', 'good')}
            >
              Copiar
            </Button>
          </div>

          {last && a.followups.length > 0 && (
            <div className="pt-2">
              <div className="mb-1 text-xs text-ink-3">Continue perguntando</div>
              {a.followups.map((f) => <Suggestion key={f} text={f} onAsk={onAsk} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Suggestion({ text, onAsk }: { text: string; onAsk: (q: string) => void }) {
  return (
    <button
      type="button" onClick={() => onAsk(text)}
      className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-[13px] text-ink-2 transition hover:text-brand-ink"
    >
      <ArrowUpRight size={14} className="shrink-0 text-ink-3" />
      {text}
    </button>
  )
}

export function ChatHeader({ onClose }: { onClose?: () => void }) {
  const reset = useChat((s) => s.reset)
  const hasMessages = useChat((s) => s.messages.length > 0)
  return (
    <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
      <LogoMark size={26} />
      <span className="text-[15px] font-semibold text-ink">Nova IA</span>
      <Badge>Beta</Badge>
      <span className="flex-1" />
      <IconButton label="Nova conversa" variant="ghost" size="sm" onClick={reset} disabled={!hasMessages}>
        <SquarePen size={16} />
      </IconButton>
      {onClose && (
        <IconButton label="Fechar" variant="ghost" size="sm" onClick={onClose}>
          <X size={17} />
        </IconButton>
      )}
    </div>
  )
}

/** Conversa com a Nova. Usada no painel lateral (desktop) e na tela cheia (celular e /ia). */
export function Chat({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const messages = useChat((s) => s.messages)
  const busy = useChat((s) => s.busy)
  const send = useChat((s) => s.send)
  const owner = useStore((s) => s.settings.ownerName)
  const [text, setText] = useState('')
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const ask = (q: string) => {
    void send(q)
    setText('')
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div ref={scroller} className="thin-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-end">
            <div className="mb-6">
              <LogoMark size={44} />
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-ink">
                {owner ? `Oi, ${owner.split(' ')[0]}.` : 'Oi.'} O que você quer saber da loja?
              </h3>
              <p className="mt-1.5 text-[13px] text-ink-2">
                Eu analiso as vendas, o estoque e as despesas que você registrou aqui. Seus dados não saem deste aparelho.
              </p>
            </div>
            <div className="mb-1 text-xs text-ink-3">Experimente perguntar</div>
            {SUGGESTIONS.map((g) => <Suggestion key={g.group} text={g.items[0]} onAsk={ask} />)}
            <Suggestion text="Como está o mês?" onAsk={ask} />
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md border border-line bg-surface px-3.5 py-2.5 text-[13.5px] text-ink">{m.text}</div>
              </div>
            ) : (
              <AssistantMessage key={m.id} message={m} last={i === messages.length - 1} onAsk={ask} onNavigate={onNavigate} />
            ),
          )
        )}
      </div>

      <form
        className="p-3 pt-1"
        onSubmit={(e) => {
          e.preventDefault()
          ask(text)
        }}
      >
        <div className="rounded-2xl border border-line bg-surface p-2 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ask(text)
              }
            }}
            placeholder={messages.length ? 'Faça outra pergunta…' : 'Pergunte sobre estoque, financeiro ou vendas…'}
            aria-label="Pergunta para a Nova"
            className="block max-h-28 w-full resize-none bg-transparent px-2 py-1.5 text-base text-ink placeholder:text-ink-3 sm:text-sm"
          />
          <div className="flex items-center justify-between gap-2 pl-2">
            <span className="flex items-center gap-1.5 text-xs text-ink-3">
              <Database size={13} /> Dados da loja · {MONTHS_FULL[new Date().getMonth()]}
            </span>
            <button
              type="submit" disabled={!text.trim() || busy} aria-label="Enviar pergunta"
              className="grid h-8 w-8 place-items-center rounded-full bg-ink text-surface transition disabled:opacity-30"
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
