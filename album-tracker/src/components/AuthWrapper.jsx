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
