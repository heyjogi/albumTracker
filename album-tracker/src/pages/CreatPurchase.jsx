import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function CreatePurchase() {
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    
    // Options
    const [stores, setStores] = useState([])
    const [teams, setTeams] = useState([])

    const [form, setForm] = useState({
        store_name: '',
        team_name: '개인',
        album_name: '',
        event_name: '',
        price: 0,
        quantity: 1
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [{ data: ss }, { data: ts }] = await Promise.all([
            supabase.from('stores').select('*'),
            supabase.from('teams').select('*')
        ])
        setStores(ss || [])
        setTeams(ts || [])
    }

    const submit = async () => {
        setLoading(true)
        try {
            // Find or create team (simplified MVP)
            let team_id = null
            if (form.team_name !== '개인') {
                const existingTeam = teams.find(t => t.name === form.team_name)
                if (existingTeam) {
                    team_id = existingTeam.id
                } else {
                    const { data: newTeam } = await supabase.from('teams')
                        .insert({ name: form.team_name, created_by: profile.id, leader_id: profile.id })
                        .select().single()
                    if (newTeam) team_id = newTeam.id
                }
            }

            await supabase.from('purchases').insert({
                user_id: user.id,
                team_id,
                store_name: form.store_name,
                album_name: form.album_name,
                event_name: form.event_name,
                price: parseFloat(form.price) || 0,
                quantity: parseInt(form.quantity) || 1,
                shipping_discount: 0,
                is_settled: false,
                received: false
            })
            navigate('/')
        } catch (error) {
            console.error(error)
            alert('저장 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-200 p-4">
            <header className="flex items-center mb-6 pt-4">
                <button onClick={() => navigate('/')} className="p-2 bg-white rounded-full shadow text-brand-600 mr-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-2xl font-bold text-slate-800">새 구매내역 등록</h1>
            </header>

            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">구매처</label>
                    <input 
                        type="text" 
                        placeholder="예: 위드뮤, 알라딘 등"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                        value={form.store_name}
                        onChange={e => setForm({...form, store_name: e.target.value})}
                        list="stores-list"
                    />
                    <datalist id="stores-list">
                        {stores.map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">분철팀 (직접 입력 가능)</label>
                    <input 
                        type="text" 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                        value={form.team_name}
                        onChange={e => setForm({...form, team_name: e.target.value})}
                        list="teams-list"
                    />
                    <datalist id="teams-list">
                        <option value="개인" />
                        {teams.map(t => <option key={t.id} value={t.name} />)}
                    </datalist>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">앨범 종류 / 이벤트명</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="앨범명"
                            className="w-1/2 px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                            value={form.album_name}
                            onChange={e => setForm({...form, album_name: e.target.value})}
                        />
                        <input 
                            type="text" 
                            placeholder="이벤트명"
                            className="w-1/2 px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                            value={form.event_name}
                            onChange={e => setForm({...form, event_name: e.target.value})}
                        />
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">가격 (원)</label>
                        <input 
                            type="number" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                            value={form.price}
                            onChange={e => setForm({...form, price: e.target.value})}
                        />
                    </div>
                    <div className="w-1/3">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">수량</label>
                        <input 
                            type="number" 
                            min="1"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                            value={form.quantity}
                            onChange={e => setForm({...form, quantity: e.target.value})}
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        onClick={submit}
                        disabled={loading || !form.store_name}
                        className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition-colors"
                    >
                        {loading ? '등록 중...' : '등록하기'}
                    </button>
                </div>
            </div>
        </div>
    )
}