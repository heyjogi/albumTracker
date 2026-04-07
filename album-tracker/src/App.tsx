// @ts-nocheck
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Main from './pages/Main'
import Login from './pages/Login'
import NicknameSetup from './pages/NicknameSetup'
import CreatePurchase from './pages/CreatPurchase'
import AllPurchases from './pages/AllPurchases'
import Settings from './pages/Settings'
import PocaBoard from './pages/PocaBoard'
import Privacy from './pages/Privacy'
import { AuthProvider } from './hooks/useAuth'
import AuthWrapper from './components/AuthWrapper'

import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <AuthWrapper>
          <main className="flex-grow">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/setup-nickname" element={<NicknameSetup />} />
              <Route path="/create-purchase" element={<CreatePurchase />} />
              <Route path="/purchases" element={<AllPurchases />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/pocaboard" element={<PocaBoard />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/" element={<Main />} />
            </Routes>
          </main>
          <footer className="global-footer">
            이 사이트는 서비스 개선을 위해 익명의 방문 통계를 수집합니다.
          </footer>
        </AuthWrapper>
      </div>
      </BrowserRouter>
      <SpeedInsights />
      <Analytics />
    </AuthProvider>
  )
}

export default App
