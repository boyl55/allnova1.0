import { useState } from 'react'
import { ChartColumn, Package, Sparkles } from 'lucide-react'
import { useStore } from '../store/store'
import { LogoMark, Wordmark } from './Logo'
import { Button, Field, Input } from './ui'

/** Primeira abertura: nome do lojista, nome da loja e como começar */
export function Welcome() {
  const update = useStore((s) => s.updateSettings)
  const loadDemo = useStore((s) => s.loadDemo)
  const [owner, setOwner] = useState('')
  const [store, setStore] = useState('')

  const start = (demo: boolean) => {
    update({ ownerName: owner.trim(), storeName: store.trim() || 'Minha Loja', onboarded: true })
    if (demo) loadDemo()
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={76} />
          <Wordmark className="mt-4 text-[30px] leading-none" />
          <p className="mt-3 text-sm text-ink-2">A gestão completa da sua loja de moda, em um só lugar.</p>
        </div>

        <form
          className="rounded-[28px] bg-surface p-6 shadow-card"
          onSubmit={(e) => {
            e.preventDefault()
            start(true)
          }}
        >
          <div className="space-y-4">
            <Field label="Como podemos te chamar?">
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Seu nome" autoComplete="given-name" autoFocus />
            </Field>
            <Field label="Nome da loja">
              <Input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Ex.: Ateliê Central" autoComplete="organization" />
            </Field>
          </div>

          <ul className="my-6 space-y-2.5 text-[13px] text-ink-2">
            <li className="flex items-center gap-2.5"><Package size={16} className="text-brand" /> Produtos, estoque por tamanho e avisos de reposição</li>
            <li className="flex items-center gap-2.5"><ChartColumn size={16} className="text-brand" /> Financeiro, metas e relatórios semanais e mensais</li>
            <li className="flex items-center gap-2.5"><Sparkles size={16} className="text-brand" /> Nova IA, que analisa os dados da sua própria loja</li>
          </ul>

          <div className="space-y-2.5">
            <Button type="submit" variant="brand" full>Explorar com uma loja de demonstração</Button>
            <Button variant="outline" full onClick={() => start(false)}>Começar com a loja vazia</Button>
          </div>
          <p className="mt-4 text-center text-xs text-ink-3">
            Seus dados ficam salvos neste aparelho. Você pode trocar entre demonstração e loja vazia depois, em Ajustes.
          </p>
        </form>
      </div>
    </div>
  )
}
