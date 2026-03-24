import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

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
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-200">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">닉네임 설정</h1>
                <p className="text-slate-500 mb-6 font-medium">서비스에서 사용할 닉네임을 입력해주세요.</p>
                
                <div className="mb-6">
                    <input 
                        type="text"
                        value={nickname}
                        onChange={handleChange}
                        placeholder="닉네임 입력 (특수문자 제외)"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                        maxLength={15}
                    />
                    {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                </div>

                <button 
                    onClick={save}
                    disabled={loading || !!error || !nickname}
                    className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-md transition-colors"
                >
                    {loading ? '저장 중...' : '시작하기'}
                </button>
            </div>
        </div>
    )
}