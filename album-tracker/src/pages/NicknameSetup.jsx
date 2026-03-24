import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import './NicknameSetup.css'

export default function NicknameSetup() {
    const { user, setProfile } = useAuth()
    const navigate = useNavigate()
    const [nickname, setNickname] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        const value = e.target.value
        // 정규식 검사: 특수문자 금지, 영문(대소문자 구분), 숫자, 한글만 허용
        if (/[^a-zA-Z0-9가-힣]/.test(value)) {
            setError('특수문자나 띄어쓰기는 사용할 수 없습니다.')
        } else {
            setError('')
        }
        setNickname(value)
    }

    const save = async () => {
        if (!nickname.trim()) {
            setError('닉네임을 입력해주세요.')
            return
        }
        if (error) return

        setLoading(true)
        try {
            // 중복 확인
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

            // 저장
            const { data, error: insertError } = await supabase
                .from('profiles')
                .insert([{ id: user.id, nickname }])
                .select()
                .single()

            if (insertError) throw insertError

            // Context 프로필 업데이트 후 메인 이동
            setProfile(data)
            navigate('/')
        } catch (err) {
            console.error(err)
            setError('닉네임 설정 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="ns-wrapper">
            <div className="ns-card">
                <h1 className="ns-title">닉네임 설정</h1>
                <p className="ns-subtitle">서비스에서 사용할 닉네임을 입력해주세요.</p>
                
                <div className="ns-input-wrap">
                    <input 
                        type="text"
                        value={nickname}
                        onChange={handleChange}
                        placeholder="닉네임 입력 (특수문자 제외)"
                        className="ns-input"
                        maxLength={15}
                    />
                    {error && <p className="ns-error">{error}</p>}
                </div>

                <button 
                    onClick={save}
                    disabled={loading || !!error || !nickname}
                    className="ns-btn"
                >
                    {loading ? '저장 중...' : '시작하기'}
                </button>
            </div>
        </div>
    )
}