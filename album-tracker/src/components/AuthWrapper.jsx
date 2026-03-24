import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './AuthWrapper.css'

export default function AuthWrapper({ children }) {
    const { user, profile, isAllowed, loading } = useAuth()
    const location = useLocation()

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

    // 2. 권한 없는 사용자 처리 (중요!)
    // 이미 로그인(user)은 했지만, 허용된 이메일이 아닐 때
    if (isAllowed === false) {
        // 현재 경로가 /login이면 그대로 둡니다 (그래야 로그인 컴포넌트 내부의 에러 메시지가 보임)
        if (location.pathname === '/login') {
            return children
        }
        // 그 외의 페이지에서 접근하면 /login으로 보냅니다.
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