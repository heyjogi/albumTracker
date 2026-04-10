import { createWorker } from 'tesseract.js'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ─── Rate Limit (in-memory) ───────────────────────────────────────────────────
const rateLimitMap = new Map()

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

export default async function handler(req, res) {
  // Vercel Node.js runtime에서는 Response 객체 대신 res를 사용합니다.
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  // 0. Rate Limit 체크 (Node.js req.headers 방식)
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    'unknown'

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: '요청이 너무 많습니다. 1분 후 다시 시도해 주세요.' })
  }

  // 1. 이미지 -> SHA256 해시 (Node.js req.body 사용)
  const { imageBase64, platform, nickname } = req.body

  if (!imageBase64) {
    return res.status(400).json({ error: '이미지 데이터가 없습니다.' })
  }

  const buffer = Buffer.from(imageBase64, 'base64')
  const cardHash = crypto.createHash('sha256').update(buffer).digest('hex')

  // 2. 중복 해시 체크
  const { data: existing } = await supabase
    .from('used_card_hashes')
    .select('card_hash')
    .eq('card_hash', cardHash)
    .maybeSingle()

  if (existing) {
    return res.status(400).json({ error: '이미 사용된 카드입니다. 오늘 날짜의 스트리밍 카드로 재시도해 주세요.' })
  }

  // 3. 서버사이드 OCR
  let worker
  let text
  try {
    const ocrTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OCR_TIMEOUT')), 50_000)
    )
    worker = await createWorker('kor+eng')
    const ocrResult = await Promise.race([
      worker.recognize(buffer),
      ocrTimeout,
    ])
    text = ocrResult.data.text
  } catch (err) {
    await worker?.terminate()
    if (err.message === 'OCR_TIMEOUT') {
      return res.status(503).json({ error: '서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.' })
    }
    console.error('OCR Error:', err)
    return res.status(500).json({ error: 'OCR 처리 중 오류가 발생했습니다.' })
  } finally {
    await worker?.terminate()
  }

  // [DEBUG] OCR 결과 로그 출력
  console.log('--- OCR RAW TEXT START ---')
  console.log(text)
  console.log('--- OCR RAW TEXT END ---')

  // 4. 규칙 기반 검증
  const today = new Date()
  const todayStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`

  let passed = false
  let errorHint = ''

  if (platform === 'melon') {
    const rawCount = text.match(/내\s*스트리밍[\s\S]{0,20}?([\d,]+)/)?.[1] || '0'
    const streamCount = parseInt(rawCount.replace(/,/g, ''))
    
    // 검증 로직 가독성 개선
    const hasMelon = /melon\s*trend/i.test(text)
    const hasArtist = /(plave|플레이브)/i.test(text)
    const hasSong = /흥흥흥/i.test(text)
    const hasFeat = /sole/i.test(text)
    const hasDate = text.includes(todayStr)
    const hasNickname = !nickname || text.includes(nickname)
    const hasMinCount = streamCount >= 100

    passed = hasMelon && hasArtist && hasSong && hasFeat && hasDate && hasNickname && hasMinCount
    
    // [DEBUG] 각 조건별 통과 여부 로그
    console.log('Verification Results:', {
      hasMelon,
      hasArtist,
      hasSong,
      hasFeat,
      hasDate,
      hasNickname,
      hasMinCount,
      streamCount,
      todayStr
    })

    errorHint = '날짜, 아티스트, 곡명(흥흥흥), 또는 스밍횟수(100회 이상)를 확인해 주세요.'
  }

  if (!passed) {
    return res.status(400).json({ error: '인증 조건 미충족', hint: errorHint })
  }

  // 5. 해시 저장
  await supabase.from('used_card_hashes').insert({ card_hash: cardHash, platform })

  // 6. JWT 발급
  const token = jwt.sign(
    { verified: true, platform },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )

  return res.status(200).json({ token })
}
