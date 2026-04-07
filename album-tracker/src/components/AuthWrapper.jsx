import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './AuthWrapper.css'

const PUBLIC_PATHS = ['/login', '/pocaboard', '/privacy']

export default function AuthWrapper({ children }) {
    const { user, profile, loading } = useAuth()
    const location = useLocation()

    if (PUBLIC_PATHS.includes(location.pathname)) {
        return children
    }

    if (loading) {
        return (
            <div className="aw-loading-container">
                <div className="aw-loading-spinner"></div>
            </div>
        )
    }

    // 비로그인 → 로그인 페이지로
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // 닉네임 미설정 → 닉네임 설정 페이지로
    if (!profile?.nickname) {
        if (location.pathname !== '/setup-nickname') {
            return <Navigate to="/setup-nickname" replace />
        }
    }

    // 닉네임 완료 후 setup 페이지 접근 차단
    if (profile?.nickname && location.pathname === '/setup-nickname') {
        return <Navigate to="/" replace />
    }

    return children
}
