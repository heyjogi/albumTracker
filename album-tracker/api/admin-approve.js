import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  const { id, status, adminKey } = req.body

  // 1. 관리자 비밀키 검증
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // 2. DB 업데이트
  const updateData = { status }
  if (status === 'approved') {
    updateData.approved_at = new Date().toISOString()

    // 3. 승인 시 JWT 발급
    const token = jwt.sign(
      { verified: true, platform: 'manual' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )
    updateData.approval_token = token
  }

  const { error } = await supabase
    .from('pending_verifications')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Approval Error:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true })
}
