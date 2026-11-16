import { ArrowUpRight, Database, ShieldCheck } from 'lucide-react'
import { SUGGESTIONS } from '../lib/ai'
import { num } from '../lib/format'
import { useChat } from '../store/chat'
import { useStore } from '../store/store'
import { Chat, ChatHeader } from '../components/Chat'
import { Card, CardHead } from '../components/ui'

export function IA() {
  const send = useChat((s) => s.send)
  const sales = useStore((s) => s.sales.length)
  const products = useStore((s) => s.products.length)
  const expenses = useStore((s) => s.expenses.length)
  const suppliers = useStore((s) => s.suppliers.filter((x) => x.kind === 'meu' || s.settings.vip).length)
  const employees = useStore((s) => s.employees.length)

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="flex h-[calc(100dvh-10.5rem)] flex-col overflow-hidden p-0 lg:col-span-8 lg:h-[calc(100dvh-9.5rem)]">
        <ChatHeader />
        <Chat />
      </Card>

      <div className="hidden space-y-4 lg:col-span-4 lg:block">
        <Card>
          <CardHead title="Pergunte por assunto" subtitle="Toque para enviar" />
          <div className="mt-4 space-y-4">
            {SUGGESTIONS.map((g) => (
              <div key={g.group}>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{g.group}</div>
                {g.items.map((q) => (
                  <button key={q} type="button" onClick={() => void send(q)} className="flex w-full items-center gap-2 rounded-lg py-1.5 text-left text-[13px] text-ink-2 hover:text-brand-ink">
                    <ArrowUpRight size={14} className="shrink-0 text-ink-3" /> {q}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead icon={<Database size={18} />} title="O que a Nova consulta" subtitle="Somente o que você cadastrou" />
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              ['Vendas', sales], ['Produtos', products], ['Despesas', expenses], ['Fornecedores', suppliers], ['Funcionários', employees],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dd className="text-lg font-semibold tracking-tight text-ink">{num(value as number)}</dd>
                <dt className="text-xs text-ink-3">{label}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-4 flex gap-2 rounded-2xl bg-surface-2 p-3 text-xs leading-relaxed text-ink-2">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand" />
            A análise é feita neste aparelho, em cima dos dados da sua loja. Nada é enviado para serviços externos.
          </p>
        </Card>
      </div>
    </div>
  )
}
