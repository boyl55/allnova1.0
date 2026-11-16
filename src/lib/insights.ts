import type { Data } from '../types'
import { addDays, WEEKDAYS_FULL } from './dates'
import { brl0, num, pct } from './format'
import { byCategory, byProduct, byWeekday, inRange, monthFinance, reorderAlerts, stalled } from './analytics'

export interface Insight {
  tag: string
  title: string
  text: string
  /** Pergunta enviada à assistente quando o lojista toca no insight */
  question: string
}

/** Destaques automáticos calculados a partir dos dados da loja */
export function buildInsights(d: Data, now = new Date()): Insight[] {
  const out: Insight[] = []
  const last30 = inRange(d.sales, addDays(now, -30), addDays(now, 1))

  const alerts = reorderAlerts(d.products, d.sales, now)
  if (alerts.length) {
    const top = alerts[0]
    const urgent = alerts.filter((a) => a.level !== 'baixo').length
    out.push({
      tag: 'Estoque',
      title: `${alerts.length} ${alerts.length === 1 ? 'produto precisa' : 'produtos precisam'} de reposição`,
      text: `${top.product.name} ${top.total === 0 ? 'está zerado' : `tem só ${num(top.total)} peças`} e vendeu ${num(top.sold30)} nos últimos 30 dias.${urgent > 1 ? ` Ao todo, ${urgent} itens estão em nível crítico.` : ''}`,
      question: 'O que preciso repor com urgência?',
    })
  }

  const fin = monthFinance(d.sales, d.expenses, d.settings, 0, now)
  if (fin.goal > 0) {
    const hit = fin.progress >= 100
    out.push({
      tag: 'Meta',
      title: hit ? 'Meta do mês batida' : `Você está em ${pct(fin.progress)} da meta do mês`,
      text: hit
        ? `O faturamento chegou a ${brl0(fin.revenue)}, acima da meta de ${brl0(fin.goal)}.`
        : `Faltam ${brl0(fin.goal - fin.revenue)}. Para chegar lá, é preciso vender cerca de ${brl0(fin.perDayNeeded)} por dia até o fim do mês.`,
      question: 'Vou bater a meta deste mês?',
    })
  }

  const wd = byWeekday(inRange(d.sales, addDays(now, -56), addDays(now, 1)))
  const totalWd = wd.reduce((a, x) => a + x.revenue, 0)
  if (totalWd > 0) {
    const best = wd.reduce((a, x, i) => (x.revenue > wd[a].revenue ? i : a), 0)
    out.push({
      tag: 'Vendas',
      title: `${WEEKDAYS_FULL[best][0].toUpperCase()}${WEEKDAYS_FULL[best].slice(1)} é o seu melhor dia`,
      text: `Concentra ${pct((wd[best].revenue / totalWd) * 100)} do faturamento das últimas 8 semanas. Vale reforçar equipe e vitrine nesse dia.`,
      question: 'Quais são meus melhores dias de venda?',
    })
  }

  const top = byProduct(last30)[0]
  if (top) {
    out.push({
      tag: 'Produtos',
      title: `${top.name} lidera as vendas`,
      text: `Foram ${num(top.qty)} peças em 30 dias, com ${brl0(top.revenue)} de faturamento e ${pct(top.revenue ? (top.profit / top.revenue) * 100 : 0)} de margem.`,
      question: 'Quais produtos mais venderam nos últimos 30 dias?',
    })
  }

  const idle = stalled(d.products, d.sales, 30, now)
  if (idle.length) {
    const value = idle.reduce((a, x) => a + x.value, 0)
    out.push({
      tag: 'Giro',
      title: `${idle.length} ${idle.length === 1 ? 'produto parado' : 'produtos parados'} há 30 dias`,
      text: `São ${brl0(value)} em custo sem girar. ${idle[0].product.name} é o maior deles — uma promoção ou destaque no catálogo pode ajudar.`,
      question: 'Quais produtos estão parados no estoque?',
    })
  }

  const cats = byCategory(last30, d.categories).filter((c) => c.revenue > 0)
  if (cats.length > 1) {
    const best = [...cats].sort((a, b) => b.profit / b.revenue - a.profit / a.revenue)[0]
    out.push({
      tag: 'Margem',
      title: `${best.name} tem a melhor margem`,
      text: `A categoria rende ${pct((best.profit / best.revenue) * 100)} de margem bruta nos últimos 30 dias, contra ${pct((cats.reduce((a, c) => a + c.profit, 0) / cats.reduce((a, c) => a + c.revenue, 0)) * 100)} na média da loja.`,
      question: 'Qual categoria dá mais lucro?',
    })
  }

  return out
}
