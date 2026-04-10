import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './StreamingAuthModal.css'

export default function StreamingAuthModal({ onSuccess, onClose }) {
  const [activeTab, setActiveTab] = useState('melon')
  const [nickname, setNickname] = useState('')
  const [platform, setPlatform] = useState('bugs')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const fileInputRef = useRef(null)

  // 수동 승인 대기 상태 (localStorage에서 복원)
  const [pendingId, setPendingId] = useState(
    localStorage.getItem('pending_auth_id') || null
  )

  // 클라이언트 사이드 이미지 압축 (Vercel timeout 방지)
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img
          const MAX_SIZE = 800

          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width; width = MAX_SIZE
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height; height = MAX_SIZE
          }

          canvas.width = width; canvas.height = height
          canvas.getContext('2d').drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
  }

  // 멜론 자동 인증
  const handleMelonSubmit = async () => {
    const file = fileInputRef.current?.files[0]
    if (!file) return setError('스밍카드 이미지를 업로드해 주세요.')
    if (!nickname) return setError('워터마크와 동일한 닉네임을 입력해 주세요.')

    setLoading(true); setError('')
    try {
      const imageBase64 = (await compressImage(file)).split(',')[1]
      const res = await fetch('/api/verify-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, platform: 'melon', nickname }),
      })
      const data = await res.json()

      if (res.ok && data.token) {
        onSuccess(data.token)
      } else if (res.status === 429) {
        setError('잠깐 타임~✋조금만 있다가 해볼까~🙏')
      } else if (res.status === 503 || res.status === 504) {
        setError('잠깐 타임~✋조금만 있다가 해볼까~🙏')
      } else {
        setError(data.error + (data.hint ? ` (${data.hint})` : ''))
      }
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  // 기타/해외 수동 승인 신청
  const handleOthersSubmit = async () => {
    if (!nickname) return setError('닉네임을 입력해 주세요.')

    setLoading(true); setError('')
    try {
      const { data, error: sbError } = await supabase
        .from('pending_verifications')
        .insert([{ nickname, platform, note }])
        .select('id')
        .single()

      if (sbError) throw sbError
      localStorage.setItem('pending_auth_id', data.id)
      setPendingId(data.id)
    } catch {
      setError('신청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 수동 승인 상태 확인
  const checkApprovalStatus = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('pending_verifications')
        .select('status, approval_token')
        .eq('id', pendingId)
        .single()

      if (data?.status === 'approved' && data?.approval_token) {
        // 관리자가 발급한 실제 JWT
        onSuccess(data.approval_token)
        localStorage.removeItem('pending_auth_id')
      } else if (data?.status === 'rejected') {
        setError('인증이 거절되었습니다. 다시 신청해 주세요.')
        localStorage.removeItem('pending_auth_id')
        setPendingId(null)
      } else {
        alert('아직 관리자 확인 중입니다. 조금만 기다려 주세요!')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-content" onClick={e => e.stopPropagation()}>
        <div className="auth-modal-header">
          <button className="auth-help-btn" onClick={() => setShowHelp(!showHelp)} title="도움말">?</button>
          <h2>스밍 인증</h2>
          <button className="auth-close-btn" onClick={onClose}>✕</button>
        </div>
        {showHelp && (
          <div className="auth-help-content">
            <h3>플랫폼별 인증 카드 추출 방법</h3>
            <ul>
              <li><strong>Melon:</strong> [내 스트리밍] &gt; [스밍리포트] &gt; [트렌드] 탭에서 카드 내보내기</li>
              <li><strong>Bugs:</strong> [재생화면] &gt; 상단 [공유] &gt; [인증카드 저장] (닉네임 포함)</li>
              <li><strong>Genie:</strong> [MY] &gt; [뮤직허그] 또는 [재생목록]에서 닉네임 보이게 캡처</li>
              <li><strong>기타:</strong> 재생 화면에 닉네임과 함께 현재 날짜/시간이 나오도록 캡처</li>
            </ul>
            <button onClick={() => setShowHelp(false)}>알겠어!</button>
          </div>
        )}

        <p className="auth-subtitle">이미지 저장 기능을 사용하려면 스밍 인증이 필요합니다.</p>

        <div className="auth-notices">
          <p>⚠️ 인증 만료 시 오늘 날짜의 새 스밍카드로 재인증해 주세요.</p>
          <p>✅ 포카보드 기록은 그대로 유지됩니다.</p>
          <p>🗑️ 업로드된 이미지는 인증 후 즉시 삭제됩니다.</p>
        </div>

        {pendingId ? (
          <div className="pending-container">
            <h3>⏳ 관리자 승인 대기 중</h3>
            <p>기타/해외 플랫폼 인증을 확인하고 있습니다.</p>
            <button onClick={checkApprovalStatus} disabled={loading}>
              {loading ? '확인 중...' : '내 승인 상태 새로고침'}
            </button>
            <button className="text-btn" onClick={() => {
              localStorage.removeItem('pending_auth_id')
              setPendingId(null)
            }}>처음부터 다시 신청하기</button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button className={activeTab === 'melon' ? 'active' : ''} onClick={() => setActiveTab('melon')}>
                Melon (자동 인증)
              </button>
              <button className={activeTab === 'others' ? 'active' : ''} onClick={() => setActiveTab('others')}>
                기타/해외 (관리자 승인)
              </button>
            </div>

            {activeTab === 'melon' && (
              <div className="melon-form">
                <input
                  type="text"
                  placeholder="이미지 안의 워터마크 닉네임"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                />
                <div className="file-upload-box">
                  <label className="file-upload-label">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                    />
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="preview-img" />
                    ) : (
                      <div className="file-upload-placeholder">
                        <span className="file-upload-icon">📷</span>
                        <span>스밍카드 이미지를 업로드하세요</span>
                      </div>
                    )}
                  </label>
                </div>
                <button onClick={handleMelonSubmit} disabled={loading} className="submit-btn">
                  {loading ? '글자 읽는 중... 🔍' : '인증하기'}
                </button>
              </div>
            )}

            {activeTab === 'others' && (
              <div className="others-form">
                <input
                  type="text"
                  placeholder="닉네임"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                />
                <select value={platform} onChange={e => setPlatform(e.target.value)}>
                  <option value="bugs">Bugs</option>
                  <option value="genie">Genie</option>
                  <option value="flo">Flo</option>
                  <option value="vibe">Vibe</option>
                  <option value="spotify">Spotify</option>
                  <option value="applemusic">Apple Music</option>
                </select>
                <textarea
                  placeholder="스밍 인증을 X에 올린 후 해당 게시글의 링크를 올려주세요. 비공개 계정일 경우, DM으로 스밍 인증 부탁드립니다."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
                <button onClick={handleOthersSubmit} disabled={loading} className="submit-btn">
                  {loading ? '신청 중...' : '관리자 승인 신청하기'}
                </button>
              </div>
            )}
          </>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  )
}
