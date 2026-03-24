import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import './Settings.css'

export default function Settings() {
    const { user, profile, setProfile, signOut } = useAuth()
    const navigate = useNavigate()
    
    const [nickname, setNickname] = useState(profile?.nickname || '')
    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    const [loading, setLoading] = useState(false)
    const [myTeams, setMyTeams] = useState([])

    useEffect(() => {
        if (profile?.nickname) {
            setNickname(profile.nickname)
        }
    }, [profile])

    useEffect(() => {
        fetchMyTeams()
    }, [user])

    const fetchMyTeams = async () => {
        if (!user) return
        try {
            const { data: purchases } = await supabase
                .from('purchases')
                .select('team_id')
                .eq('user_id', user.id)
                .not('team_id', 'is', null)
            
            if (purchases && purchases.length > 0) {
                const uniqueTeamIds = [...new Set(purchases.map(p => p.team_id))]
                const { data: teamsData } = await supabase
                    .from('teams')
                    .select('id, name')
                    .in('id', uniqueTeamIds)
                setMyTeams(teamsData || [])
            }
        } catch (err) {
            console.error('Error fetching teams: ', err)
        }
    }

    const handleNicknameChange = (e) => {
        const value = e.target.value
        if (/[^a-zA-Z0-9가-힣]/.test(value)) {
            setError('특수문자나 띄어쓰기는 사용할 수 없습니다.')
        } else {
            setError('')
        }
        setNickname(value)
        setSuccessMsg('')
    }

    const handleSaveNickname = async () => {
        if (!nickname.trim()) {
            setError('닉네임을 입력해주세요.')
            return
        }
        if (error) return

        setLoading(true)
        setSuccessMsg('')
        try {
            if (nickname !== profile?.nickname) {
                const { data: existing } = await supabase
                    .from('profiles')
                    .select('nickname')
                    .eq('nickname', nickname)
                    .single()

                if (existing) {
                    setError('이미 사용중인 닉네임입니다.')
                    setLoading(false)
                    return
                }
            }

            const { data, error: insertError } = await supabase
                .from('profiles')
                .upsert([{ id: user.id, nickname }])
                .select()
                .single()

            if (insertError) throw insertError

            setProfile(data)
            setSuccessMsg('닉네임이 성공적으로 변경되었습니다.')
        } catch (err) {
            console.error(err)
            setError('닉네임 설정 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    return (
        <div className="st-wrapper">
            <header className="st-header">
                <h1 className="st-title">설정</h1>
            </header>

            <main className="st-content">
                <section className="st-section">
                    <h2 className="st-section-title">내 프로필</h2>
                    <div className="st-card">
                        <label className="st-label">닉네임</label>
                        <div className="st-input-wrap">
                            <input 
                                type="text"
                                value={nickname}
                                onChange={handleNicknameChange}
                                placeholder="닉네임 입력 (특수문자 제외)"
                                className="st-input"
                                maxLength={15}
                            />
                        </div>
                        {error && <p className="st-error">{error}</p>}
                        {successMsg && <p className="st-success">{successMsg}</p>}
                        <button 
                            onClick={handleSaveNickname}
                            disabled={loading || !!error || !nickname || nickname === profile?.nickname}
                            className="st-btn-save"
                        >
                            {loading ? '저장 중...' : '저장하기'}
                        </button>
                    </div>
                </section>

                <section className="st-section">
                    <h2 className="st-section-title">현재 소속된 분철팀</h2>
                    <div className="st-card st-teams-card">
                        {myTeams.length > 0 ? (
                            <ul className="st-teams-list">
                                {myTeams.map(team => (
                                    <li key={team.id} className="st-team-item">
                                        <div className="st-team-icon">
                                            <svg fill="currentColor" viewBox="0 0 20 20" className="w-5 h-5"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                        </div>
                                        <span className="st-team-name">{team.name}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="st-empty-text">소속된 분철팀이 없습니다.</p>
                        )}
                    </div>
                </section>

                <section className="st-section st-logout-section">
                    <button onClick={handleLogout} className="st-btn-logout">
                        로그아웃
                    </button>
                </section>
            </main>

            {/* Bottom Navigation */}
            <nav className="main-nav">
                <button className="main-nav-btn-inactive" onClick={() => navigate('/')}>
                    <svg className="main-nav-icon" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                    <span className="main-nav-text">메인</span>
                </button>
                <button onClick={() => navigate('/create-purchase')} className="main-fab">
                    <svg className="main-fab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
                <button className="main-nav-btn">
                    <svg className="main-nav-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                    <span className="main-nav-text">설정</span>
                </button>
            </nav>
        </div>
    )
}
