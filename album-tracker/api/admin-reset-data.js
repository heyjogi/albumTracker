import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  const { adminKey } = req.body

  // 1. 관리자 비밀키 검증
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // 2. 인증 관련 데이터 전부 삭제 (테스트용)
    // ⚠️ 실운영 시 매우 위험한 기능이므로 테스트 완료 후 반드시 제거 필요

    // used_card_hashes 테이블 비우기
    const { error: hashError } = await supabase
      .from('used_card_hashes')
      .delete()
      .neq('card_hash', 'dummy_to_allow_global_delete')

    if (hashError) throw hashError

    // pending_verifications 테이블 비우기
    const { error: pendingError } = await supabase
      .from('pending_verifications')
      .delete()
      .neq('status', 'non_existent_status')

    if (pendingError) throw pendingError

    return res.status(200).json({ success: true, message: '모든 인증 데이터가 초기화되었습니다.' })
  } catch (error) {
    console.error('Reset Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
