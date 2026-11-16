export type ID = string

export interface Category {
  id: ID
  name: string
}

export interface SizeStock {
  size: string
  qty: number
}

export interface Product {
  id: ID
  /** Número sequencial do produto na loja (#0001, #0002…) */
  code: number
  name: string
  brand: string
  categoryId: ID
  price: number
  cost: number
  sizes: SizeStock[]
  /** Estoque mínimo: abaixo disso o produto entra nos avisos de reposição */
  minStock: number
  /** Fotos em data URL (já redimensionadas) */
  photos: string[]
  supplierId?: ID
  notes?: string
  createdAt: number
}

export type Payment = 'pix' | 'credito' | 'debito' | 'dinheiro'

export interface SaleItem {
  productId: ID
  name: string
  categoryId: ID
  size: string
  qty: number
  price: number
  cost: number
}

export interface Sale {
  id: ID
  ts: number
  items: SaleItem[]
  discount: number
  total: number
  payment: Payment
  employeeId?: ID
  customer?: string
}

export type MoveType = 'entrada' | 'saida' | 'ajuste'

export interface StockMove {
  id: ID
  ts: number
  productId: ID
  productName: string
  type: MoveType
  /** Variação por tamanho (positiva ou negativa) */
  changes: { size: string; delta: number }[]
  note?: string
}

export type ExpenseCategory = 'aluguel' | 'salarios' | 'contas' | 'marketing' | 'impostos' | 'outros'

export interface Expense {
  id: ID
  /** YYYY-MM-DD */
  date: string
  description: string
  category: ExpenseCategory
  amount: number
}

export interface Quote {
  /** Nome da categoria cotada (ex.: "Camisetas") */
  item: string
  /** Preço médio por peça */
  price: number
}

export interface Supplier {
  id: ID
  kind: 'meu' | 'vip'
  name: string
  contact: string
  phone: string
  email?: string
  city: string
  minOrder: number
  leadDays: number
  rating: number
  notes?: string
  quotes: Quote[]
}

export interface Employee {
  id: ID
  name: string
  role: string
  phone?: string
  salary: number
  /** Comissão em % sobre as vendas */
  commission: number
  /** Meta mensal de vendas em R$ */
  goal: number
  color: string
  active: boolean
}

export interface Catalog {
  id: ID
  name: string
  message: string
  productIds: ID[]
  showPrices: boolean
  createdAt: number
}

export interface Settings {
  storeName: string
  ownerName: string
  theme: 'light' | 'dark'
  /** Meta de faturamento padrão por mês */
  defaultGoal: number
  /** Metas específicas por mês (chave YYYY-MM) */
  goals: Record<string, number>
  vip: boolean
  onboarded: boolean
}

export interface Data {
  categories: Category[]
  products: Product[]
  sales: Sale[]
  moves: StockMove[]
  expenses: Expense[]
  suppliers: Supplier[]
  employees: Employee[]
  catalogs: Catalog[]
  settings: Settings
  /** Produtos com pedido de reposição já feito (id → data) */
  ordered: Record<ID, number>
}
