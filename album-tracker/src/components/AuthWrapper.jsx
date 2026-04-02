import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './AuthWrapper.css'

// 비회원도 접근 가능한 경로
const PUBLIC_PATHS = ['/login', '/pocaboard']

export default function AuthWrapper({ children }) {
    const { user, profile, isAllowed, loading } = useAuth()
    const location = useLocation()

    // 공개 경로는 인증 체크 없이 통과
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

    // 1. 비로그인 사용자 처리
    if (!user) {
        if (location.pathname !== '/login') {
            return <Navigate to="/login" state={{ from: location }} replace />
        }
        return children
    }

    // 2. 권한 없는 사용자 처리
    if (isAllowed === false) {
        if (location.pathname === '/login') {
            return children
        }
        return <Navigate to="/login" replace />
    }

    // 3. 정상 권한 사용자가 로그인 페이지 접근 시 홈으로 리다이렉트
    if (user && isAllowed === true && location.pathname === '/login') {
        return <Navigate to="/" replace />
    }

    // 4. 닉네임 설정 여부 체크
    if (!profile || !profile.nickname) {
        if (location.pathname !== '/setup-nickname') {
            return <Navigate to="/setup-nickname" replace />
        }
    }

    // 5. 닉네임 완료 후 setup 페이지 접근 차단
    if (profile?.nickname && location.pathname === '/setup-nickname') {
        return <Navigate to="/" replace />
    }

    return children
}
