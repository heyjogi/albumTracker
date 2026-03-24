import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PurchaseList from '../components/PurchaseList'
import SummaryCard from '../components/SummaryCard'
import { useAuth } from '../hooks/useAuth'
import './Main.css'

export default function Main() {
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const [list, setList] = useState([])

    const fetchData = async () => {
        if (!user) return
        const { data } = await supabase
            .from('purchases')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        setList(data || [])
    }

    useEffect(() => {
        fetchData()
    }, [user])

    return (
        <div className="main-wrapper">
            <header className="main-header">
                <div className="flex items-center gap-3">
                    <img src="/logo.svg" alt="Logo" className="w-8 h-8 rounded" />
                    <h1 className="main-logo">AlbumTracker.</h1>
                </div>
                <div className="main-avatar">
                    {profile?.nickname ? profile.nickname.charAt(0).toUpperCase() : 'U'}
                </div>
            </header>

            <main className="main-content">
                <SummaryCard list={list} />
                <PurchaseList list={list} refresh={fetchData} />
            </main>

            {/* Bottom Navigation */}
            <nav className="main-nav">
                <button className="main-nav-btn" onClick={() => navigate('/')}>
                    <svg className="main-nav-icon" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                    <span className="main-nav-text">메인</span>
                </button>
                <button onClick={() => navigate('/create-purchase')} className="main-fab">
                    <svg className="main-fab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
                <button className="main-nav-btn-inactive">
                    <svg className="main-nav-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                    <span className="main-nav-text">설정</span>
                </button>
            </nav>
        </div>
    )
}