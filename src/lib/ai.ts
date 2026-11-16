/**
 * Nova — a assistente da ALLNOVA.
 *
 * Ela responde apenas com as informações que o lojista cadastrou no aplicativo
 * (vendas, estoque, despesas, metas, equipe e fornecedores). Nada é enviado para
 * fora do aparelho: a análise acontece aqui, em cima dos dados da própria loja.
 */
import type { Data, Employee, Product } from '../types'
import {
  ALERT_LABEL, byCategory, byEmployee, byPayment, byProduct, byWeekday, compare, delta, expensesByCategory,
  expensesOfMonth, inRange, marginOf, monthFinance, reorderAlerts, soldMap, stalled, stockOf, stockTotals, totals,
  type Comparison,
} from './analytics'
import { addDays, monthKey, MONTHS_FULL, startOfDay, WEEKDAYS_FULL, type PeriodKind } from './dates'
import { brl, brl0, code, firstName, normalize, num, pct, plural, signedPct } from './format'

export interface AICard {
  label: string
  value: string
  delta?: string | null
  tone?: 'good' | 'bad' | 'neutral'
  highlight?: boolean
}

export interface AIAnswer {
  text: string
  cardsTitle?: string | null
  cards: AICard[]
  action?: { label: string; to: string } | null
  followups: string[]
}

export interface AIScope {
  sales: number
  products: number
  expenses: number
}

export const scopeOf = (d: Data): AIScope => ({ sales: d.sales.length, products: d.products.length, expenses: d.expenses.length })

export const stepsOf = (s: AIScope) => [
  `Li ${plural(s.sales, 'venda registrada', 'vendas registradas')}`,
  `Conferi o estoque de ${plural(s.products, 'produto', 'produtos')}`,
  `Cruzei com ${plural(s.expenses, 'despesa', 'despesas')} e as metas`,
]

export const SUGGESTIONS: { group: string; items: string[] }[] = [
  { group: 'Estoque', items: ['O que preciso repor com urgência?', 'Quais produtos estão parados no estoque?', 'Quanto vale meu estoque?'] },
  { group: 'Financeiro', items: ['Vou bater a meta deste mês?', 'Qual foi meu lucro este mês?', 'Onde estou gastando mais?'] },
  { group: 'Relatórios', items: ['Como foi a semana?', 'Quais produtos mais venderam?', 'Quais são meus melhores dias de venda?'] },
]

/* ───────── Entendimento da pergunta ───────── */

const has = (q: string, ...stems: string[]) => stems.some((w) => q.includes(w))
const word = (q: string, ...words: string[]) => words.some((w) => new RegExp(`\\b${w}\\b`).test(q))
const tone = (v: number | null, goodWhenUp = true): AICard['tone'] =>
  v === null || Math.abs(v) < 0.05 ? 'neutral' : v > 0 === goodWhenUp ? 'good' : 'bad'
const dl = (v: number | null) => (v === null ? null : signedPct(v))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'para', 'kit', 'e'])
const tokens = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP.has(t))

/** Produto citado na pergunta (pelo número ou por duas ou mais palavras do nome) */
function findProduct(q: string, products: Product[]): Product | undefined {
  const byCode = q.match(/#\s?(\d{1,5})\b/) ?? q.match(/\bproduto\s+(\d{1,5})\b/)
  if (byCode) {
    const p = products.find((x) => x.code === Number(byCode[1]))
    if (p) return p
  }
  const qt = new Set(tokens(q))
  let best: { p: Product; score: number } | undefined
  for (const p of products) {
    const nt = tokens(p.name)
    const hit = nt.filter((t) => qt.has(t)).length
    const full = hit === nt.length
    if (hit >= 2 || (full && nt.length === 1 && nt[0].length > 4)) {
      const score = hit + (full ? 0.5 : 0)
      if (!best || score > best.score) best = { p, score }
    }
  }
  return best?.p
}

function findEmployee(q: string, employees: Employee[]) {
  return employees.find((e) => {
    const f = normalize(firstName(e.name))
    return f.length > 2 && word(q, f)
  })
}

function findCategory(q: string, d: Data) {
  return d.categories.find((c) => {
    const n = normalize(c.name)
    const stem = n.length > 4 ? n.replace(/s$/, '') : n
    return word(q, n) || word(q, stem)
  })
}

/* ───────── Respostas ───────── */

function periodAnswer(d: Data, kind: PeriodKind, offset: number, now: Date): AIAnswer {
  const c: Comparison = compare(d.sales, kind, offset, now)
  const dv = delta(c.curT.revenue, c.prevT.revenue)
  const isWeek = kind === 'semana'
  const name = offset === 0
    ? (isWeek ? `Nesta semana (${c.cur.label})` : `Em ${MONTHS_FULL[c.cur.start.getMonth()]}`)
    : (isWeek ? `Na semana passada (${c.cur.label})` : `Em ${c.cur.label}`)
  const versus = offset === 0
    ? `o mesmo trecho ${isWeek ? 'da semana passada' : 'do mês passado'}`
    : `${isWeek ? 'a semana' : 'o mês'} anterior`
  if (!c.curT.count) {
    return {
      text: `${name} ainda não há vendas registradas.`, cards: [],
      action: { label: 'Ver relatórios', to: '/relatorios' }, followups: ['Como está o mês?', 'Quais produtos mais venderam?'],
    }
  }
  const top = byProduct(c.curSales)[0]
  return {
    text: `${name} você faturou **${brl0(c.curT.revenue)}** em ${plural(c.curT.count, 'venda', 'vendas')}${dv === null ? '' : `, ${dv >= 0 ? 'alta' : 'queda'} de ${pct(Math.abs(dv), 1)} sobre ${versus}`}. O ticket médio ficou em ${brl(c.curT.ticket)} e a margem bruta em ${pct(c.curT.margin)}.${top ? ` O produto que mais saiu foi ${top.name} (${num(top.qty)} peças).` : ''}`,
    cardsTitle: isWeek ? (offset === 0 ? 'Semana atual' : 'Semana passada') : cap(c.cur.label),
    cards: [
      { label: 'Faturamento', value: brl0(c.curT.revenue), delta: dl(dv), tone: tone(dv), highlight: true },
      { label: 'Vendas', value: num(c.curT.count), delta: dl(delta(c.curT.count, c.prevT.count)), tone: tone(delta(c.curT.count, c.prevT.count)) },
      { label: 'Ticket médio', value: brl(c.curT.ticket), delta: dl(delta(c.curT.ticket, c.prevT.ticket)), tone: tone(delta(c.curT.ticket, c.prevT.ticket)) },
      { label: 'Lucro bruto', value: brl0(c.curT.profit), delta: `${pct(c.curT.margin)} de margem` },
    ],
    action: { label: `Abrir relatório ${isWeek ? 'semanal' : 'mensal'}`, to: '/relatorios' },
    followups: isWeek
      ? ['Como está o mês?', 'Quais são meus melhores dias de venda?', 'Quais produtos mais venderam?']
      : ['Vou bater a meta deste mês?', 'Qual foi meu lucro este mês?', 'O que preciso repor com urgência?'],
  }
}

function productAnswer(p: Product, d: Data, now: Date): AIAnswer {
  const sold30 = soldMap(d.sales, addDays(now, -30)).get(p.id) ?? 0
  const total = stockOf(p)
  const cover = sold30 > 0 ? total / (sold30 / 30) : null
  const zero = p.sizes.filter((s) => s.qty <= 0).map((s) => s.size)
  const supplier = d.suppliers.find((s) => s.id === p.supplierId)
  const grade = p.sizes.map((s) => `${s.size}: ${num(s.qty)}`).join(' · ')
  const low = total <= p.minStock
  return {
    text: `**${p.name}** (${code(p.code)}, ${p.brand}) tem ${plural(total, 'peça', 'peças')} em estoque — ${grade}. Vendeu ${plural(sold30, 'peça', 'peças')} nos últimos 30 dias${cover === null ? '' : `, o que dá estoque para cerca de ${plural(Math.round(cover), 'dia', 'dias')}`}. O preço é ${brl(p.price)} com custo de ${brl(p.cost)}, margem de ${pct(marginOf(p))}.${zero.length && total > 0 ? ` Está sem o tamanho ${zero.join(', ')}.` : ''}${low ? ` Está ${total === 0 ? 'zerado' : 'abaixo do mínimo'} (${num(p.minStock)})${supplier ? ` — o fornecedor cadastrado é ${supplier.name}` : ''}.` : ''}${sold30 === 0 && total > 0 ? ' Sem vendas no período: vale uma promoção ou destaque no catálogo.' : ''}`,
    cardsTitle: p.name,
    cards: [
      { label: 'Em estoque', value: `${num(total)} peças`, tone: low ? 'bad' : 'neutral', highlight: low },
      { label: 'Vendidos (30 dias)', value: `${num(sold30)} peças` },
      { label: 'Margem', value: pct(marginOf(p)), delta: `${brl(p.price - p.cost)} por peça` },
      { label: 'Cobertura', value: cover === null ? '—' : `${num(Math.round(cover))} dias` },
    ],
    action: low ? { label: 'Abrir avisos de reposição', to: '/avisos' } : { label: 'Ver no estoque', to: '/estoque' },
    followups: ['O que preciso repor com urgência?', 'Quais produtos mais venderam?'],
  }
}

function employeeAnswer(e: Employee, d: Data, now: Date): AIAnswer {
  const c = compare(d.sales, 'mes', 0, now)
  const mine = c.curSales.filter((s) => s.employeeId === e.id)
  const before = c.prevSales.filter((s) => s.employeeId === e.id)
  const t = totals(mine)
  const dv = delta(t.revenue, totals(before).revenue)
  const progress = e.goal ? (t.revenue / e.goal) * 100 : null
  return {
    text: `**${e.name}** vendeu ${brl0(t.revenue)} em ${plural(t.count, 'venda', 'vendas')} neste mês${progress === null ? '' : `, ${pct(progress)} da meta de ${brl0(e.goal)}`}. O ticket médio é ${brl(t.ticket)} e a comissão estimada está em ${brl(t.revenue * (e.commission / 100))}.${dv === null ? '' : ` Em relação ao mesmo trecho do mês passado, ${dv >= 0 ? 'cresceu' : 'caiu'} ${pct(Math.abs(dv), 1)}.`}`,
    cardsTitle: firstName(e.name),
    cards: [
      { label: 'Vendido no mês', value: brl0(t.revenue), delta: dl(dv), tone: tone(dv), highlight: true },
      { label: 'Meta', value: e.goal ? brl0(e.goal) : '—', delta: progress === null ? null : `${pct(progress)} atingido` },
      { label: 'Ticket médio', value: brl(t.ticket) },
      { label: 'Comissão', value: brl(t.revenue * (e.commission / 100)), delta: `${pct(e.commission, e.commission % 1 ? 1 : 0)} das vendas` },
    ],
    action: { label: 'Ver equipe e metas', to: '/equipe' },
    followups: ['Como está a equipe em relação às metas?', 'Vou bater a meta deste mês?'],
  }
}

/** Analisa os dados da loja e monta a resposta para a pergunta do lojista */
export function answer(question: string, d: Data, now = new Date()): AIAnswer {
  const q = normalize(question)

  if (!d.sales.length && !d.products.length) {
    return {
      text: 'Ainda não há dados para analisar. Cadastre seus produtos e registre as primeiras vendas — a partir daí eu acompanho estoque, financeiro e relatórios com você.',
      cards: [],
      action: { label: 'Cadastrar produtos', to: '/produtos' },
      followups: [],
    }
  }

  const help = (): AIAnswer => {
    return {
      text: 'Eu sou a Nova e trabalho só com o que está cadastrado na sua loja. Posso te dizer:\n- **Estoque**: o que repor, o que está parado, quanto vale o estoque e como está cada produto\n- **Financeiro**: lucro, margem, despesas, meta e projeção do mês\n- **Relatórios**: como foi o dia, a semana ou o mês, mais vendidos, melhores dias, formas de pagamento\n- **Pessoas**: desempenho da equipe e fornecedor com melhor preço\nPergunte do seu jeito, citando o produto, a categoria ou a pessoa.',
      cards: [], action: null,
      followups: ['Como está o mês?', 'O que preciso repor com urgência?', 'Vou bater a meta deste mês?'],
    }
  }

  // assuntos que disputam palavras com outros ("falta", "comprar") são decididos primeiro
  const aboutTeam = has(q, 'funcion', 'equipe', 'vendedor', 'comiss') || word(q, 'time')
  const aboutGoal = !aboutTeam && has(q, 'meta', 'objetivo', 'bater a', 'projec', 'previsao de fatur', 'previsao de vend', 'previsao do mes', 'fechar o mes')
  const aboutSuppliers = has(q, 'fornecedor', 'atacad', 'cotac', 'preco de compra', 'onde compr', 'mais barat')

  const m = compare(d.sales, 'mes', 0, now)
  const fin = monthFinance(d.sales, d.expenses, d.settings, 0, now)
  const last30 = inRange(d.sales, addDays(now, -30), addDays(now, 1))
  const month = MONTHS_FULL[now.getMonth()]

  const product = findProduct(q, d.products)
  if (product) return productAnswer(product, d, now)

  const employee = findEmployee(q, d.employees)
  if (employee) return employeeAnswer(employee, d, now)

  /* Reposição */
  if (!aboutGoal && !aboutSuppliers && has(q, 'reposi', 'repor', 'falta', 'acaba', 'zerad', 'urgen', 'comprar', 'estoque baixo', 'pedir')) {
    const alerts = reorderAlerts(d.products, d.sales, now)
    if (!alerts.length) {
      return {
        text: 'Nenhum produto está abaixo do estoque mínimo agora. Seu estoque está bem coberto.',
        cards: [], action: { label: 'Ver estoque', to: '/estoque' },
        followups: ['Quais produtos estão parados no estoque?', 'Quanto vale meu estoque?'],
      }
    }
    const urgent = alerts.filter((a) => a.level !== 'baixo')
    const pendingOrders = alerts.filter((a) => d.ordered[a.product.id]).length
    const list = alerts.slice(0, 4).map((a) =>
      `- **${a.product.name}** (${ALERT_LABEL[a.level].toLowerCase()}): ${a.total === 0 ? 'sem peças' : `${num(a.total)} peças`}, vendeu ${num(a.sold30)} em 30 dias — sugiro comprar ${num(a.suggest)}`,
    )
    return {
      text: `${plural(alerts.length, 'produto precisa', 'produtos precisam')} de reposição, ${urgent.length ? `${num(urgent.length)} em nível crítico ou zerado` : 'nenhum em nível crítico'}. Os mais urgentes pelo ritmo de venda:\n${list.join('\n')}${pendingOrders ? `\n${plural(pendingOrders, 'item já tem', 'itens já têm')} pedido marcado como feito.` : ''}`,
      cardsTitle: 'Reposição',
      cards: [
        { label: 'Zerados', value: num(alerts.filter((a) => a.level === 'zerado').length), tone: 'bad', highlight: alerts.some((a) => a.level === 'zerado') },
        { label: 'Críticos', value: num(alerts.filter((a) => a.level === 'critico').length), tone: 'bad' },
        { label: 'Peças sugeridas', value: num(alerts.reduce((s, a) => s + a.suggest, 0)) },
        { label: 'Investimento', value: brl0(alerts.reduce((s, a) => s + a.investment, 0)) },
      ],
      action: { label: 'Abrir avisos de reposição', to: '/avisos' },
      followups: ['Qual fornecedor tem o melhor preço?', 'Quais produtos estão parados no estoque?'],
    }
  }

  /* Produtos parados */
  if (has(q, 'parad', 'encalh', 'sem vend', 'giro', 'nao vend', 'promoc', 'liquidac')) {
    const idle = stalled(d.products, d.sales, 30, now)
    if (!idle.length) {
      return {
        text: 'Todos os produtos com estoque tiveram pelo menos uma venda nos últimos 30 dias.',
        cards: [], action: { label: 'Ver estoque', to: '/estoque' }, followups: ['Quais produtos mais venderam?'],
      }
    }
    const value = idle.reduce((s, x) => s + x.value, 0)
    return {
      text: `${plural(idle.length, 'produto está parado', 'produtos estão parados')} há 30 dias, somando ${brl0(value)} em custo:\n${idle.slice(0, 5).map((x) => `- **${x.product.name}**: ${num(x.total)} peças (${brl0(x.value)})`).join('\n')}\nVale testar um desconto, um combo com itens que giram ou destaque no catálogo.`,
      cardsTitle: 'Estoque sem giro',
      cards: [
        { label: 'Produtos parados', value: num(idle.length), tone: 'bad', highlight: true },
        { label: 'Capital parado', value: brl0(value) },
      ],
      action: { label: 'Montar um catálogo', to: '/catalogo' },
      followups: ['O que preciso repor com urgência?', 'Qual categoria dá mais lucro?'],
    }
  }

  /* Fornecedores */
  if (aboutSuppliers) {
    const visible = d.suppliers.filter((s) => s.kind === 'meu' || d.settings.vip)
    const items = [...new Set(visible.flatMap((s) => s.quotes.map((x) => x.item)))]
    const best = items.flatMap((item) => {
      const offers = visible
        .flatMap((s) => s.quotes.filter((x) => x.item === item).map((x) => ({ s, price: x.price })))
        .sort((a, b) => a.price - b.price)
      return offers.length ? [{ item, ...offers[0] }] : []
    })
    const wanted = findCategory(q, d)
    const focus = wanted && items.find((i) => normalize(i) === normalize(wanted.name))
    if (focus) {
      const offers = visible
        .flatMap((s) => s.quotes.filter((x) => x.item === focus).map((x) => ({ s, price: x.price })))
        .sort((a, b) => a.price - b.price)
      const [first, ...rest] = offers
      return {
        text: `Para **${focus}**, o menor preço é de **${first.s.name}**: ${brl(first.price)} por peça, com entrega em ${first.s.leadDays} dias e pedido mínimo de ${brl0(first.s.minOrder)}.${rest.length ? ` Em seguida vêm ${rest.slice(0, 2).map((o) => `${o.s.name} (${brl(o.price)})`).join(' e ')}.` : ''}${d.settings.vip ? '' : ' Os contatos VIP não entram nesta comparação enquanto o plano não estiver ativo.'}`,
        cardsTitle: `Preço por peça — ${focus}`,
        cards: offers.slice(0, 4).map((o, i) => ({ label: o.s.name, value: brl(o.price), delta: `${o.s.leadDays} dias`, highlight: i === 0 })),
        action: { label: 'Comparar fornecedores', to: '/fornecedores' },
        followups: ['O que preciso repor com urgência?', 'Qual categoria dá mais lucro?'],
      }
    }
    if (!best.length) {
      return {
        text: 'Você ainda não cadastrou fornecedores com preços. Adicione seus contatos e os preços por categoria para eu comparar.',
        cards: [], action: { label: 'Cadastrar fornecedores', to: '/fornecedores' }, followups: [],
      }
    }
    return {
      text: `Comparando ${plural(visible.length, 'fornecedor', 'fornecedores')}, estes têm o menor preço por peça em cada categoria:\n${best.map((b) => `- **${b.item}**: ${b.s.name} a ${brl(b.price)}`).join('\n')}${d.settings.vip ? '' : '\nOs contatos VIP ainda não entram nesta comparação — eles ficam disponíveis ao ativar o plano.'}`,
      cardsTitle: 'Melhor preço por categoria',
      cards: best.slice(0, 4).map((b) => ({ label: b.item, value: brl(b.price), delta: b.s.name })),
      action: { label: 'Comparar fornecedores', to: '/fornecedores' },
      followups: ['O que preciso repor com urgência?', 'Qual categoria dá mais lucro?'],
    }
  }

  /* Equipe */
  if (aboutTeam) {
    const rank = byEmployee(m.curSales, d.employees)
    if (!rank.length) {
      return {
        text: 'Ainda não há funcionários cadastrados. Cadastre a equipe e defina metas para acompanhar o desempenho de cada pessoa.',
        cards: [], action: { label: 'Cadastrar equipe', to: '/equipe' }, followups: [],
      }
    }
    return {
      text: `Em ${month}, **${rank[0].name}** lidera com ${brl0(rank[0].revenue)} em ${plural(rank[0].count, 'venda', 'vendas')}. Veja como cada pessoa está em relação à própria meta:`,
      cardsTitle: 'Vendido x meta',
      cards: rank.slice(0, 4).map((r, i) => {
        const e = d.employees.find((x) => x.id === r.id)
        const p = e?.goal ? (r.revenue / e.goal) * 100 : null
        return { label: r.name, value: brl0(r.revenue), delta: p === null ? null : `${pct(p)} da meta`, highlight: i === 0 }
      }),
      action: { label: 'Ver equipe e metas', to: '/equipe' },
      followups: ['Vou bater a meta deste mês?', 'Quais são meus melhores dias de venda?'],
    }
  }

  /* Meta e projeção */
  if (aboutGoal) {
    if (!fin.goal) {
      return {
        text: 'Você ainda não definiu uma meta de faturamento. Defina no Financeiro para eu acompanhar o ritmo do mês.',
        cards: [], action: { label: 'Definir meta', to: '/financeiro' }, followups: [],
      }
    }
    const proj = fin.projection ?? fin.revenue
    const will = proj >= fin.goal
    return {
      text: `Você faturou ${brl0(fin.revenue)} em ${month}, ${pct(fin.progress)} da meta de ${brl0(fin.goal)}. No ritmo atual, o mês fecha em cerca de **${brl0(proj)}** — ${will ? 'acima da meta' : `${brl0(fin.goal - proj)} abaixo da meta`}. ${will ? 'Mantendo o ritmo, a meta sai.' : `Para alcançar, é preciso vender ${brl0(fin.perDayNeeded)} por dia nos ${fin.daysLeft} dias restantes.`}`,
      cardsTitle: 'Meta do mês',
      cards: [
        { label: 'Faturado', value: brl0(fin.revenue), delta: `${pct(fin.progress)} da meta` },
        { label: 'Projeção', value: brl0(proj), tone: will ? 'good' : 'bad', highlight: true },
        { label: 'Falta', value: brl0(Math.max(0, fin.goal - fin.revenue)) },
        { label: 'Por dia', value: brl0(fin.perDayNeeded) },
      ],
      action: { label: 'Abrir financeiro', to: '/financeiro' },
      followups: ['Quais são meus melhores dias de venda?', 'Como está a equipe em relação às metas?'],
    }
  }

  /* Despesas */
  if (has(q, 'despesa', 'gast', 'custo fixo', 'custos', 'aluguel', 'salario', 'imposto')) {
    const cats = expensesByCategory(expensesOfMonth(d.expenses, monthKey(now))).sort((a, b) => b.amount - a.amount)
    if (!cats.length) {
      return {
        text: `Não há despesas lançadas em ${month}. Lance aluguel, salários e contas no Financeiro para eu calcular o lucro líquido.`,
        cards: [], action: { label: 'Lançar despesas', to: '/financeiro' }, followups: [],
      }
    }
    return {
      text: `As despesas lançadas em ${month} somam ${brl0(fin.expenses)}, o equivalente a ${pct(fin.revenue ? (fin.expenses / fin.revenue) * 100 : 0)} do faturamento até agora. **${cats[0].label}** é o maior peso, com ${brl0(cats[0].amount)}.`,
      cardsTitle: 'Despesas por categoria',
      cards: cats.slice(0, 4).map((c, i) => ({ label: c.label, value: brl0(c.amount), delta: pct((c.amount / fin.expenses) * 100), highlight: i === 0 })),
      action: { label: 'Ver despesas', to: '/financeiro' },
      followups: ['Qual foi meu lucro este mês?', 'Vou bater a meta deste mês?'],
    }
  }

  /* Formas de pagamento */
  if (has(q, 'pagamento', 'cartao', 'credito', 'debito', 'em dinheiro') || word(q, 'pix')) {
    const pays = byPayment(m.curSales).sort((a, b) => b.revenue - a.revenue)
    const total = pays.reduce((a, p) => a + p.revenue, 0)
    if (!total) {
      return { text: `Ainda não há vendas em ${month} para dividir por forma de pagamento.`, cards: [], action: null, followups: ['Como está o mês?'] }
    }
    return {
      text: `Em ${month}, **${pays[0].label}** é a forma de pagamento mais usada, com ${pct((pays[0].revenue / total) * 100)} do faturamento (${brl0(pays[0].revenue)} em ${plural(pays[0].count, 'venda', 'vendas')}).`,
      cardsTitle: 'Formas de pagamento no mês',
      cards: pays.map((p, i) => ({ label: p.label, value: brl0(p.revenue), delta: pct((p.revenue / total) * 100), highlight: i === 0 })),
      action: { label: 'Ver relatórios', to: '/relatorios' },
      followups: ['Como está o mês?', 'Qual é o meu ticket médio?'],
    }
  }

  /* Ticket médio */
  if (has(q, 'ticket')) {
    const dv = delta(m.curT.ticket, m.prevT.ticket)
    const perSale = m.curT.count ? m.curT.items / m.curT.count : 0
    return {
      text: `O ticket médio de ${month} está em **${brl(m.curT.ticket)}**${dv === null ? '' : `, ${dv >= 0 ? 'acima' : 'abaixo'} do mesmo trecho do mês passado em ${pct(Math.abs(dv), 1)}`}. Cada venda leva em média ${perSale.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} peças — sugerir uma segunda peça (cinto, meia, boné) no caixa é o caminho mais curto para subir esse número.`,
      cardsTitle: 'Ticket médio',
      cards: [
        { label: 'Este mês', value: brl(m.curT.ticket), delta: dl(dv), tone: tone(dv), highlight: true },
        { label: 'Mês passado', value: brl(m.prevT.ticket) },
        { label: 'Peças por venda', value: perSale.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) },
        { label: 'Vendas', value: num(m.curT.count) },
      ],
      action: { label: 'Ver relatórios', to: '/relatorios' },
      followups: ['Quais produtos mais venderam?', 'Como está o mês?'],
    }
  }

  /* Categorias */
  const category = findCategory(q, d)
  if (category || has(q, 'categoria')) {
    const cats = byCategory(last30, d.categories).filter((c) => c.revenue > 0).map((c) => ({ ...c, margin: (c.profit / c.revenue) * 100 }))
    if (!cats.length) {
      return { text: 'Não houve vendas nos últimos 30 dias para comparar as categorias.', cards: [], action: null, followups: [] }
    }
    const totalRev = cats.reduce((a, c) => a + c.revenue, 0)
    if (category) {
      const c = cats.find((x) => x.id === category.id)
      const prods = d.products.filter((p) => p.categoryId === category.id)
      const st = stockTotals(prods)
      if (!c) {
        return {
          text: `**${category.name}** não teve vendas nos últimos 30 dias. Há ${plural(st.pieces, 'peça', 'peças')} em estoque em ${plural(prods.length, 'produto', 'produtos')}.`,
          cards: [], action: { label: 'Ver produtos', to: '/produtos' }, followups: ['Quais produtos estão parados no estoque?'],
        }
      }
      const best = byProduct(last30.map((s) => ({ ...s, items: s.items.filter((i) => i.categoryId === category.id) })).filter((s) => s.items.length))[0]
      return {
        text: `**${category.name}** faturou ${brl0(c.revenue)} nos últimos 30 dias (${pct((c.revenue / totalRev) * 100)} da loja), com ${num(c.qty)} peças vendidas e margem de ${pct(c.margin)}.${best ? ` O destaque é ${best.name}, com ${num(best.qty)} peças.` : ''} Em estoque há ${plural(st.pieces, 'peça', 'peças')}, que valem ${brl0(st.cost)} a custo.`,
        cardsTitle: category.name,
        cards: [
          { label: 'Faturamento (30 dias)', value: brl0(c.revenue), delta: `${pct((c.revenue / totalRev) * 100)} da loja`, highlight: true },
          { label: 'Peças vendidas', value: num(c.qty) },
          { label: 'Margem', value: pct(c.margin) },
          { label: 'Em estoque', value: `${num(st.pieces)} peças` },
        ],
        action: { label: 'Ver produtos', to: '/produtos' },
        followups: ['Qual categoria dá mais lucro?', 'O que preciso repor com urgência?'],
      }
    }
    const byProfit = [...cats].sort((a, b) => b.profit - a.profit)
    const byMargin = [...cats].sort((a, b) => b.margin - a.margin)[0]
    return {
      text: `Nos últimos 30 dias, **${byProfit[0].name}** é a categoria que mais gera lucro (${brl0(byProfit[0].profit)}), e ${byMargin.name} tem a melhor margem (${pct(byMargin.margin)}). A que menos contribui é ${byProfit[byProfit.length - 1].name}.`,
      cardsTitle: 'Lucro por categoria (30 dias)',
      cards: byProfit.slice(0, 4).map((c, i) => ({ label: c.name, value: brl0(c.profit), delta: `${pct(c.margin)} de margem`, highlight: i === 0 })),
      action: { label: 'Ver evolução da loja', to: '/gestao' },
      followups: ['Quais produtos mais venderam?', 'Quais produtos estão parados no estoque?'],
    }
  }

  /* Lucro e margem */
  if (has(q, 'lucro', 'margem', 'rentab', 'resultado') || word(q, 'sobra', 'sobrou', 'sobrando')) {
    const dv = delta(m.curT.revenue, m.prevT.revenue)
    return {
      text: `Em ${month}, o lucro bruto está em ${brl0(fin.gross)} (margem de ${pct(fin.margin)}). Descontando ${brl0(fin.expenses)} de despesas já lançadas, o resultado líquido até agora é **${brl0(fin.net)}**.${fin.net < 0 ? ' É comum ficar negativo no começo do mês, quando aluguel e folha já saíram e as vendas ainda estão entrando.' : ''}`,
      cardsTitle: 'Resultado do mês',
      cards: [
        { label: 'Faturamento', value: brl0(fin.revenue), delta: dl(dv), tone: tone(dv) },
        { label: 'Lucro bruto', value: brl0(fin.gross), delta: `${pct(fin.margin)} de margem` },
        { label: 'Despesas', value: brl0(fin.expenses) },
        { label: 'Lucro líquido', value: brl0(fin.net), tone: fin.net >= 0 ? 'good' : 'bad', highlight: true },
      ],
      action: { label: 'Abrir financeiro', to: '/financeiro' },
      followups: ['Onde estou gastando mais?', 'Qual categoria dá mais lucro?'],
    }
  }

  /* Estoque */
  if (has(q, 'estoque', 'inventario', 'pecas tenho', 'pecas em')) {
    const s = stockTotals(d.products)
    const alerts = reorderAlerts(d.products, d.sales, now)
    return {
      text: `Seu estoque tem ${num(s.pieces)} peças em ${plural(s.count, 'produto', 'produtos')}. A preço de custo vale **${brl0(s.cost)}**; vendido ao preço cheio, renderia ${brl0(s.retail)}. ${alerts.length ? `${plural(alerts.length, 'produto está', 'produtos estão')} abaixo do mínimo ou com tamanho faltando.` : 'Nenhum produto abaixo do mínimo.'}`,
      cardsTitle: 'Estoque',
      cards: [
        { label: 'Peças', value: num(s.pieces) },
        { label: 'Valor a custo', value: brl0(s.cost) },
        { label: 'Valor de venda', value: brl0(s.retail) },
        { label: 'Para repor', value: num(alerts.length), tone: alerts.length ? 'bad' : 'good', highlight: alerts.length > 0 },
      ],
      action: { label: 'Abrir estoque', to: '/estoque' },
      followups: ['O que preciso repor com urgência?', 'Quais produtos estão parados no estoque?'],
    }
  }

  /* Mais vendidos */
  if (has(q, 'mais vend', 'campe', 'melhores produt', 'saida', 'saem mais', 'mais sai', 'venderam') || word(q, 'top')) {
    const top = byProduct(last30).slice(0, 5)
    if (!top.length) {
      return { text: 'Não houve vendas nos últimos 30 dias.', cards: [], action: null, followups: [] }
    }
    return {
      text: `Os campeões dos últimos 30 dias:\n${top.map((t, i) => `${i + 1}. **${t.name}** — ${num(t.qty)} peças, ${brl0(t.revenue)}`).join('\n')}`,
      cardsTitle: 'Mais vendidos (30 dias)',
      cards: top.slice(0, 4).map((t, i) => {
        const p = d.products.find((x) => x.id === t.id)
        return { label: t.name, value: `${num(t.qty)} peças`, delta: p ? `${num(stockOf(p))} em estoque` : null, highlight: i === 0 }
      }),
      action: { label: 'Ver relatórios', to: '/relatorios' },
      followups: ['O que preciso repor com urgência?', 'Qual categoria dá mais lucro?'],
    }
  }

  /* Hoje */
  if (word(q, 'hoje', 'agora')) {
    const start = startOfDay(now)
    const t = totals(inRange(d.sales, start, addDays(start, 1)))
    const lastWeek = totals(inRange(d.sales, addDays(start, -7), new Date(+now - 7 * 86400e3)))
    const dv = delta(t.revenue, lastWeek.revenue)
    const wd = WEEKDAYS_FULL[(now.getDay() + 6) % 7]
    return {
      text: t.count
        ? `Hoje você já faturou **${brl0(t.revenue)}** em ${plural(t.count, 'venda', 'vendas')}, com ticket médio de ${brl(t.ticket)}${dv === null ? '' : ` — ${pct(Math.abs(dv), 1)} ${dv >= 0 ? 'acima' : 'abaixo'} do que neste mesmo horário na semana passada (${wd})`}.`
        : 'Ainda não há vendas registradas hoje.',
      cardsTitle: t.count ? 'Hoje' : null,
      cards: t.count
        ? [
          { label: 'Faturamento', value: brl0(t.revenue), delta: dl(dv), tone: tone(dv), highlight: true },
          { label: 'Vendas', value: num(t.count) },
          { label: 'Ticket médio', value: brl(t.ticket) },
          { label: 'Peças', value: num(t.items) },
        ]
        : [],
      action: { label: 'Ver relatórios', to: '/relatorios' },
      followups: ['Como foi a semana?', 'Vou bater a meta deste mês?'],
    }
  }

  /* Dias da semana */
  if (has(q, 'melhor dia', 'melhores dias', 'pior dia', 'dia da semana', 'dias da semana', 'que dia', 'qual dia', 'quais dias', 'quando vend')) {
    const wd = byWeekday(inRange(d.sales, addDays(now, -56), addDays(now, 1)))
    const total = wd.reduce((a, x) => a + x.revenue, 0)
    const order = wd.map((x, i) => ({ ...x, i })).sort((a, b) => b.revenue - a.revenue)
    return {
      text: `Nas últimas 8 semanas, **${WEEKDAYS_FULL[order[0].i]}** foi o dia mais forte, com ${pct(total ? (order[0].revenue / total) * 100 : 0)} do faturamento, seguido de ${WEEKDAYS_FULL[order[1].i]}. O dia mais fraco é ${WEEKDAYS_FULL[order[6].i]}.`,
      cardsTitle: 'Faturamento por dia (8 semanas)',
      cards: order.slice(0, 4).map((x, i) => ({ label: cap(WEEKDAYS_FULL[x.i]), value: brl0(x.revenue), delta: pct(total ? (x.revenue / total) * 100 : 0), highlight: i === 0 })),
      action: { label: 'Ver evolução da loja', to: '/gestao' },
      followups: ['Vou bater a meta deste mês?', 'Como foi a semana?'],
    }
  }

  /* Semana e mês */
  const past = has(q, 'passad', 'anterior', 'ultim')
  if (has(q, 'semana')) return periodAnswer(d, 'semana', past ? -1 : 0, now)
  if (word(q, 'mes') && past) return periodAnswer(d, 'mes', -1, now)
  if (has(q, 'fatur', 'vend', 'relat', 'resum', 'como esta', 'geral', 'loja') || word(q, 'mes')) {
    return periodAnswer(d, 'mes', 0, now)
  }

  if (has(q, 'ajuda', 'o que voce', 'como funciona', 'pode fazer', 'sabe fazer', 'quem e voce')) return help()

  /* Não entendi: mostra o resumo e o que sei responder */
  const base = periodAnswer(d, 'mes', 0, now)
  return {
    ...base,
    text: `Não encontrei essa informação nos dados da loja. Consigo responder sobre vendas, estoque, reposição, lucro, despesas, metas, equipe e fornecedores — é só citar o produto, a categoria ou a pessoa. Enquanto isso, o resumo do mês: ${base.text}`,
    followups: ['O que preciso repor com urgência?', 'Vou bater a meta deste mês?', 'Qual foi meu lucro este mês?'],
  }
}
