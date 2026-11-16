import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Bell, BookImage, CalendarDays, ChevronLeft, ChevronRight, PackagePlus, Plus, Shirt, Sparkles, Target,
} from 'lucide-react'
import { NAV } from '../nav'
import {
  byEmployee, byProduct, compare, dailySeries, delta, inRange, monthFinance, periodSeries, stockTotals, totals,
} from '../lib/analytics'
import { addDays, MONTHS_FULL, startOfDay, WEEKDAYS, WEEKDAYS_FULL, weekdayIndex } from '../lib/dates'
import { brl, brl0, firstName, num, pct, plural } from '../lib/format'
import { buildInsights } from '../lib/insights'
import { useAlerts, useCategoryNames, useData, useIsDesktop, useNow } from '../hooks'
import { useChat } from '../store/chat'
import { useUI } from '../store/ui'
import { AlertBadge } from '../components/AlertBadge'
import { BarList, CompareLines, PillMeter, TrendArea } from '../components/charts'
import { LogoMark } from '../components/Logo'
import { ProductThumb } from '../components/ProductThumb'
import { SearchBox } from '../components/Shell'
import { Avatar, Button, Card, CardHead, cn, Delta, IconButton, Progress, Segmented, StatTile } from '../components/ui'

type Range = '30d' | '12s' | '6m'

export function Home() {
  const d = useData()
  const now = useNow()
  const alerts = useAlerts()
  const catNames = useCategoryNames()
  const navigate = useNavigate()
  const desktop = useIsDesktop()
  const openSale = useUI((s) => s.openSale)
  const openStockMove = useUI((s) => s.openStockMove)
  const setAI = useUI((s) => s.setAI)
  const send = useChat((s) => s.send)
  const [range, setRange] = useState<Range>('30d')
  const [slide, setSlide] = useState(0)

  const today = startOfDay(now)
  const month = useMemo(() => compare(d.sales, 'mes', 0, now), [d.sales, now])
  const week = useMemo(() => compare(d.sales, 'semana', 0, now), [d.sales, now])
  const fin = useMemo(() => monthFinance(d.sales, d.expenses, d.settings, 0, now), [d.sales, d.expenses, d.settings, now])
  const stock = useMemo(() => stockTotals(d.products), [d.products])
  const todayT = useMemo(() => totals(inRange(d.sales, today, addDays(today, 1))), [d.sales, +today]) // eslint-disable-line react-hooks/exhaustive-deps
  const lastWeekSameTime = useMemo(
    () => totals(inRange(d.sales, addDays(today, -7), new Date(+now - 7 * 86400e3))),
    [d.sales, now], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const trend = useMemo(() => {
    if (range === '30d') {
      return dailySeries(d.sales, addDays(today, -29), addDays(today, 1)).map((p) => ({
        label: p.label, value: p.revenue, full: `${WEEKDAYS_FULL[weekdayIndex(p.date)]}, ${p.label}`,
      }))
    }
    return periodSeries(d.sales, range === '12s' ? 'semana' : 'mes', range === '12s' ? 12 : 6, now).map((p) => ({
      label: p.label, value: p.revenue, full: range === '12s' ? `Semana de ${p.full}` : p.full,
    }))
  }, [d.sales, range, now]) // eslint-disable-line react-hooks/exhaustive-deps

  const weekLines = useMemo(() => {
    const cur = dailySeries(week.curSales, week.cur.start, week.cur.end)
    const prev = dailySeries(inRange(d.sales, week.prev.start, week.prev.end), week.prev.start, week.prev.end)
    return WEEKDAYS.map((label, i) => ({
      label, atual: +cur[i].date <= +today ? cur[i].revenue : null, anterior: prev[i].revenue,
    }))
  }, [week, d.sales]) // eslint-disable-line react-hooks/exhaustive-deps

  const insights = useMemo(() => buildInsights(d, now), [d, now])
  const insight = insights.length ? insights[slide % insights.length] : null
  const topProducts = useMemo(() => byProduct(month.curSales).slice(0, 5), [month])
  const team = useMemo(() => byEmployee(month.curSales, d.employees).slice(0, 4), [month, d.employees])

  const monthName = MONTHS_FULL[now.getMonth()]
  const prevMonthName = MONTHS_FULL[(now.getMonth() + 11) % 12]
  const emptyStore = d.products.length === 0 && d.sales.length === 0

  const askNova = (question: string) => {
    void send(question)
    if (desktop) setAI(true)
    else navigate('/ia')
  }

  return (
    <div>
      {/* ───── Topo no celular ───── */}
      <section className="rounded-b-[32px] bg-surface px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] shadow-card lg:hidden">
        <div className="flex items-center gap-3">
          <LogoMark size={46} className="rounded-full" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-ink">Olá{d.settings.ownerName ? `, ${firstName(d.settings.ownerName)}` : ''}</div>
            <div className="truncate text-xs text-ink-3">{d.settings.storeName}</div>
          </div>
          <IconButton label="Nova IA" onClick={() => navigate('/ia')}><Sparkles size={18} className="text-brand" /></IconButton>
          <IconButton label={`${alerts.length} avisos de reposição`} onClick={() => navigate('/avisos')}>
            <Bell size={18} />
            {alerts.length > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-bad ring-2 ring-surface-2" />}
          </IconButton>
        </div>
        <SearchBox className="mt-4 [&_input]:bg-surface-2 [&_input]:shadow-none" />
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Link to="/relatorios" className="flex items-center justify-between gap-2 rounded-[20px] bg-brand p-3.5 text-white">
            <span className="min-w-0">
              <span className="block truncate text-lg font-semibold leading-tight">{brl0(todayT.revenue)}</span>
              <span className="block text-xs text-white/80">Vendas de hoje</span>
            </span>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#17141f]"><ChevronRight size={17} /></span>
          </Link>
          <Link to="/avisos" className="flex items-center justify-between gap-2 rounded-[20px] bg-brand p-3.5 text-white">
            <span className="min-w-0">
              <span className="block text-lg font-semibold leading-tight">{String(alerts.length).padStart(2, '0')}</span>
              <span className="block truncate text-xs text-white/80">Para repor</span>
            </span>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#17141f]"><ChevronRight size={17} /></span>
          </Link>
        </div>
      </section>

      {/* ───── Atalhos no celular ───── */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-4 lg:hidden">
        {NAV.filter((n) => !['/', '/produtos', '/ia'].includes(n.to)).map((n) => (
          <Link key={n.to} to={n.to} className="flex h-12 shrink-0 items-center gap-2.5 rounded-full bg-surface pl-1.5 pr-4 text-[13px] font-semibold text-ink shadow-card">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-brand"><n.icon size={17} /></span>
            {n.label}
          </Link>
        ))}
      </div>

      <div className="space-y-4 px-4 lg:px-0">
        {emptyStore && (
          <Card className="hero-bg">
            <h2 className="text-xl font-semibold tracking-tight">Vamos colocar a sua loja aqui dentro</h2>
            <p className="mt-1.5 max-w-xl text-[13px] opacity-80">
              Comece cadastrando os produtos com tamanhos, preço e custo. Depois registre as vendas do dia — os relatórios, os avisos de reposição e a Nova passam a trabalhar com esses dados.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => navigate('/produtos?novo=1')} icon={<Plus size={16} />}>Cadastrar produto</Button>
              <Button variant="outline" onClick={() => navigate('/ajustes')}>Carregar loja de demonstração</Button>
            </div>
          </Card>
        )}

        {/* Ações rápidas (celular) */}
        <section className="lg:hidden">
          <h2 className="mb-2.5 text-base font-semibold text-ink">Ações rápidas</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Nova venda', icon: <Plus size={18} />, on: openSale },
              { label: 'Novo produto', icon: <Shirt size={18} />, on: () => navigate('/produtos?novo=1') },
              { label: 'Entrada de estoque', icon: <PackagePlus size={18} />, on: () => openStockMove() },
              { label: 'Enviar catálogo', icon: <BookImage size={18} />, on: () => navigate('/catalogo') },
            ].map((a) => (
              <button key={a.label} type="button" onClick={a.on} className="flex items-center gap-3 rounded-[20px] bg-surface p-3 text-left shadow-card">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink">{a.icon}</span>
                <span className="text-[13px] font-semibold leading-tight text-ink">{a.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ───── Linha 1: indicadores + faturamento ───── */}
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="grid grid-cols-2 gap-4 lg:col-span-5">
            <StatTile
              label="Faturamento hoje" value={brl0(todayT.revenue)}
              delta={delta(todayT.revenue, lastWeekSameTime.revenue)}
              hint="vs. semana passada"
            />
            <StatTile
              label="Vendas no mês" value={num(month.curT.count)} unit="vendas"
              delta={delta(month.curT.count, month.prevT.count)} hint={`${num(month.curT.items)} peças vendidas`}
            />
            <StatTile
              label="Ticket médio" value={brl0(month.curT.ticket)}
              delta={delta(month.curT.ticket, month.prevT.ticket)} hint={`Em ${monthName}`}
            />
            <StatTile label="Peças em estoque" value={num(stock.pieces)} unit="peças" hint={`${brl0(stock.cost)} a preço de custo`} />
          </div>

          <Card className="lg:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">Faturamento</h2>
              <Segmented
                label="Período do gráfico" value={range} onChange={setRange}
                options={[{ value: '30d', label: '30 dias' }, { value: '12s', label: '12 semanas' }, { value: '6m', label: '6 meses' }]}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[38px] font-semibold leading-none tracking-tight text-ink lg:text-[48px]">{brl0(month.curT.revenue)}</span>
              <Delta value={delta(month.curT.revenue, month.prevT.revenue)} className="text-[13px]" />
            </div>
            <p className="mt-2 text-xs text-ink-3">
              Em {monthName}, contra {brl0(month.prevT.revenue)} no mesmo período de {prevMonthName}
            </p>
            <div className="mt-4">
              <TrendArea data={trend} name="Faturamento" format={brl} height={196} />
            </div>
          </Card>
        </div>

        {/* ───── Linha 2: insight, meta e semana ───── */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="hero-bg flex min-h-[280px] flex-col justify-between overflow-hidden">
            {insight ? (
              <>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-[#1d1235] dark:bg-white/15 dark:text-white">
                        <Sparkles size={18} />
                      </span>
                      <div>
                        <div className="text-base font-semibold leading-tight">Insight da Nova</div>
                        <div className="text-xs opacity-70">{insight.tag}</div>
                      </div>
                    </div>
                    <span className="text-xs opacity-70">Da sua loja</span>
                  </div>
                  <h3 className="mt-5 text-[21px] font-semibold leading-snug tracking-tight">{insight.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed opacity-80">{insight.text}</p>
                </div>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div className="leading-none">
                    <span className="text-2xl font-semibold">{(slide % insights.length) + 1}</span>
                    <span className="text-xs opacity-70"> /{insights.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button" onClick={() => askNova(insight.question)}
                      className="h-10 rounded-full bg-[#17141f] px-4 text-[13px] font-semibold text-white transition hover:opacity-90"
                    >
                      Perguntar à Nova
                    </button>
                    {[-1, 1].map((dir) => (
                      <button
                        key={dir} type="button" aria-label={dir < 0 ? 'Insight anterior' : 'Próximo insight'}
                        onClick={() => setSlide((s) => (s + dir + insights.length) % insights.length)}
                        className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#17141f] shadow-sm transition hover:scale-105"
                      >
                        {dir < 0 ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-[#1d1235] dark:bg-white/15 dark:text-white"><Sparkles size={18} /></span>
                <h3 className="mt-5 text-[21px] font-semibold leading-snug tracking-tight">Os insights aparecem aqui</h3>
                <p className="mt-2 text-[13px] leading-relaxed opacity-80">Assim que houver produtos e vendas, a Nova destaca o que merece a sua atenção.</p>
              </div>
            )}
          </Card>

          <Card className="flex flex-col">
            <CardHead
              icon={<Target size={18} />} title="Meta do mês" subtitle={`Faturamento de ${monthName}`}
              right={fin.goal > 0 && (
                <div className="text-right">
                  <div className="text-base font-semibold leading-tight text-ink">{brl0(fin.goal)}</div>
                  <div className="text-xs text-ink-3">Meta</div>
                </div>
              )}
            />
            {fin.goal > 0 ? (
              <>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-[30px] font-semibold leading-none tracking-tight text-ink">{brl0(fin.revenue)}</span>
                  <span className="text-xs text-ink-3">{pct(fin.progress)} da meta</span>
                </div>
                <PillMeter value={fin.revenue} total={fin.goal} className="mt-4" />
                <div className="mt-1.5 flex justify-between text-[11px] text-ink-3">
                  <span>0</span>
                  <span>{fin.projection !== null && `Projeção: ${brl0(fin.projection)}`}</span>
                </div>
                <div className="mt-auto grid grid-cols-3 gap-3 pt-5">
                  {[
                    { label: 'Lucro bruto', value: brl0(fin.gross) },
                    { label: 'Despesas', value: brl0(fin.expenses) },
                    { label: 'Margem', value: pct(fin.margin) },
                  ].map((s) => (
                    <div key={s.label} className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{s.value}</div>
                      <div className="text-xs text-ink-3">{s.label}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-6 flex flex-1 flex-col items-start justify-center">
                <p className="text-[13px] text-ink-2">Defina quanto você quer faturar neste mês para acompanhar o ritmo dia a dia.</p>
                <Button className="mt-4" size="sm" variant="brand" onClick={() => navigate('/financeiro')}>Definir meta</Button>
              </div>
            )}
          </Card>

          <Card className="flex flex-col">
            <CardHead
              icon={<CalendarDays size={18} />} title="Semana atual" subtitle="Comparada à semana passada"
              right={
                <div className="text-right">
                  <div className="text-base font-semibold leading-tight text-ink">{week.cur.label}</div>
                  <div className="text-xs text-ink-3">Seg a dom</div>
                </div>
              }
            />
            <div className="mt-5">
              <CompareLines data={weekLines} currentName="Esta semana" previousName="Semana passada" format={brl} height={118} showAxis={false} />
            </div>
            <div className="mt-auto flex items-end justify-between gap-3 pt-4">
              <span className="text-[30px] font-semibold leading-none tracking-tight text-ink">{brl0(week.curT.revenue)}</span>
              <div className="text-right">
                <div className="text-xs text-ink-3">no mesmo trecho</div>
                <Delta value={delta(week.curT.revenue, week.prevT.revenue)} />
              </div>
            </div>
          </Card>
        </div>

        {/* ───── Linha 3: reposição, mais vendidos e equipe ───── */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHead title="Reposição" subtitle={alerts.length ? `${plural(alerts.length, 'aviso', 'avisos')} em aberto` : 'Tudo em dia'} right={<SeeAll to="/avisos" />} />
            {alerts.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-ink-3">Nenhum produto abaixo do mínimo.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {alerts.slice(0, 4).map((a) => (
                  <li key={a.product.id} className="flex items-center gap-3">
                    <ProductThumb product={a.product} categoryName={catNames.get(a.product.categoryId)} className="h-10 w-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-ink">{a.product.name}</div>
                      <div className="text-xs text-ink-3">{plural(a.total, 'peça', 'peças')} · mínimo {a.product.minStock}</div>
                    </div>
                    <AlertBadge level={a.level} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHead title="Mais vendidos" subtitle={`Peças vendidas em ${monthName}`} right={<SeeAll to="/relatorios" />} />
            <div className="mt-4">
              <BarList
                items={topProducts.map((p) => ({ key: p.id, label: p.name, value: p.qty }))}
                format={(n) => `${num(n)} un.`} empty="Ainda não há vendas neste mês."
              />
            </div>
          </Card>

          <Card>
            <CardHead title="Equipe" subtitle="Vendido no mês e avanço na meta" right={<SeeAll to="/equipe" />} />
            {team.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-ink-3">Cadastre a equipe para acompanhar as metas.</p>
            ) : (
              <ul className="mt-4 space-y-3.5">
                {team.map((r) => {
                  const e = d.employees.find((x) => x.id === r.id)
                  const p = e?.goal ? (r.revenue / e.goal) * 100 : 0
                  return (
                    <li key={r.id} className="flex items-center gap-3">
                      <Avatar name={r.name} color={e?.color} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-ink">{r.name}</span>
                          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">{brl0(r.revenue)}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Progress value={p} className="flex-1" />
                          <span className={cn('w-9 text-right text-xs tabular-nums text-ink-3')}>{e?.goal ? pct(p) : '—'}</span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function SeeAll({ to }: { to: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2 hover:text-brand-ink">
      Ver tudo <ArrowRight size={13} />
    </Link>
  )
}
