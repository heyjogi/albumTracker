import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import './CreatPurchase.css'

export default function CreatePurchase() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const [stores, setStores] = useState([])
    const [teams, setTeams] = useState([])
    const [albums, setAlbums] = useState([])
    const [teamMembers, setTeamMembers] = useState([])   // 분철팀 고정 멤버
    const [albumMembers, setAlbumMembers] = useState([]) // 앨범 멤버 (album_members)
    const [selectedMemberIds, setSelectedMemberIds] = useState([]) // 선택된 앨범 멤버

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

        // 첫번째 팀 자동 선택
        if (ts && ts.length > 0) {
            const firstTeam = ts[0]
            setForm(f => ({ ...f, team_id: firstTeam.id, team_name: firstTeam.name }))
            const { data: members } = await supabase
                .from('team_members')
                .select('*')
                .eq('team_id', firstTeam.id)
            const loaded = members || []
            setTeamMembers(loaded)
            const totalQty = loaded.reduce((sum, m) => sum + (m.quantity || 1), 0)
            setForm(f => ({ ...f, quantity: totalQty || 1 }))
        }
    }

    // 구매처 선택
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
        }))
        setAlbums([])
        setAlbumMembers([])
        setSelectedMemberIds([])

        if (storeId) {
            const { data } = await supabase
                .from('store_albums')
                .select('*')
                .eq('store_id', storeId)
            setAlbums(data || [])
        }
    }

    // 앨범 선택 → album_members fetch
    const handleAlbumChange = async (e) => {
        const albumId = e.target.value
        const album = albums.find(a => a.id === albumId)
        if (!album) {
            setAlbumMembers([])
            setSelectedMemberIds([])
            return
        }

        setForm(f => ({
            ...f,
            album_id: albumId,
            album_name: album.album_name,
            event_name: album.event_name || '',
            price: album.price,
        }))

        // album_members 로드
        const { data: members } = await supabase
            .from('album_members')
            .select('*')
            .eq('album_id', albumId)

        const loaded = members || []
        setAlbumMembers(loaded)

        // 전체 멤버 기본 선택
        const allIds = loaded.map(m => m.id)
        setSelectedMemberIds(allIds)

        // 분철팀이면 팀 수량, 개인이면 선택 멤버 수
        const qty = form.team_id
            ? teamMembers.reduce((sum, m) => sum + (m.quantity || 1), 0) || 1
            : allIds.length

        setForm(f => ({ ...f, quantity: qty }))
    }

    // 분철팀 선택
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
            const loaded = data || []
            setTeamMembers(loaded)
            const totalQty = loaded.reduce((sum, m) => sum + (m.quantity || 1), 0)
            setForm(f => ({ ...f, quantity: totalQty || 1 }))
        } else {
            // 개인: 현재 선택된 앨범 멤버 수로 수량 설정
            setForm(f => ({ ...f, quantity: selectedMemberIds.length || 1 }))
        }
    }

    // 앨범 멤버 카드 토글 (개인일 때만)
    const toggleAlbumMember = (memberId) => {
        if (form.team_id) return // 분철팀이면 토글 불가
        setSelectedMemberIds(prev => {
            const next = prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
            setForm(f => ({ ...f, quantity: next.length || 1 }))
            return next
        })
    }

    // 전체 선택 / 해제
    const toggleSelectAll = () => {
        if (form.team_id) return
        if (selectedMemberIds.length === albumMembers.length) {
            setSelectedMemberIds([])
            setForm(f => ({ ...f, quantity: 0 }))
        } else {
            const allIds = albumMembers.map(m => m.id)
            setSelectedMemberIds(allIds)
            setForm(f => ({ ...f, quantity: allIds.length }))
        }
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
                if (price * 5 < freeShippingThreshold) calculatedShippingFee = storeShippingFee
            } else {
                if (price * quantity < freeShippingThreshold) calculatedShippingFee = storeShippingFee
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

    const isPersonal = !form.team_id
    const allSelected = albumMembers.length > 0 && selectedMemberIds.length === albumMembers.length
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

                {/* 1. 구매처 */}
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

                {/* 2. 앨범 — 구매처 선택 후에만 표시 */}
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

                {/* 3. 분철팀 */}
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
                    {/* 분철팀 고정 멤버 */}
                    {!isPersonal && teamMembers.length > 0 && (
                        <div className="cp-team-members">
                            {teamMembers.map(m => (
                                <span key={m.id} className="cp-member-badge">
                                    {m.member_name} ×{m.quantity || 1}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* 4. 멤버 선택 — 앨범 선택 후 표시 */}
                {albumMembers.length > 0 && (
                    <div>
                        <div className="cp-member-header">
                            <label className="cp-label" style={{ marginBottom: 0 }}>멤버</label>
                            {/* 개인일 때만 전체선택 버튼 */}
                            {isPersonal && (
                                <button
                                    type="button"
                                    onClick={toggleSelectAll}
                                    className={`cp-select-all-btn ${allSelected ? 'cp-select-all-on' : 'cp-select-all-off'}`}
                                >
                                    {allSelected ? '전체 해제' : '전체 선택'}
                                </button>
                            )}
                        </div>
                        <div className="cp-member-scroll">
                            {albumMembers.map(m => {
                                const isSelected = selectedMemberIds.includes(m.id)
                                const isDisabled = !isPersonal // 분철팀이면 선택 불가
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => toggleAlbumMember(m.id)}
                                        className={`cp-member-card ${isDisabled
                                                ? 'cp-member-card-fixed'
                                                : isSelected
                                                    ? 'cp-member-card-on'
                                                    : 'cp-member-card-off'
                                            }`}
                                    >
                                        {/* 이미지 자리 */}
                                        <div className="cp-member-img">
                                            {isSelected && !isDisabled && (
                                                <div className="cp-member-check-overlay">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="cp-member-check-icon">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                            <span className="cp-member-img-placeholder">
                                                {m.member_name?.charAt(0)}
                                            </span>
                                        </div>
                                        <span className="cp-member-name">{m.member_name}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 5. 앨범명 / 이벤트명 직접 입력 */}
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

                {/* 6. 가격 / 수량 */}
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