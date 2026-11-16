import { useEffect, useMemo, useState } from 'react'
import type { Data } from './types'
import { reorderAlerts } from './lib/analytics'
import { useStore } from './store/store'

/** Todos os dados da loja num objeto estável (para análises que cruzam várias áreas) */
export function useData(): Data {
  const categories = useStore((s) => s.categories)
  const products = useStore((s) => s.products)
  const sales = useStore((s) => s.sales)
  const moves = useStore((s) => s.moves)
  const expenses = useStore((s) => s.expenses)
  const suppliers = useStore((s) => s.suppliers)
  const employees = useStore((s) => s.employees)
  const catalogs = useStore((s) => s.catalogs)
  const settings = useStore((s) => s.settings)
  const ordered = useStore((s) => s.ordered)
  return useMemo(
    () => ({ categories, products, sales, moves, expenses, suppliers, employees, catalogs, settings, ordered }),
    [categories, products, sales, moves, expenses, suppliers, employees, catalogs, settings, ordered],
  )
}

export function useAlerts() {
  const products = useStore((s) => s.products)
  const sales = useStore((s) => s.sales)
  return useMemo(() => reorderAlerts(products, sales), [products, sales])
}

export function useCategoryNames() {
  const categories = useStore((s) => s.categories)
  return useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])
}

export function useIsDesktop() {
  const query = '(min-width: 1024px)'
  const [is, setIs] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setIs(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return is
}

export function useHydrated() {
  const [ok, setOk] = useState(() => useStore.persist.hasHydrated())
  useEffect(() => {
    if (useStore.persist.hasHydrated()) setOk(true)
    return useStore.persist.onFinishHydration(() => setOk(true))
  }, [])
  return ok
}

/** "Agora" que se atualiza a cada minuto, para os períodos não ficarem congelados */
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}
