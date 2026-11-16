import type {
  Catalog, Category, Data, Employee, Expense, Payment, Product, Sale, SaleItem, Settings, StockMove, Supplier,
} from '../types'
import { addDays, addMonths, dayKey, daysInMonth, startOfDay, startOfMonth } from '../lib/dates'

export const defaultSettings = (): Settings => ({
  storeName: 'Minha Loja',
  ownerName: '',
  theme: 'light',
  defaultGoal: 0,
  goals: {},
  vip: false,
  onboarded: false,
})

/** Loja vazia, só com as categorias mais comuns para começar */
export const emptyData = (settings: Settings = defaultSettings()): Data => ({
  categories: [
    { id: 'cat-camisetas', name: 'Camisetas' },
    { id: 'cat-polos', name: 'Polos' },
    { id: 'cat-shorts', name: 'Shorts' },
    { id: 'cat-calcas', name: 'Calças' },
  ],
  products: [],
  sales: [],
  moves: [],
  expenses: [],
  suppliers: VIP_SUPPLIERS.map((s) => ({ ...s, quotes: s.quotes.map((q) => ({ ...q })) })),
  employees: [],
  catalogs: [],
  settings,
  ordered: {},
})

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Profile = 'ok' | 'low' | 'zero' | 'gap'
type Cat = 'camisetas' | 'polos' | 'shorts' | 'calcas' | 'camisas' | 'jaquetas' | 'acessorios'

const CATS: [Cat, string][] = [
  ['camisetas', 'Camisetas'],
  ['polos', 'Polos'],
  ['shorts', 'Shorts'],
  ['calcas', 'Calças'],
  ['camisas', 'Camisas'],
  ['jaquetas', 'Jaquetas'],
  ['acessorios', 'Acessórios'],
]

// nome, marca, categoria, preço, custo, popularidade, perfil de estoque, parado nos últimos dias?
const DEFS: [string, string, Cat, number, number, number, Profile, boolean?][] = [
  ['Camiseta Básica Algodão', 'Rua 7', 'camisetas', 59.9, 24, 10, 'ok'],
  ['Camiseta Oversized', 'Rua 7', 'camisetas', 89.9, 36, 9, 'zero'],
  ['Camiseta Estampada Tropical', 'Costa Sul', 'camisetas', 79.9, 31, 6, 'ok'],
  ['Camiseta Henley', 'Vértice', 'camisetas', 99.9, 42, 4, 'ok'],
  ['Regata Dry Fit', 'Costa Sul', 'camisetas', 49.9, 19, 5, 'ok'],
  ['Polo Piquet Clássica', 'Vértice', 'polos', 129.9, 54, 9, 'low'],
  ['Polo Listrada', 'Atlântica', 'polos', 139.9, 60, 5, 'ok'],
  ['Polo Slim Fit', 'Vértice', 'polos', 149.9, 63, 6, 'ok'],
  ['Polo Manga Longa', 'Atlântica', 'polos', 169.9, 74, 2.5, 'ok'],
  ['Short Tactel', 'Costa Sul', 'shorts', 69.9, 27, 7, 'low'],
  ['Short Moletom', 'Rua 7', 'shorts', 89.9, 36, 5, 'ok'],
  ['Short Linho', 'Linea Nove', 'shorts', 119.9, 50, 3.5, 'ok'],
  ['Short Jeans', 'Monte Claro', 'shorts', 109.9, 46, 4, 'ok'],
  ['Calça Jeans Slim', 'Monte Claro', 'calcas', 189.9, 82, 7, 'low'],
  ['Calça Chino', 'Linea Nove', 'calcas', 179.9, 76, 5, 'ok'],
  ['Calça Jogger', 'Rua 7', 'calcas', 149.9, 61, 5, 'ok'],
  ['Calça Alfaiataria', 'Linea Nove', 'calcas', 229.9, 98, 2, 'ok', true],
  ['Calça Cargo', 'Monte Claro', 'calcas', 199.9, 85, 4, 'ok'],
  ['Camisa Linho Manga Curta', 'Linea Nove', 'camisas', 159.9, 68, 5, 'gap'],
  ['Camisa Social Slim', 'Atlântica', 'camisas', 179.9, 75, 3.5, 'ok'],
  ['Camisa Xadrez Flanela', 'Monte Claro', 'camisas', 149.9, 62, 2, 'ok', true],
  ['Jaqueta Jeans', 'Monte Claro', 'jaquetas', 259.9, 115, 2.5, 'gap'],
  ['Jaqueta Corta-Vento', 'Costa Sul', 'jaquetas', 219.9, 94, 2, 'ok'],
  ['Moletom Canguru', 'Rua 7', 'jaquetas', 189.9, 80, 3, 'ok'],
  ['Boné Aba Curva', 'Rua 7', 'acessorios', 59.9, 22, 5, 'ok'],
  ['Cinto de Couro', 'Vértice', 'acessorios', 79.9, 30, 3, 'ok'],
  ['Kit 3 Meias Cano Médio', 'Costa Sul', 'acessorios', 39.9, 14, 6, 'ok'],
]

const TOPS = ['P', 'M', 'G', 'GG']
const TOPS_W = [2, 4, 4, 2]
const BOTTOMS = ['38', '40', '42', '44', '46']
const BOTTOMS_W = [1.5, 3, 4, 3, 1.5]

const sizesFor = (cat: Cat): [string[], number[]] =>
  cat === 'acessorios' ? [['Único'], [1]] : cat === 'shorts' || cat === 'calcas' ? [BOTTOMS, BOTTOMS_W] : [TOPS, TOPS_W]

const SUPPLIER_BY_CAT: Record<Cat, string> = {
  camisetas: 'f-1', polos: 'f-2', shorts: 'f-5', calcas: 'f-3', camisas: 'f-4', jaquetas: 'f-2', acessorios: 'f-6',
}

const MY_SUPPLIERS: Supplier[] = [
  {
    id: 'f-1', kind: 'meu', name: 'Confecções Aurora', contact: 'Marcos Lima', phone: '(11) 90000-1001',
    email: 'vendas@confeccoesaurora.example', city: 'São Paulo, SP', minOrder: 800, leadDays: 7, rating: 4.5,
    notes: 'Atende no Brás. Bom para reposição rápida.',
    quotes: [{ item: 'Camisetas', price: 23.9 }, { item: 'Polos', price: 52 }, { item: 'Camisas', price: 61 }],
  },
  {
    id: 'f-2', kind: 'meu', name: 'Malharia Serra Azul', contact: 'Ana Paula Schmitt', phone: '(47) 90000-1002',
    email: 'comercial@serraazul.example', city: 'Brusque, SC', minOrder: 1500, leadDays: 12, rating: 4.7,
    quotes: [{ item: 'Camisetas', price: 21.5 }, { item: 'Polos', price: 49.9 }, { item: 'Jaquetas', price: 84 }],
  },
  {
    id: 'f-3', kind: 'meu', name: 'Jeans Agreste Atacado', contact: 'José Carlos', phone: '(81) 90000-1003',
    city: 'Toritama, PE', minOrder: 2000, leadDays: 15, rating: 4.2,
    quotes: [{ item: 'Calças', price: 68 }, { item: 'Shorts', price: 39 }, { item: 'Jaquetas', price: 98 }],
  },
  {
    id: 'f-4', kind: 'meu', name: 'Têxtil Bom Retiro', contact: 'Helena Kim', phone: '(11) 90000-1004',
    email: 'helena@textilbomretiro.example', city: 'São Paulo, SP', minOrder: 600, leadDays: 5, rating: 4.0,
    quotes: [{ item: 'Camisas', price: 58.5 }, { item: 'Calças', price: 79 }, { item: 'Shorts', price: 34.9 }],
  },
  {
    id: 'f-5', kind: 'meu', name: 'Goiás Moda Atacado', contact: 'Fernanda Reis', phone: '(62) 90000-1005',
    city: 'Goiânia, GO', minOrder: 1000, leadDays: 10, rating: 4.4,
    quotes: [{ item: 'Shorts', price: 31.5 }, { item: 'Camisetas', price: 25 }, { item: 'Calças', price: 72 }],
  },
  {
    id: 'f-6', kind: 'meu', name: 'Prime Acessórios', contact: 'Rodrigo Alves', phone: '(21) 90000-1006',
    city: 'Rio de Janeiro, RJ', minOrder: 300, leadDays: 6, rating: 4.6,
    quotes: [{ item: 'Acessórios', price: 19.9 }],
  },
]

/** Contatos VIP de demonstração (a lista real é fornecida pela ALLNOVA aos assinantes) */
export const VIP_SUPPLIERS: Supplier[] = [
  {
    id: 'vip-1', kind: 'vip', name: 'Fábrica Catarinense Premium', contact: 'Luiza Werner', phone: '(47) 90000-2001',
    email: 'atacado@catarinensepremium.example', city: 'Brusque, SC', minOrder: 2500, leadDays: 10, rating: 4.9,
    notes: 'Venda direta de fábrica, com grade aberta.',
    quotes: [{ item: 'Polos', price: 44.9 }, { item: 'Camisetas', price: 19.9 }, { item: 'Jaquetas', price: 78 }],
  },
  {
    id: 'vip-2', kind: 'vip', name: 'Polo Têxtil do Agreste', contact: 'Severino Duarte', phone: '(81) 90000-2002',
    city: 'Caruaru, PE', minOrder: 3000, leadDays: 14, rating: 4.8,
    quotes: [{ item: 'Calças', price: 61.5 }, { item: 'Shorts', price: 29.9 }],
  },
  {
    id: 'vip-3', kind: 'vip', name: 'Direto da Fábrica SP', contact: 'Paulo Nakamura', phone: '(11) 90000-2003',
    email: 'paulo@diretodafabricasp.example', city: 'São Paulo, SP', minOrder: 1800, leadDays: 6, rating: 4.8,
    quotes: [{ item: 'Camisas', price: 52 }, { item: 'Camisetas', price: 20.9 }, { item: 'Polos', price: 46.5 }],
  },
  {
    id: 'vip-4', kind: 'vip', name: 'Importadora Atlântico', contact: 'Beatriz Fontes', phone: '(47) 90000-2004',
    city: 'Itajaí, SC', minOrder: 4000, leadDays: 20, rating: 4.7,
    quotes: [{ item: 'Jaquetas', price: 72 }, { item: 'Acessórios', price: 15.9 }],
  },
  {
    id: 'vip-5', kind: 'vip', name: 'Malhas Minas Premium', contact: 'Gustavo Teixeira', phone: '(37) 90000-2005',
    city: 'Divinópolis, MG', minOrder: 2000, leadDays: 9, rating: 4.9,
    quotes: [{ item: 'Camisetas', price: 18.9 }, { item: 'Shorts', price: 28.5 }],
  },
  {
    id: 'vip-6', kind: 'vip', name: 'Alfaiataria Paulista Atacado', contact: 'Renata Moura', phone: '(11) 90000-2006',
    city: 'São Paulo, SP', minOrder: 2200, leadDays: 8, rating: 4.8,
    quotes: [{ item: 'Calças', price: 64 }, { item: 'Camisas', price: 54.9 }],
  },
]

const EMPLOYEES: Employee[] = [
  { id: 'e-1', name: 'Camila Rocha', role: 'Gerente', phone: '(11) 90000-3001', salary: 2600, commission: 2, goal: 15000, color: '#7c3aed', active: true },
  { id: 'e-2', name: 'Diego Martins', role: 'Vendedor', phone: '(11) 90000-3002', salary: 2000, commission: 3, goal: 12500, color: '#eb6834', active: true },
  { id: 'e-3', name: 'Larissa Nunes', role: 'Vendedora', phone: '(11) 90000-3003', salary: 2000, commission: 3, goal: 11000, color: '#1baf7a', active: true },
  { id: 'e-4', name: 'Rafael Souza', role: 'Vendedor (meio período)', salary: 1300, commission: 3, goal: 6500, color: '#e87ba4', active: true },
]
const EMP_W = [0.34, 0.28, 0.24, 0.14]

const PAYMENTS: Payment[] = ['pix', 'credito', 'debito', 'dinheiro']
const PAY_W = [0.4, 0.35, 0.15, 0.1]

// domingo … sábado
const DAY_W = [4, 5, 5, 6, 7, 9.5, 13]
const GROWTH = [0.8, 0.86, 0.92, 0.98, 1.03, 1.1]

/** Loja de demonstração: ~6 meses de movimento, sempre terminando em "agora" */
export function buildDemo(base: Settings, now = new Date()): Data {
  const rnd = mulberry32(20261115)
  const between = (a: number, b: number) => a + rnd() * (b - a)
  const int = (a: number, b: number) => Math.floor(between(a, b + 1))
  const weighted = <T,>(items: T[], weights: number[]): T => {
    const total = weights.reduce((a, b) => a + b, 0)
    let x = rnd() * total
    for (let i = 0; i < items.length; i++) {
      x -= weights[i]
      if (x <= 0) return items[i]
    }
    return items[items.length - 1]
  }

  const categories: Category[] = CATS.map(([key, name]) => ({ id: `cat-${key}`, name }))
  const firstMonth = addMonths(startOfMonth(now), -5)

  const products: Product[] = DEFS.map(([name, brand, cat, price, cost, , profile], idx) => {
    const [sizes, w] = sizesFor(cat)
    const single = sizes.length === 1
    const maxW = Math.max(...w)
    let qtys = sizes.map((_, i) => (single ? int(14, 26) : Math.max(3, Math.round(9 * (w[i] / maxW) * between(0.75, 1.3)))))
    if (profile === 'zero') qtys = qtys.map(() => 0)
    if (profile === 'low') qtys = qtys.map((_, i) => (i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 1 : 0))
    if (profile === 'gap') qtys[w.indexOf(maxW)] = 0
    return {
      id: `p-${idx + 1}`,
      code: idx + 1,
      name,
      brand,
      categoryId: `cat-${cat}`,
      price,
      cost,
      sizes: sizes.map((size, i) => ({ size, qty: qtys[i] })),
      minStock: single ? 6 : 8,
      photos: [],
      supplierId: SUPPLIER_BY_CAT[cat],
      createdAt: +addDays(firstMonth, idx),
    }
  })

  /* Vendas */
  const sales: Sale[] = []
  const today = startOfDay(now)
  const stallFrom = +addDays(today, -36)
  let n = 0
  for (let d = firstMonth; +d <= +today; d = addDays(d, 1)) {
    const mIdx = Math.min(5, (d.getFullYear() - firstMonth.getFullYear()) * 12 + d.getMonth() - firstMonth.getMonth())
    const isToday = +d === +today
    const open = +d + 9 * 3600e3
    const close = isToday ? Math.min(+d + 19 * 3600e3, +now) : +d + 19 * 3600e3
    if (close <= open) continue
    const fraction = (close - open) / (10 * 3600e3)
    const count = Math.round(DAY_W[d.getDay()] * GROWTH[mIdx] * between(0.72, 1.28) * fraction)
    const stalledNow = +d >= stallFrom
    const weights = DEFS.map((def) => (stalledNow && def[7] ? 0 : def[5]))
    for (let i = 0; i < count; i++) {
      const nItems = weighted([1, 2, 3], [0.56, 0.3, 0.14])
      const items: SaleItem[] = []
      for (let k = 0; k < nItems; k++) {
        const p = weighted(products, weights)
        const cat = p.categoryId.replace('cat-', '') as Cat
        const [sizes, w] = sizesFor(cat)
        const size = weighted(sizes, w)
        const existing = items.find((it) => it.productId === p.id && it.size === size)
        if (existing) existing.qty += 1
        else {
          items.push({
            productId: p.id, name: p.name, categoryId: p.categoryId, size,
            qty: rnd() < 0.08 ? 2 : 1, price: p.price, cost: p.cost,
          })
        }
      }
      const gross = items.reduce((a, it) => a + it.price * it.qty, 0)
      const discount = rnd() < 0.16 ? Math.round(gross * weighted([0.05, 0.1], [0.6, 0.4]) * 100) / 100 : 0
      sales.push({
        id: `v-${++n}`,
        ts: Math.floor(between(open, close)),
        items,
        discount,
        total: Math.round((gross - discount) * 100) / 100,
        payment: weighted(PAYMENTS, PAY_W),
        employeeId: weighted(EMPLOYEES, EMP_W).id,
      })
    }
  }
  sales.sort((a, b) => a.ts - b.ts)

  /* Despesas */
  const expenses: Expense[] = []
  let en = 0
  const todayKey = dayKey(today)
  const salaries = EMPLOYEES.reduce((a, e) => a + e.salary, 0)
  for (let i = 0; i < 6; i++) {
    const m = addMonths(firstMonth, i)
    const prevStart = +addMonths(m, -1)
    const prevRevenue = sales.filter((s) => s.ts >= prevStart && s.ts < +m).reduce((a, s) => a + s.total, 0)
    const rows: [number, string, Expense['category'], number][] = [
      [5, 'Aluguel da loja', 'aluguel', 3200],
      [5, 'Folha de pagamento', 'salarios', salaries],
      [10, 'Energia elétrica', 'contas', Math.round(between(310, 395))],
      [10, 'Internet e telefone', 'contas', 149.9],
      [12, 'Sistema e maquininha', 'contas', 89.9],
      [15, 'Tráfego pago no Instagram', 'marketing', Math.round(between(500, 820) / 10) * 10],
      [20, 'Simples Nacional', 'impostos', Math.round((prevRevenue || 36000) * 0.06)],
      [22, 'Embalagens e sacolas', 'outros', Math.round(between(180, 260))],
      [25, 'Contador', 'outros', 380],
    ]
    for (const [day, description, category, amount] of rows) {
      const date = dayKey(new Date(m.getFullYear(), m.getMonth(), Math.min(day, daysInMonth(m))))
      if (date > todayKey) continue
      expenses.push({ id: `d-${++en}`, date, description, category, amount })
    }
  }

  /* Movimentações recentes de estoque */
  const moveOf = (daysAgo: number, pIdx: number, type: StockMove['type'], deltas: number[], note: string): StockMove => {
    const p = products[pIdx]
    return {
      id: `m-${daysAgo}-${pIdx}`,
      ts: +addDays(today, -daysAgo) + 10.5 * 3600e3,
      productId: p.id,
      productName: p.name,
      type,
      changes: p.sizes.map((s, i) => ({ size: s.size, delta: deltas[i] ?? 0 })).filter((c) => c.delta !== 0),
      note,
    }
  }
  const moves: StockMove[] = [
    moveOf(2, 0, 'entrada', [6, 10, 10, 6], 'Reposição — Confecções Aurora'),
    moveOf(4, 24, 'entrada', [20], 'Reposição — Prime Acessórios'),
    moveOf(6, 10, 'entrada', [3, 6, 8, 6, 3], 'Reposição — Goiás Moda Atacado'),
    moveOf(9, 22, 'saida', [0, -1, 0, 0], 'Peça com defeito devolvida'),
    moveOf(12, 14, 'ajuste', [0, 1, -1, 0, 0], 'Contagem de inventário'),
  ].sort((a, b) => b.ts - a.ts)

  const catalogs: Catalog[] = [
    {
      id: 'c-1',
      name: 'Destaques da semana',
      message: 'Oi! Separei as peças que mais estão saindo aqui na loja. Qualquer uma, é só me chamar que eu reservo pra você.',
      productIds: ['p-1', 'p-3', 'p-7', 'p-8', 'p-11', 'p-15', 'p-16', 'p-24'],
      showPrices: true,
      createdAt: +addDays(today, -3),
    },
    {
      id: 'c-2',
      name: 'Polos e camisas',
      message: 'Chegou reposição de polos e camisas. Dá uma olhada nos modelos e tamanhos disponíveis:',
      productIds: ['p-7', 'p-8', 'p-9', 'p-19', 'p-20'],
      showPrices: true,
      createdAt: +addDays(today, -10),
    },
  ]

  return {
    categories,
    products,
    sales,
    moves,
    expenses,
    suppliers: [...MY_SUPPLIERS, ...VIP_SUPPLIERS].map((s) => ({ ...s, quotes: s.quotes.map((q) => ({ ...q })) })),
    employees: EMPLOYEES.map((e) => ({ ...e })),
    catalogs,
    settings: { ...base, defaultGoal: 45000, goals: {} },
    ordered: {},
  }
}
