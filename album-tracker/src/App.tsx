// @ts-nocheck
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Main from './pages/Main'
import Login from './pages/Login'
import NicknameSetup from './pages/NicknameSetup'
import CreatePurchase from './pages/CreatPurchase'
import AllPurchases from './pages/AllPurchases'
import Settings from './pages/Settings'
import PocaBoard from './pages/PocaBoard'
import { AuthProvider } from './hooks/useAuth'
import AuthWrapper from './components/AuthWrapper'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthWrapper>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup-nickname" element={<NicknameSetup />} />
            <Route path="/create-purchase" element={<CreatePurchase />} />
            <Route path="/purchases" element={<AllPurchases />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/pocaboard" element={<PocaBoard />} />
            <Route path="/" element={<Main />} />
          </Routes>
        </AuthWrapper>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
