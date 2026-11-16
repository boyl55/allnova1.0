import { Navigate, Route, Routes } from 'react-router-dom'
import { useHydrated } from './hooks'
import { useStore } from './store/store'
import { LogoMark } from './components/Logo'
import { Shell } from './components/Shell'
import { Welcome } from './components/Welcome'
import { Home } from './pages/Home'
import { Gestao } from './pages/Gestao'
import { Financeiro } from './pages/Financeiro'
import { Relatorios } from './pages/Relatorios'
import { Produtos } from './pages/Produtos'
import { Estoque } from './pages/Estoque'
import { Avisos } from './pages/Avisos'
import { Catalogo, CatalogoView } from './pages/Catalogo'
import { Fornecedores } from './pages/Fornecedores'
import { Equipe } from './pages/Equipe'
import { IA } from './pages/IA'
import { Ajustes } from './pages/Ajustes'

export function App() {
  const hydrated = useHydrated()
  const onboarded = useStore((s) => s.settings.onboarded)

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <LogoMark size={64} className="animate-pulse" />
      </div>
    )
  }
  if (!onboarded) return <Welcome />

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="gestao" element={<Gestao />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="produtos" element={<Produtos />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="avisos" element={<Avisos />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="catalogo/:id" element={<CatalogoView />} />
        <Route path="fornecedores" element={<Fornecedores />} />
        <Route path="equipe" element={<Equipe />} />
        <Route path="ia" element={<IA />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
