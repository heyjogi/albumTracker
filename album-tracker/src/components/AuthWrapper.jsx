import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthWrapper({ children }) {
    const { user, profile, isAllowed, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
        )
    }

    if (!user) {
        if (location.pathname !== '/login') {
            return <Navigate to="/login" state={{ from: location }} replace />
        }
        return children
    }

    if (user && location.pathname === '/login') {
        return <Navigate to="/" replace />
    }

    if (isAllowed === false) {
        return <Navigate to="/login" state={{ error: 'not_allowed' }} replace />
    }

    if (!profile && location.pathname !== '/setup-nickname') {
        return <Navigate to="/setup-nickname" replace />
    }

    if (profile && location.pathname === '/setup-nickname') {
        return <Navigate to="/" replace />
    }

    return children
}
