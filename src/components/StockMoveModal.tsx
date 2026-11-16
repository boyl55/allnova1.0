import { useEffect, useState } from 'react'
import type { MoveType } from '../types'
import { code } from '../lib/format'
import { useStore } from '../store/store'
import { toast, useUI } from '../store/ui'
import { Button, Field, Input, Modal, NumInput, Segmented, Select } from './ui'

const TYPES: { value: MoveType; label: string }[] = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'saida', label: 'Saída' },
  { value: 'ajuste', label: 'Contagem' },
]

const HELP: Record<MoveType, string> = {
  entrada: 'Informe quantas peças chegaram em cada tamanho.',
  saida: 'Informe quantas peças saíram sem venda (defeito, devolução, perda).',
  ajuste: 'Informe a quantidade real contada em cada tamanho.',
}

export function StockMoveModal() {
  const target = useUI((s) => s.stockMove)
  const close = useUI((s) => s.closeStockMove)
  const products = useStore((s) => s.products)
  const moveStock = useStore((s) => s.moveStock)

  const [productId, setProductId] = useState('')
  const [type, setType] = useState<MoveType>('entrada')
  const [values, setValues] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')

  const product = products.find((p) => p.id === productId)

  useEffect(() => {
    if (!target) return
    setProductId(target.productId ?? '')
    setType('entrada')
    setValues({})
    setNote('')
  }, [target])

  useEffect(() => {
    if (!product) return
    setValues(type === 'ajuste' ? Object.fromEntries(product.sizes.map((s) => [s.size, s.qty])) : {})
  }, [type, productId]) // eslint-disable-line react-hooks/exhaustive-deps

  const changed = product
    ? product.sizes.some((s) => (type === 'ajuste' ? (values[s.size] ?? s.qty) !== s.qty : (values[s.size] ?? 0) > 0))
    : false

  const submit = () => {
    if (!product || !changed) return
    moveStock(product.id, type, values, note)
    toast(type === 'entrada' ? 'Entrada registrada no estoque' : type === 'saida' ? 'Saída registrada' : 'Contagem atualizada')
    close()
  }

  return (
    <Modal
      open={Boolean(target)}
      onClose={close}
      title="Movimentar estoque"
      subtitle={HELP[type]}
      footer={
        <>
          <Button variant="soft" onClick={close}>Cancelar</Button>
          <Button variant="brand" disabled={!changed} onClick={submit}>Salvar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Produto">
          <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Selecione um produto</option>
            {[...products].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({code(p.code)})</option>
            ))}
          </Select>
        </Field>

        <Segmented label="Tipo de movimentação" value={type} onChange={setType} options={TYPES} className="w-full [&>button]:flex-1" />

        {product && (
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
              {type === 'ajuste' ? 'Quantidade contada por tamanho' : 'Quantidade por tamanho'}
            </span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {product.sizes.map((s) => (
                <label key={s.size} className="rounded-2xl bg-surface-2 p-3">
                  <span className="mb-2 flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-ink">{s.size}</span>
                    <span className="text-xs text-ink-3">atual: {s.qty}</span>
                  </span>
                  <NumInput
                    integer placeholder="0" aria-label={`Quantidade do tamanho ${s.size}`}
                    value={values[s.size] ?? 0}
                    onChange={(n) => setValues((v) => ({ ...v, [s.size]: n }))}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        <Field label="Observação (opcional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: reposição do fornecedor, nota 1234" />
        </Field>
      </div>
    </Modal>
  )
}
