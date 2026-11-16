import {
  BellRing, BookImage, ChartColumn, LayoutGrid, Package, Shirt, Sparkles, TrendingUp, Truck, Users, Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  title: string
  subtitle: string
  icon: LucideIcon
  group: string
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Início', title: 'Início', subtitle: 'O resumo da sua loja hoje.', icon: LayoutGrid, group: 'Visão geral' },
  { to: '/gestao', label: 'Gestão', title: 'Gestão', subtitle: 'Administração e evolução da loja, semana a semana e mês a mês.', icon: TrendingUp, group: 'Visão geral' },
  { to: '/financeiro', label: 'Financeiro', title: 'Financeiro', subtitle: 'Metas, custos, lucro e valor do estoque.', icon: Wallet, group: 'Visão geral' },
  { to: '/relatorios', label: 'Relatórios', title: 'Relatórios', subtitle: 'Vendas e faturamento por semana e por mês.', icon: ChartColumn, group: 'Visão geral' },
  { to: '/produtos', label: 'Produtos', title: 'Produtos', subtitle: 'Cadastro com fotos, tamanhos, marca, preço e custo.', icon: Shirt, group: 'Loja' },
  { to: '/estoque', label: 'Estoque', title: 'Estoque', subtitle: 'Quantidades por tamanho, entradas e ajustes.', icon: Package, group: 'Loja' },
  { to: '/avisos', label: 'Reposição', title: 'Avisos de reposição', subtitle: 'O que está acabando e quanto comprar.', icon: BellRing, group: 'Loja' },
  { to: '/catalogo', label: 'Catálogo', title: 'Catálogo', subtitle: 'Monte seleções e envie prévias dos produtos aos clientes.', icon: BookImage, group: 'Loja' },
  { to: '/fornecedores', label: 'Fornecedores', title: 'Fornecedores', subtitle: 'Seus contatos, contatos VIP e comparação de preços.', icon: Truck, group: 'Pessoas' },
  { to: '/equipe', label: 'Equipe', title: 'Funcionários e metas', subtitle: 'Desempenho, metas e comissões de cada pessoa.', icon: Users, group: 'Pessoas' },
  { to: '/ia', label: 'Nova IA', title: 'Nova IA', subtitle: 'Pergunte sobre estoque, financeiro e relatórios.', icon: Sparkles, group: 'Assistente' },
]

export const navFor = (pathname: string) =>
  NAV.find((n) => (n.to === '/' ? pathname === '/' : pathname === n.to || pathname.startsWith(`${n.to}/`)))
