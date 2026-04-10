# album-tracker 스밍인증 구현 계획

## 핵심 방향 (v3)

**목표: "100% 차단" ❌ → "귀찮게 만들어서 팬만 쓰게" ✅**

포카보드 열람은 누구나 가능. 이미지 저장(Export) 기능만 스밍인증 후 활성화.

```
[기존 계획]  PocaBoard 진입 → StreamingAuthModal 강제 → 통과 후 전체 기능
[v3 방향]    PocaBoard 진입 → 바로 열람 가능
             저장 버튼 클릭 → 미인증 시 StreamingAuthModal 띄움 → 인증 후 저장 실행
```

### 근거

1. **이미지 저장은 클라이언트 only**: `exportPocaBoardImage()`는 html2canvas → canvas.toBlob → 다운로드/share. 서버 비용 0원. 이미지 저장 자체가 Egress를 발생시키지 않음.
2. **실제 비용 = 트래픽 관리 문제**: Vercel Egress(번들+이미지 서빙)가 비용의 전부. 서버 로직 부담은 거의 없음. 2시간 구조 캐시(`pocaboard_structure_v3`)가 Supabase Egress를 이미 최적화 중.
3. **OCR은 터질 수 있지만 서비스는 죽지 않음**: 인증 API가 timeout 나도 포카보드 열람에는 영향 없음.
4. **UX 개선**: 인증 실패/OCR 오류로 팬이 포카보드 접근조차 못 하는 최악의 UX 방지. 스밍 안 하면 캡처로 쓰면 됨 — 자연스럽게 허용.
5. **AuthWrapper 완벽 호환**: `/pocaboard`가 이미 PUBLIC_PATHS에 포함 → 수정 불필요.

---

## 비용 구조

| 행위 | 비용 발생 | 비고 |
|------|-----------|------|
| 포카보드 열람 | Vercel Egress (번들 ~500KB) | 접근자 1인당 1회 |
| DB 구조 조회 | Supabase DB Egress | 2시간 캐시로 최소화됨 |
| 이미지 저장 (Export) | **없음** (클라이언트 only) | html2canvas → blob → 다운로드 |
| 스밍 인증 API | Vercel Function 호출 (~1KB) | 인증 1회당 (JWT 30일로 재호출 최소화) |
| 스밍 인증 API (OCR) | CPU 시간 | Hobby 플랜 1h/월, 4,000건 기준 여유 있음 |

### 배포 3일 실측 기준 현황

- 방문자 3,111명 / Fast Data Transfer 2.38GB / Edge Requests 82K / CPU 7s
- 가장 빠르게 증가하는 지표: **Data Transfer (Egress)**
- CPU는 거의 미사용 → OCR 서버 로직 추가 여유 충분

### Egress 피크 추정

```
발매 당일 5,000명 접속 기준:
  번들: 5,000명 × 500KB = 2.5GB
  API 응답: 4,000건 × 1KB = 4MB (무시 가능)
  월 합계: 6~10GB / 100GB 한도 → ✅ 안전
```

### ⚠️ 절대 금지

```
Tesseract.js 클라이언트 번들:
  5,000명 × 12MB (kor+eng) = 60GB → 무료 플랜 한도 초과
  → 반드시 서버사이드(API Route)에서만 OCR 실행
```

---

## 코드 분석 결과

### localStorage 키 현황 (충돌 없음)

| 키 | 용도 | 만료 |
|----|------|------|
| `pocaboard_v1` | 카드 카운트 히스토리 | 없음 (영구) |
| `pocaboard_structure_v3` | Supabase 구조 캐시 | 2시간 TTL |
| `streaming_auth_token` | JWT 인증 토큰 | 30일 |
| `pending_auth_id` | 수동 승인 대기 UUID | 영구 (승인/거절 시 삭제) |

**→ 재인증 시 `streaming_auth_token`만 갱신. `pocaboard_v1`은 절대 건드리지 않음. ✅**

### PocaBoard 구조

```
PocaBoard() ← 메인 로직 (데이터 페치, 상태 관리)
    └── PocaBoardView() ← 순수 UI 컴포넌트 (props만 받음)
```

v3 변경: 인증 게이트를 상단 차단에서 `handleExport` 내부 체크로 이동. `PocaBoardView`는 수정 불필요.

### AuthWrapper 현황 — 수정 불필요

```javascript
const PUBLIC_PATHS = ['/login', '/pocaboard', '/privacy']
// /pocaboard는 이미 public → 그대로 유지
```

---

## 재인증 시 히스토리 유지 흐름

```
JWT 만료 (30일 후)
    ↓
useStreamingAuth: localStorage.removeItem('streaming_auth_token')
    ↓     ← 'pocaboard_v1' 건드리지 않음 ✅
유저가 저장 버튼 클릭
    ↓
isVerified === false → StreamingAuthModal 표시
    ↓
재인증 통과 → 새 JWT 저장
    ↓
저장 기능 즉시 자동 실행 (cardCounts는 'pocaboard_v1'에서 그대로)
```

**⚠️ 재인증 모달에 반드시 표시:**
> "포카보드 기록은 그대로 유지됩니다."
> "오늘 날짜의 스밍카드로 재인증해 주세요."

---

## 트래픽 대응 전략

### OCR 병목 대응

OCR이 timeout나도 서비스 자체는 죽지 않음 — 포카보드 열람에 영향 없음.

**1. 사전 인증 유도 (가장 효과적)**
```
"이미지 저장 기능을 사용하려면 스밍 인증이 필요합니다.
발매 전에 미리 인증해두시면 발매 당일 바로 저장하실 수 있어요."
```

**2. IP Rate Limit**
```
IP당 1분 3회 → 폭주 방지
```

**3. 실패 UX**
```javascript
if (response.status === 504 || response.status === 503) {
  setError('서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.')
}
```

**4. 날짜 조건 완화 옵션 (피크 기간 한정)**
```javascript
// 발매 당일 혼잡 시 ±1일 허용으로 부하 분산 가능
const isRecentDate = [yesterday, today, tomorrow].some(d => text.includes(d))
```

### 피크 시나리오

```
발매 당일 3,000~5,000명 동시 접속
    ↓
포카보드 열람: 전원 (인증 없이 즉시 접근)  ← v3 핵심
    ↓
이미지 저장 시 미인증자만 OCR 인증 시도: 약 1,000~2,000명
    ↓
동시 OCR 처리: 50~100건 (인증 성공자는 JWT로 스킵)
    ↓
일부 성공 / 일부 timeout → 전체 서비스 영향 없음
```

---

## 번들 최적화 목표

```
현재: ~500KB
목표: 300KB 이하
방법: 코드 스플리팅, 불필요한 라이브러리 제거
     Tesseract.js 절대 클라이언트 포함 금지
```

---

## 구현 파일 목록

### 새로 만들 파일

```
album-tracker/        ← Vercel 프로젝트 Root
├── api/
│   ├── verify-card.js       # 서버사이드 OCR + 규칙 검증 + JWT 발급
│   └── admin-approve.js     # 관리자 수동 승인 + JWT 발급

src/
├── components/
│   ├── StreamingAuthModal.jsx
│   └── StreamingAuthModal.css
├── hooks/
│   └── useStreamingAuth.js
└── pages/
    └── AdminAuth.jsx        # 수동 승인 관리자 페이지
```

### 수정할 파일

```
src/pages/PocaBoard.jsx      # handleExport에 인증 게이트 추가
src/App.tsx                  # /admin-auth 라우트 추가
vercel.json                  # functions 설정 추가
```

---

## Supabase 테이블

```sql
-- 중복 카드 방지 (개인정보 없음, 이미지 저장 안 함)
CREATE TABLE used_card_hashes (
  card_hash  TEXT PRIMARY KEY,
  platform   TEXT NOT NULL,  -- 'melon' | 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기타/해외 수동 승인 대기열
CREATE TABLE pending_verifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname       TEXT NOT NULL,
  platform       TEXT NOT NULL,
  note           TEXT,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approval_token TEXT,        -- 승인 시 JWT 저장 (유저가 조회해서 가져감)
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  approved_at    TIMESTAMPTZ
);
```

### RLS 설정

```sql
-- used_card_hashes: api/verify-card.js에서 service_role로만 접근
-- anon 정책 없음 → service_role만 write 가능
ALTER TABLE used_card_hashes ENABLE ROW LEVEL SECURITY;

-- pending_verifications
ALTER TABLE pending_verifications ENABLE ROW LEVEL SECURITY;
-- 신청(insert): 누구나 가능
CREATE POLICY "anon insert" ON pending_verifications
  FOR INSERT TO anon WITH CHECK (true);
-- 상태 조회(select): UUID를 알아야만 조회 가능 (anon은 본인 UUID만 localStorage에 보관)
CREATE POLICY "anon select" ON pending_verifications
  FOR SELECT TO anon USING (true);
-- UPDATE: service_role만 (api/admin-approve.js에서 처리, RLS 우회)
```

---

## 상세 구현 코드

### 1. `api/verify-card.js`

```javascript
import { createWorker } from 'tesseract.js'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ─── Rate Limit (in-memory) ───────────────────────────────────────────────────
// 서버리스 특성상 인스턴스 간 공유 안 됨 → 동일 인스턴스 내 요청만 카운트
// 완벽한 차단은 아니지만 단순 폭주/봇 억제에 충분
// 진짜 엄격하게 하려면 Supabase KV나 Upstash Redis 필요 (지금은 오버스펙)
const rateLimitMap = new Map() // key: IP, value: { count, resetAt }

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true // 허용
  }
  if (entry.count >= 3) return false // 1분 3회 초과 → 차단
  entry.count++
  return true
}
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // 0. Rate Limit 체크
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: '요청이 너무 많습니다. 1분 후 다시 시도해 주세요.' },
      { status: 429 }
    )
  }

  const { imageBase64, platform, nickname } = await req.json()

  // 1. 이미지 → SHA256 해시
  const buffer = Buffer.from(imageBase64, 'base64')
  const cardHash = crypto.createHash('sha256').update(buffer).digest('hex')

  // 2. 중복 해시 체크
  const { data: existing } = await supabase
    .from('used_card_hashes')
    .select('card_hash')
    .eq('card_hash', cardHash)
    .maybeSingle()

  if (existing) {
    return Response.json(
      { error: '이미 사용된 카드입니다. 오늘 날짜의 스트리밍 카드로 재시도해 주세요.' },
      { status: 400 }
    )
  }

  // 3. 서버사이드 OCR (timeout 50초)
  // ⚠️ Worker 재사용 불가 이유:
  //   Vercel Serverless는 요청마다 독립 실행 컨텍스트 → 전역 변수 유지 불가
  //   (warm 인스턴스 재사용 가능성 있지만 보장 안 됨)
  //   → 매 요청마다 createWorker가 필요. cold start 비용은 이미지 압축(클라이언트)으로 최소화.
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
      return Response.json(
        { error: '서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.' },
        { status: 503 }
      )
    }
    throw err
  } finally {
    await worker?.terminate()
  }

  // 4. 규칙 기반 검증
  const today = new Date()
  const todayStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`

  let passed = false
  let errorHint = ''

  if (platform === 'melon') {
    const rawCount = text.match(/내\s*스트리밍[\s\S]{0,20}?([\d,]+)/)?.[1] || '0'
    const streamCount = parseInt(rawCount.replace(/,/g, ''))
    passed = (
      /melon\s*trend/i.test(text) &&
      /plave/i.test(text) &&
      text.includes(todayStr) &&
      (!nickname || text.includes(nickname)) &&  // 한글 닉네임 OCR 실패 시 통과 허용
      streamCount >= 100
    )
    errorHint = '날짜와 스밍횟수를 확인해 주세요.'
  }

  if (!passed) {
    return Response.json({ error: '인증 조건 미충족', hint: errorHint }, { status: 400 })
  }

  // 5. 해시 저장 (이미지 자체는 저장 안 함)
  await supabase.from('used_card_hashes').insert({ card_hash: cardHash, platform })

  // 6. JWT 발급 (30일)
  const token = jwt.sign(
    { verified: true, platform },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )

  return Response.json({ token })
}
```

### 2. `api/admin-approve.js`

```javascript
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { id, status, adminKey } = await req.json()

  // 1. 관리자 비밀키 검증 (서버 환경변수와 비교 — 클라이언트에 정답 노출 없음)
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. DB 업데이트 (service_role로 RLS 우회)
  const updateData = { status }
  if (status === 'approved') {
    updateData.approved_at = new Date().toISOString()

    // 3. 승인 시 JWT 발급 → approval_token 컬럼에 저장
    //    유저가 checkApprovalStatus()로 조회해서 가져감
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

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
```

### 3. `src/hooks/useStreamingAuth.js`

```javascript
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
```

### 4. `src/pages/PocaBoard.jsx` 수정 — v3 핵심 변경

기존 코드에 추가/변경할 부분만 기재. 나머지는 그대로 유지.

```javascript
// 추가할 import
import { useStreamingAuth } from '../hooks/useStreamingAuth'
import StreamingAuthModal from '../components/StreamingAuthModal'

export default function PocaBoard() {
  const navigate = useNavigate()
  const { isVerified, saveToken } = useStreamingAuth()
  //  ↑ authLoading은 사용 안 함 (상단 차단 없으므로)

  // 신규 state (기존 state 선언들 뒤에 추가)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingExport, setPendingExport] = useState(null)  // 인증 후 자동 실행할 파라미터

  // ⚡ v3 변경: 상단의 인증 차단 블록 삭제
  // if (authLoading) return <div>...</div>   ← 삭제
  // if (!isVerified) return <StreamingAuthModal /> ← 삭제

  // ⚡ v3 변경: handleExport에서만 인증 체크
  const handleExport = async (exportTabIds, excludeCompleted) => {
    if (exporting || !albumVersions.length) return

    if (!exportTabIds || exportTabIds.length === 0) {
      alert('잠깐 타임✋, 앨범 종류를 선택해볼까~🌸')
      return
    }

    // 미인증 → 파라미터 저장 후 모달 표시
    if (!isVerified) {
      setPendingExport({ exportTabIds, excludeCompleted })
      setShowAuthModal(true)
      return
    }

    // 인증 완료 → 기존 export 로직 그대로
    setExporting(true)
    setExportModal(false)
    try {
      await exportPocaBoardImage(albumVersions, cardCounts, 'pocaboard', exportTabIds, excludeCompleted)
    } catch (e) {
      console.error('이미지 저장 실패:', e)
      alert('이미지 저장에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  // 인증 성공 콜백 — 토큰 저장 후 pendingExport 자동 실행
  const handleAuthSuccess = (token) => {
    saveToken(token)
    setShowAuthModal(false)
    if (pendingExport) {
      const { exportTabIds, excludeCompleted } = pendingExport
      setPendingExport(null)
      setTimeout(() => handleExport(exportTabIds, excludeCompleted), 100)
      //  ↑ state 업데이트 반영 후 실행하기 위해 tick 한 박자 띄움
    }
  }

  // return 부분 — PocaBoardView 뒤에 조건부 모달 추가
  return (
    <>
      <PocaBoardView
        {/* 기존 props 그대로 */}
      />
      {showAuthModal && (
        <StreamingAuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => { setShowAuthModal(false); setPendingExport(null) }}
        />
      )}
    </>
  )
}
```

### 5. `src/components/StreamingAuthModal.jsx`

```javascript
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'  // ← 실제 경로 주의 (supabaseClient 아님)
import './StreamingAuthModal.css'

export default function StreamingAuthModal({ onSuccess, onClose }) {
  const [activeTab, setActiveTab] = useState('melon')
  const [nickname, setNickname] = useState('')
  const [platform, setPlatform] = useState('bugs')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
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
        setError('요청이 너무 많습니다. 1분 후 다시 시도해 주세요. 🙏')
      } else if (res.status === 503 || res.status === 504) {
        setError('서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.')
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
        <button className="auth-close-btn" onClick={onClose}>✕</button>
        <h2>스밍 인증</h2>
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
                기타/해외 (수동 승인)
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
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} />
                  {imagePreview && <img src={imagePreview} alt="Preview" className="preview-img" />}
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
                  placeholder="인증 내역 확인할 수 있는 링크나 메모를 남겨주세요."
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
```

### 6. `src/pages/AdminAuth.jsx`

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminAuth() {
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

  if (!authenticated) {
    return (
      <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto' }}>
        <h2>관리자 인증</h2>
        <input
          type="password"
          placeholder="관리자 비밀키"
          value={adminKey}
          onChange={e => setAdminKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', padding: '8px', marginBottom: '12px', boxSizing: 'border-box' }}
        />
        <button onClick={handleLogin} style={{ width: '100%', padding: '8px' }}>
          로그인
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>스밍인증 수동 승인 관리</h2>
      <button onClick={fetchPending} style={{ marginBottom: '12px' }}>새로고침</button>
      {loading && <p>처리 중...</p>}
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>닉네임</th><th>플랫폼</th><th>메모</th><th>신청일</th><th>액션</th>
          </tr>
        </thead>
        <tbody>
          {pendingList.length === 0 ? (
            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '16px' }}>대기 중인 신청이 없습니다.</td></tr>
          ) : (
            pendingList.map(item => (
              <tr key={item.id}>
                <td>{item.nickname}</td>
                <td>{item.platform}</td>
                <td style={{ maxWidth: '200px', wordBreak: 'break-all' }}>{item.note}</td>
                <td>{new Date(item.created_at).toLocaleString('ko-KR')}</td>
                <td>
                  <button onClick={() => handleAction(item.id, 'approved')} disabled={loading}>승인</button>
                  <button onClick={() => handleAction(item.id, 'rejected')} disabled={loading} style={{ color: 'red', marginLeft: '8px' }}>거절</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
```

### 7. `vercel.json` 수정

```json
{
  "functions": {
    "api/verify-card.js": { "maxDuration": 60 },
    "api/admin-approve.js": { "maxDuration": 10 }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**주의사항:**
- `/api/(.*)` rewrite 불필요 — Vercel은 `api/` 폴더를 자동으로 Serverless Function으로 인식
- `verify-card.js`는 Tesseract OCR 실행 시간을 고려해 `maxDuration: 60` (Hobby 플랜 최대값)
- Vercel 프로젝트 Root Directory가 `album-tracker/`로 설정되어야 `api/` 폴더를 인식함

### 8. `src/App.tsx`에 추가

```typescript
import AdminAuth from './pages/AdminAuth'

// Routes에 추가
<Route path="/admin-auth" element={<AdminAuth />} />

// AuthWrapper의 PUBLIC_PATHS에 추가 — 기존 Supabase 로그인 없이 접근 가능해야 함
// (AdminAuth 자체 비밀키 입력으로 보호)
// AuthWrapper.jsx의 PUBLIC_PATHS에 '/admin-auth' 추가
```

---

## 환경변수 (Vercel Dashboard + 로컬 `.env`)

```
SUPABASE_URL=          기존 VITE_SUPABASE_URL과 동일값
SUPABASE_SERVICE_KEY=  Supabase > Settings > API > service_role key
JWT_SECRET=            랜덤 32자 이상 문자열 (예: openssl rand -base64 32)
ADMIN_SECRET_KEY=      관리자 페이지 접근용 비밀키
```

## 패키지 추가

```bash
npm install tesseract.js jsonwebtoken
```

---

## 구현 순서

```
Phase 1: 기반
  1. Supabase 테이블 생성 + RLS 설정
  2. 환경변수 설정 (Vercel Dashboard + 로컬 .env)
  3. vercel.json 수정

Phase 2: API Route
  4. api/verify-card.js
  5. api/admin-approve.js

Phase 3: 프론트엔드
  6. useStreamingAuth.js
  7. StreamingAuthModal.jsx + CSS
  8. PocaBoard.jsx — handleExport에 인증 게이트 추가 (상단 차단 없음)

Phase 4: 관리자 도구
  9. AdminAuth.jsx
  10. App.tsx에 /admin-auth 라우트 추가
  11. AuthWrapper.jsx PUBLIC_PATHS에 '/admin-auth' 추가

Phase 5: 테스트 & 배포
  12. 로컬 테스트 (vercel dev로 API Route 포함 확인)
  13. OCR 정확도 튜닝 (실제 멜론 스밍카드로 테스트)
  14. Vercel Preview 배포 후 최종 확인
  15. 발매 전날 사전 인증 유도 공지
```

---

## 제약 조건 최종 체크

| 항목 | 상태 | 비고 |
|------|------|------|
| Supabase Storage 사용 | ❌ 없음 | 이미지 저장 안 함, Cached Egress 추가 없음 |
| Vercel Egress | ✅ 안전 | 월 6~10GB 예상 / 100GB 한도 |
| Tesseract 클라이언트 번들 | ✅ 없음 | 서버사이드(API Route)에서만 실행 |
| Vercel API 요청 수 | ✅ 안전 | ~4,000건 / 100만 한도 |
| Vercel Serverless 실행시간 | ✅ 여유 | maxDuration 60초 / 1h 월 한도 |
| 포카보드 열람 차단 | ❌ 없음 | 누구나 열람 가능 (v3 핵심) |
| 이미지 저장 인증 게이트 | ✅ | handleExport 진입 시점에만 체크 |
| 재인증 시 히스토리 유지 | ✅ | `pocaboard_v1` 절대 건드리지 않음 |
| 기존 구조 캐시 충돌 | ✅ 없음 | `pocaboard_structure_v3`와 키 분리 |
| PocaBoardView 수정 필요 | ❌ 없음 | PocaBoard() handleExport만 수정 |
| 수동 승인 토큰 발급 | ✅ | api/admin-approve.js에서 실제 JWT 발급 |
| 유저 개인정보 저장 | ❌ 없음 | 해시값만 저장 |
| 구현 목표 | ✅ | "100% 차단" ❌ "귀찮게 만들어서 팬만 쓰게" ✅ |
