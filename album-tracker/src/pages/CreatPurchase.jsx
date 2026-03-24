import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import './CreatPurchase.css'

export default function CreatePurchase() {
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const [stores, setStores] = useState([])
    const [teams, setTeams] = useState([])
    const [albums, setAlbums] = useState([])        // 선택된 구매처의 앨범 목록
    const [teamMembers, setTeamMembers] = useState([]) // 선택된 팀의 멤버

    const [form, setForm] = useState({
        store_id: '',
        store_name: '',
        team_id: '',
        team_name: '개인',
        album_id: '',
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

    // 구매처 선택 시 → 해당 store의 앨범 목록 fetch
    const handleStoreChange = async (e) => {
        const storeId = e.target.value
        const store = stores.find(s => s.id === storeId)
        setForm(f => ({
            ...f,
            store_id: storeId,
            store_name: store?.name || '',
            album_id: '',
            album_name: '',
            event_name: '',
            price: 0,
            quantity: 1
        }))
        setAlbums([])

        if (storeId) {
            const { data } = await supabase
                .from('store_albums')
                .select('*')
                .eq('store_id', storeId)
            setAlbums(data || [])
        }
    }

    // 분철팀 선택 시 → 팀 멤버 fetch해서 수량 자동 계산
    const handleTeamChange = async (e) => {
        const teamId = e.target.value
        const team = teams.find(t => t.id === teamId)
        setForm(f => ({ ...f, team_id: teamId, team_name: team?.name || '개인' }))
        setTeamMembers([])

        if (teamId) {
            const { data } = await supabase
                .from('team_members')
                .select('*')
                .eq('team_id', teamId)
            setTeamMembers(data || [])
            // 멤버 수 기준으로 수량 자동 기입
            if (data && data.length > 0) {
                const totalQty = data.reduce((sum, m) => sum + (m.quantity || 1), 0)
                setForm(f => ({ ...f, quantity: totalQty }))
            }
        }
    }

    // 앨범 선택 시 → price, event_name, quantity 자동기입
    const handleAlbumChange = (e) => {
        const albumId = e.target.value
        const album = albums.find(a => a.id === albumId)
        if (!album) return
        setForm(f => ({
            ...f,
            album_id: albumId,
            album_name: album.album_name,
            event_name: album.event_name || '',
            price: album.price,
            // 팀 멤버가 있으면 멤버 수량 유지, 없으면 앨범 기본 수량
            quantity: teamMembers.length > 0
                ? teamMembers.reduce((sum, m) => sum + (m.quantity || 1), 0)
                : album.default_quantity || 1
        }))
    }

    const submit = async () => {
        setLoading(true)
        try {
            const store = stores.find(s => s.id === form.store_id)
            const storeShippingFee = store?.shipping_fee ?? 3000
            const freeShippingThreshold = store?.free_shipping_threshold ?? 50000
            
            let calculatedShippingFee = 0
            const price = parseFloat(form.price) || 0
            const quantity = parseInt(form.quantity) || 1

            if (form.team_id) {
                if (price * 5 < freeShippingThreshold) {
                    calculatedShippingFee = storeShippingFee
                }
            } else {
                if (price * quantity < freeShippingThreshold) {
                    calculatedShippingFee = storeShippingFee
                }
            }

            await supabase.from('purchases').insert({
                user_id: user.id,
                team_id: form.team_id || null,
                store_id: form.store_id || null,
                album_id: form.album_id || null,
                store_name: form.store_name,
                album_name: form.album_name,
                event_name: form.event_name,
                price: price,
                quantity: quantity,
                shipping_fee: calculatedShippingFee,
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

    const selectClass = "cp-select"
    const inputClass = "cp-input-full"

    return (
        <div className="cp-wrapper">
            <header className="cp-header">
                <button onClick={() => navigate('/')} className="cp-back-btn">
                    <svg className="cp-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="cp-title">새 구매내역 등록</h1>
            </header>

            <div className="cp-card">

                {/* 구매처 드롭다운 */}
                <div>
                    <label className="cp-label">구매처</label>
                    <div className="cp-select-wrap">
                        <select className={selectClass} value={form.store_id} onChange={handleStoreChange}>
                            <option value="">구매처를 선택하세요</option>
                            {stores.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <span className="cp-select-icon">▾</span>
                    </div>
                </div>

                {/* 분철팀 드롭다운 */}
                <div>
                    <label className="cp-label">분철팀</label>
                    <div className="cp-select-wrap">
                        <select className={selectClass} value={form.team_id} onChange={handleTeamChange}>
                            <option value="">개인</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <span className="cp-select-icon">▾</span>
                    </div>
                    {/* 팀 선택 시 멤버 표시 */}
                    {teamMembers.length > 0 && (
                        <div className="cp-team-members">
                            {teamMembers.map(m => (
                                <span key={m.id} className="cp-member-badge">
                                    {m.member_name} ×{m.quantity || 1}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* 앨범 선택 — 구매처 선택 후에만 표시 */}
                {form.store_id && (
                    <div>
                        <label className="cp-label">앨범</label>
                        {albums.length === 0 ? (
                            <p className="cp-empty-msg">등록된 앨범이 없습니다. 직접 입력해주세요.</p>
                        ) : (
                            <div className="cp-select-wrap">
                                <select className={selectClass} value={form.album_id} onChange={handleAlbumChange}>
                                    <option value="">앨범을 선택하세요</option>
                                    {albums.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.album_name}{a.event_name ? ` (${a.event_name})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <span className="cp-select-icon">▾</span>
                            </div>
                        )}
                    </div>
                )}

                {/* 앨범명 / 이벤트명 직접 입력 (앨범 미선택시 또는 보정용) */}
                <div>
                    <label className="cp-label">앨범명 / 이벤트명</label>
                    <div className="cp-input-group">
                        <input
                            type="text"
                            placeholder="앨범명"
                            className="cp-input-half"
                            value={form.album_name}
                            onChange={e => setForm({ ...form, album_name: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="이벤트명"
                            className="cp-input-half"
                            value={form.event_name}
                            onChange={e => setForm({ ...form, event_name: e.target.value })}
                        />
                    </div>
                </div>

                {/* 가격 / 수량 */}
                <div className="cp-row">
                    <div className="cp-col-flex">
                        <label className="cp-label">가격 (원)</label>
                        <input
                            type="number"
                            className={inputClass}
                            value={form.price}
                            onChange={e => setForm({ ...form, price: e.target.value })}
                        />
                    </div>
                    <div className="cp-col-1-3">
                        <label className="cp-label">수량</label>
                        <input
                            type="number"
                            min="1"
                            className={inputClass}
                            value={form.quantity}
                            onChange={e => setForm({ ...form, quantity: e.target.value })}
                        />
                    </div>
                </div>

                <div className="cp-submit-wrap">
                    <button
                        onClick={submit}
                        disabled={loading || !form.store_name}
                        className="cp-submit-btn"
                    >
                        {loading ? '등록 중...' : '등록하기'}
                    </button>
                </div>
            </div>
        </div>
    )
}