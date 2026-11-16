import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, Download, FlaskConical, HardDrive, Palette, Store, Trash2, Upload } from 'lucide-react'
import type { Data } from '../types'
import { dayKey } from '../lib/dates'
import { num } from '../lib/format'
import { download } from '../lib/image'
import { pickData, useStore } from '../store/store'
import { toast, useUI } from '../store/ui'
import { Badge, Button, Card, CardHead, Field, Input, Segmented } from '../components/ui'

export function Ajustes() {
  const settings = useStore((s) => s.settings)
  const update = useStore((s) => s.updateSettings)
  const loadDemo = useStore((s) => s.loadDemo)
  const wipe = useStore((s) => s.wipe)
  const importData = useStore((s) => s.importData)
  const productCount = useStore((s) => s.products.length)
  const saleCount = useStore((s) => s.sales.length)
  const ask = useUI((s) => s.ask)
  const fileRef = useRef<HTMLInputElement>(null)
  const [owner, setOwner] = useState(settings.ownerName)
  const [store, setStore] = useState(settings.storeName)
  useEffect(() => {
    setOwner(settings.ownerName)
    setStore(settings.storeName)
  }, [settings.ownerName, settings.storeName])

  const dirty = owner.trim() !== settings.ownerName || (store.trim() || 'Minha Loja') !== settings.storeName

  const exportBackup = () => {
    const data = pickData(useStore.getState())
    download(`allnova-backup-${dayKey(new Date())}.json`, JSON.stringify({ app: 'allnova', version: 1, data }), 'application/json')
    toast('Backup exportado')
  }

  const importBackup = async (file: File | undefined) => {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as { app?: string; data?: Data }
      const data = parsed.data
      if (parsed.app !== 'allnova' || !data || !Array.isArray(data.products) || !Array.isArray(data.sales) || !data.settings) {
        throw new Error('formato')
      }
      ask({
        title: 'Restaurar este backup?',
        text: `O arquivo tem ${num(data.products.length)} produtos e ${num(data.sales.length)} vendas. Os dados atuais deste aparelho serão substituídos.`,
        confirmLabel: 'Restaurar backup',
        onConfirm: () => {
          importData(data)
          toast('Backup restaurado')
        },
      })
    } catch {
      toast('Este arquivo não é um backup da ALLNOVA', 'bad')
    }
  }

  return (
    <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
      <Card>
        <CardHead icon={<Store size={18} />} title="Loja" subtitle="Como você e a loja aparecem no aplicativo" />
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            update({ ownerName: owner.trim(), storeName: store.trim() || 'Minha Loja' })
            toast('Dados da loja salvos')
          }}
        >
          <Field label="Seu nome"><Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Seu nome" /></Field>
          <Field label="Nome da loja" hint="Aparece nos catálogos e nas mensagens aos fornecedores."><Input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Nome da loja" /></Field>
          <Button type="submit" variant="brand" disabled={!dirty}>Salvar</Button>
        </form>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHead icon={<Palette size={18} />} title="Aparência" subtitle="Tema do aplicativo" />
          <Segmented
            className="mt-5" label="Tema" value={settings.theme} onChange={(theme) => update({ theme })}
            options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]}
          />
        </Card>

        <Card>
          <CardHead
            icon={<BadgeCheck size={18} />} title="Plano VIP" subtitle="Contatos diretos de fornecedores selecionados"
            right={<Badge tone={settings.vip ? 'good' : 'neutral'}>{settings.vip ? 'Ativo' : 'Inativo'}</Badge>}
          />
          <p className="mt-4 text-[13px] text-ink-2">
            {settings.vip
              ? 'Os contatos VIP estão liberados neste aparelho (modo de demonstração).'
              : 'Ative em Fornecedores → Contatos VIP. A cobrança ainda não está conectada nesta versão.'}
          </p>
          {settings.vip && <Button className="mt-4" size="sm" variant="outline" onClick={() => update({ vip: false })}>Bloquear novamente</Button>}
        </Card>
      </div>

      <Card className="lg:col-span-2">
        <CardHead
          icon={<HardDrive size={18} />} title="Seus dados"
          subtitle={`${num(productCount)} produtos e ${num(saleCount)} vendas salvos neste aparelho`}
        />
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-ink-2">
          Tudo o que você cadastra fica guardado no navegador deste aparelho — não há conta nem servidor nesta versão. Para não perder nada ao trocar de aparelho ou limpar o navegador, exporte um backup de tempos em tempos.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Action icon={<Download size={17} />} title="Exportar backup" text="Baixa um arquivo com todos os dados, incluindo as fotos.">
            <Button variant="outline" size="sm" onClick={exportBackup}>Exportar</Button>
          </Action>
          <Action icon={<Upload size={17} />} title="Restaurar backup" text="Substitui os dados deste aparelho pelos do arquivo.">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Escolher arquivo</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { void importBackup(e.target.files?.[0]); e.target.value = '' }} />
          </Action>
          <Action icon={<FlaskConical size={17} />} title="Loja de demonstração" text="Carrega uma loja de exemplo com 6 meses de movimento.">
            <Button
              variant="outline" size="sm"
              onClick={() => ask({
                title: 'Carregar a loja de demonstração?', text: 'Os dados atuais deste aparelho serão substituídos pelos de exemplo. Exporte um backup antes, se precisar.',
                confirmLabel: 'Carregar demonstração',
                onConfirm: () => {
                  loadDemo()
                  toast('Loja de demonstração carregada')
                },
              })}
            >
              Carregar
            </Button>
          </Action>
          <Action icon={<Trash2 size={17} />} title="Começar do zero" text="Apaga produtos, vendas, despesas e equipe para cadastrar a sua loja.">
            <Button
              variant="danger" size="sm"
              onClick={() => ask({
                title: 'Apagar todos os dados?', text: 'Produtos, vendas, despesas, equipe, catálogos e seus fornecedores serão apagados deste aparelho. Essa ação não pode ser desfeita.',
                confirmLabel: 'Apagar tudo', danger: true,
                onConfirm: () => {
                  wipe()
                  toast('Dados apagados. Loja pronta para começar.')
                },
              })}
            >
              Apagar tudo
            </Button>
          </Action>
        </div>
      </Card>
    </div>
  )
}

function Action({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-ink-2">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        <div className="text-xs leading-snug text-ink-3">{text}</div>
      </div>
      {children}
    </div>
  )
}
