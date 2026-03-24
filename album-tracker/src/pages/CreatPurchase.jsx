// CreatePurchase.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import './CreatPurchase.css'

const MEMBER_ORDER = {
    '예준': 1,
    '노아': 2,
    '밤비': 3,
    '은호': 4,
    '하민': 5
}

const sortMembers = (members) => {
    return [...members].sort((a, b) => {
        const orderA = MEMBER_ORDER[a.member_name] || 99
        const orderB = MEMBER_ORDER[b.member_name] || 99
        return orderA - orderB
    })
}

export default function CreatePurchase() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const [stores, setStores] = useState([])
    const [teams, setTeams] = useState([])
    const [albums, setAlbums] = useState([])
    const [teamMembers, setTeamMembers] = useState([])
    const [albumMembers, setAlbumMembers] = useState([])
    const [selectedMemberIds, setSelectedMemberIds] = useState([])

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

        if (ts && ts.length > 0) {
            const firstTeam = ts[0]
            setForm(f => ({ ...f, team_id: firstTeam.id, team_name: firstTeam.name }))

            const { data: members } = await supabase
                .from('team_members')
                .select('*')
                .eq('team_id', firstTeam.id)
            const loaded = sortMembers(members || [])
            setTeamMembers(loaded)
            const totalQty = loaded.reduce((sum, m) => sum + (m.quantity || 1), 0)
            setForm(f => ({ ...f, quantity: totalQty || 1 }))
        }
    }

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

        const { data: members } = await supabase
            .from('album_members')
            .select('*')
            .eq('album_id', albumId)
        const loaded = sortMembers(members || [])
        setAlbumMembers(loaded)

        if (form.team_id) {
            // 팀 선택 → 팀 멤버만 선택
            const teamMemberNames = teamMembers.map(m => m.member_name)
            const selectedIds = loaded
                .filter(m => teamMemberNames.includes(m.member_name))
                .map(m => m.id)
            setSelectedMemberIds(selectedIds)
            setForm(f => ({ ...f, quantity: selectedIds.reduce((sum, id) => sum + 1, 0) || 1 }))
        } else {
            // 개인 → 전체 선택
            const allIds = loaded.map(m => m.id)
            setSelectedMemberIds(allIds)
            setForm(f => ({ ...f, quantity: allIds.length }))
        }
    }

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
            const loaded = sortMembers(data || [])
            setTeamMembers(loaded)
            const totalQty = loaded.reduce((sum, m) => sum + (m.quantity || 1), 0)
            setForm(f => ({ ...f, quantity: totalQty || 1 }))
        } else {
            setForm(f => ({ ...f, quantity: selectedMemberIds.length || 1 }))
        }
    }

    const toggleAlbumMember = (memberId) => {
        if (!isPersonal) return // 팀일 때는 클릭 불가
        setSelectedMemberIds(prev => {
            const next = prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
            setForm(f => ({ ...f, quantity: next.length || 1 }))
            return next
        })
    }

    const toggleSelectAll = () => {
        if (!isPersonal) return

        if (selectedMemberIds.length === albumMembers.length) {
            setSelectedMemberIds([])
            setForm(f => ({ ...f, quantity: 0 }))
        } else {
            const allIds = albumMembers.map(m => m.id)
            setSelectedMemberIds(allIds)
            setForm(f => ({ ...f, quantity: allIds.length }))
        }
    }

    // 🔥 팀원만 등록 + 분철팀 자동 연동
    const submit = async () => {
        setLoading(true)
        try {
            const store = stores.find(s => s.id === form.store_id)
            const storeShippingFee = store?.shipping_fee ?? 3000
            const freeShippingThreshold = store?.free_shipping_threshold ?? 50000
            const price = parseFloat(form.price) || 0

            let rows = []
            if (form.team_id) {
                rows = teamMembers.map(member => {
                    const albumMember = albumMembers.find(am => am.member_name === member.member_name)
                    return {
                        user_id: user.id,
                        team_id: form.team_id,
                        store_id: form.store_id || null,
                        album_id: form.album_id || null,
                        store_name: form.store_name,
                        album_name: form.album_name,
                        event_name: form.event_name,
                        price: price,
                        quantity: member.quantity || 1,
                        member_name: albumMember?.member_name || member.member_name,
                        event_image_url: albumMember?.event_image_url || null,
                        shipping_fee: (price * (member.quantity || 1) < freeShippingThreshold) ? storeShippingFee : 0,
                        shipping_discount: 0,
                        is_settled: false,
                        received: false
                    }
                })
            } else {
                rows = albumMembers
                    .filter(m => selectedMemberIds.includes(m.id))
                    .map(member => ({
                        user_id: user.id,
                        team_id: null,
                        store_id: form.store_id || null,
                        album_id: form.album_id || null,
                        store_name: form.store_name,
                        album_name: form.album_name,
                        event_name: form.event_name,
                        price: price,
                        quantity: 1,
                        member_name: member.member_name,
                        event_image_url: member.event_image_url || null,
                        shipping_fee: (price < freeShippingThreshold) ? storeShippingFee : 0,
                        shipping_discount: 0,
                        is_settled: false,
                        received: false
                    }))
            }

            if (rows.length === 0) throw new Error('등록할 멤버가 없습니다.')

            // ✅ 새 row 등록
            await supabase.from('purchases').insert(rows)

            // 🔥 기존 등록분 업데이트 (album_members 기준)
            const { data: oldPurchases } = await supabase
                .from('purchases')
                .select('*')
                .not('album_id', 'is', null)

            for (const p of oldPurchases) {
                const albumMember = albumMembers.find(am => am.album_id === p.album_id && am.member_name === p.member_name)
                if (albumMember && albumMember.event_image_url !== p.event_image_url) {
                    await supabase
                        .from('purchases')
                        .update({ event_image_url: albumMember.event_image_url })
                        .eq('id', p.id)
                }
            }

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
                {/* 구매처 */}
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

                {/* 앨범 */}
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

                {/* 분철팀 */}
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
                </div>

                {/* 앨범 멤버 */}
                {albumMembers.length > 0 && (
                    <div>
                        <div className="cp-member-header">
                            <label className="cp-label" style={{ marginBottom: 0 }}>멤버</label>
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
                                const isDisabled = !isPersonal
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
                                        <div className="cp-member-img">
                                            {isSelected && !isDisabled && (
                                                <div className="cp-member-check-overlay">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="cp-member-check-icon">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                            {m.event_image_url ? (
                                                <img
                                                    src={m.event_image_url}
                                                    alt={m.member_name}
                                                    className="cp-member-img-photo"
                                                />
                                            ) : (
                                                <span className="cp-member-img-placeholder">
                                                    {m.member_name?.charAt(0)}
                                                </span>
                                            )}
                                        </div>
                                        <span className="cp-member-name">{m.member_name}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 앨범명 / 이벤트명 */}
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