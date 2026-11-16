import { CircleX, TrendingDown, TriangleAlert } from 'lucide-react'
import { ALERT_LABEL, type AlertLevel } from '../lib/analytics'
import { Badge } from './ui'

/** Nível do aviso de reposição — sempre com ícone e texto, nunca só cor */
export function AlertBadge({ level }: { level: AlertLevel }) {
  if (level === 'zerado') return <Badge tone="bad" icon={<CircleX size={13} />}>{ALERT_LABEL.zerado}</Badge>
  if (level === 'critico') return <Badge tone="warn" icon={<TriangleAlert size={13} />}>{ALERT_LABEL.critico}</Badge>
  return <Badge tone="neutral" icon={<TrendingDown size={13} />}>{ALERT_LABEL.baixo}</Badge>
}
