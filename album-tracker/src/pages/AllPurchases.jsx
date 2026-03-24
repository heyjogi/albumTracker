import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PurchaseList from '../components/PurchaseList'
import './AllPurchases.css'

export default function AllPurchases() {
    const navigate = useNavigate()
    const [list, setList] = useState([])

    const fetchData = async () => {
        const { data } = await supabase
            .from('safe_purchases')
            .select('*')
            .order('created_at', { ascending: false })
        setList(data || [])
    }

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="ap-wrapper">
            <header className="ap-header">
                <button onClick={() => navigate('/')} className="cp-back-btn">
                    <svg className="cp-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="ap-title">전체 분철/구매 목록</h1>
            </header>

            <main className="ap-content">
                <PurchaseList list={list} refresh={fetchData} />
            </main>
        </div>
    )
}