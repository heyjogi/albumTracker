import { useState, useEffect } from 'react'

const TOKEN_KEY = 'streaming_auth_token'
// 'pocaboard_v1', 'pocaboard_structure_v3' 는 건드리지 않음

export function useStreamingAuth() {
  const [isVerified, setIsVerified] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setLoading(false); return }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp * 1000 > Date.now()) {
        setIsVerified(true)
      } else {
        localStorage.removeItem(TOKEN_KEY)  // JWT만 삭제, pocaboard_v1 절대 건드리지 않음
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY)
    }
    setLoading(false)
  }, [])

  const saveToken = (token) => {
    localStorage.setItem(TOKEN_KEY, token)
    setIsVerified(true)
  }

  return { isVerified, loading, saveToken }
}
