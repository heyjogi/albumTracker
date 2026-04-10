import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AdminAuth.css'

export default function AdminAuth() {
  const navigate = useNavigate()
  const [pendingList, setPendingList] = useState([])
  const [adminKey, setAdminKey] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)

  // 비밀키 입력 후 UI만 열림 — 실제 검증은 handleAction 시 서버에서 수행
  const handleLogin = () => {
    if (adminKey.trim()) {
      setAuthenticated(true)
      fetchPending()
    }
  }

  const fetchPending = async () => {
    const { data } = await supabase
      .from('pending_verifications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setPendingList(data || [])
  }

  const handleAction = async (id, status) => {
    setLoading(true)
    const response = await fetch('/api/admin-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, adminKey })
    })
    const data = await response.json()
    setLoading(false)

    if (response.ok) {
      alert(status === 'approved' ? '승인되었습니다.' : '거절되었습니다.')
      fetchPending()
    } else {
      alert(data.error || '권한이 없거나 오류가 발생했습니다.')
    }
  }

  const handleResetAll = async () => {
    if (!window.confirm('⚠️ 경고: 모든 인증 내역(해시, 신청목록)이 영구 삭제됩니다. 정말 초기화하시겠습니까?')) return

    setLoading(true)
    const response = await fetch('/api/admin-reset-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey })
    })
    const data = await response.json()
    setLoading(false)

    if (response.ok) {
      alert('모든 데이터가 초기화되었습니다. 다시 테스트를 진행할 수 있습니다.')
      fetchPending()
    } else {
      alert(data.error || '초기화에 실패했습니다.')
    }
  }

  if (!authenticated) {
    return (
      <div className="admin-login-wrap">
        <h2 className="admin-title" style={{ marginBottom: '24px' }}>관리자 인증</h2>
        <input
          type="password"
          placeholder="관리자 비밀키"
          className="admin-login-input"
          value={adminKey}
          onChange={e => setAdminKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        <button className="admin-login-btn" onClick={handleLogin}>
          로그인
        </button>
      </div>
    )
  }

  return (
    <div className="admin-auth-wrap">
      <header className="admin-auth-header">
        <button onClick={() => navigate(-1)} className="admin-back-btn">
          ←
        </button>
        <h2 className="admin-title">
          스밍인증 수동 승인 관리
        </h2>
        <button onClick={fetchPending} className="admin-refresh-btn" title="새로고침">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '24px', height: '24px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </header>
      
      {loading && <p className="admin-loading-text">처리 중...</p>}
      <table className="admin-table">
        <thead>
          <tr>
            <th>닉네임</th>
            <th>플랫폼</th>
            <th>메모</th>
            <th>신청일</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          {pendingList.length === 0 ? (
            <tr>
              <td colSpan="5" className="admin-empty-row">대기 중인 신청이 없습니다.</td>
            </tr>
          ) : (
            pendingList.map(item => (
              <tr key={item.id}>
                <td style={{ textAlign: 'center' }}>{item.nickname}</td>
                <td style={{ textAlign: 'center' }}>{item.platform}</td>
                <td style={{ maxWidth: '200px', wordBreak: 'break-all' }}>{item.note}</td>
                <td style={{ textAlign: 'center', fontSize: '12px' }}>{new Date(item.created_at).toLocaleString('ko-KR')}</td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    className="admin-action-btn admin-approve-btn"
                    onClick={() => handleAction(item.id, 'approved')} 
                    disabled={loading}
                  >
                    승인
                  </button>
                  <button 
                    className="admin-action-btn admin-reject-btn"
                    onClick={() => handleAction(item.id, 'rejected')} 
                    disabled={loading} 
                  >
                    거절
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 테스트용 데이터 초기화 구역 */}
      <div className="admin-danger-zone">
        <h3 className="admin-danger-title">Danger Zone (Testing Only)</h3>
        <p style={{ color: '#ff0000', fontSize: '11px', marginBottom: '12px', opacity: 0.7 }}>
          * 중복 방지용 해시와 모든 신청 내역이 삭제됩니다. 배포 전 반드시 제거해 주세요.
        </p>
        <button 
          className="admin-reset-btn"
          onClick={handleResetAll}
          disabled={loading}
        >
          모든 인증 데이터 초기화
        </button>
      </div>
    </div>
  )
}
