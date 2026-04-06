import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { exportPocaBoardImage } from '../utils/exportPocaBoard'
import './PocaBoard.css'

const STORAGE_KEY = 'pocaboard_v1'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL


// localStorage 유틸
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    console.error('localStorage 저장 실패')
  }
}

// 보드 구조(앨범/카드 리스트) 캐시 유틸 (sessionStorage 사용)
const STRUCTURE_CACHE_KEY = 'pocaboard_structure_v1'

function loadStructureFromCache() {
  try {
    const raw = sessionStorage.getItem(STRUCTURE_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveStructureToCache(data) {
  try {
    sessionStorage.setItem(STRUCTURE_CACHE_KEY, JSON.stringify(data))
  } catch {
    console.error('sessionStorage 저장 실패')
  }
}

// storage image_path → 공개 URL 변환
function getImageUrl(imagePath) {
  if (!imagePath) return null
  return `${SUPABASE_URL}/storage/v1/object/public/event-images/${imagePath}`
}

// DB 데이터 → 구조 변환
function transformData(dbData) {
  return dbData.map(type => {
    const grouped = {}

      ; (type.poca_components || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .forEach(comp => {
          const groupKey = comp.component_name

          if (!grouped[groupKey]) {
            grouped[groupKey] = []
          }

          grouped[groupKey].push({
            id: comp.id,
            name: comp.member_names?.member_name ?? comp.component_name,
            image: getImageUrl(comp.image_path),
          })
        })

    return {
      id: type.id,
      name: type.type_name,
      groups: Object.entries(grouped).map(([name, cards]) => ({
        name,
        cards
      }))
    }
  })
}


// 카드
function PocaCard({ card, count, onClick }) {
  const hasCard = count > 0
  const isDuplicate = count > 1

  return (
    <div
      className={`poca-card ${hasCard ? 'poca-card--owned' : ''} ${isDuplicate ? 'poca-card--dup' : ''}`}
      onClick={() => onClick(card.id)}
      title={`${card.name} (${count}장)`}
    >
      <div className="poca-card__inner">
        {card.image ? (
          <img src={card.image} alt={card.name} className="poca-card__img" />
        ) : (
          <div className="poca-card__placeholder">
            <span className="poca-card__initial">{card.name.charAt(0)}</span>
          </div>
        )}
        {!hasCard && <div className="poca-card__overlay" />}
        {isDuplicate && <div className="poca-card__badge">{count}</div>}
      </div>
      <p className="poca-card__name">{card.name}</p>
    </div>
  )
}


// 모달
function CountModal({ card, count, onClose, onSave }) {
  const [val, setVal] = useState(count)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{card.name}</h3>
        <p className="modal-sub">보유 수량을 설정하세요</p>

        <div className="modal-counter">
          <button onClick={() => setVal(v => Math.max(0, v - 1))}>−</button>
          <span>{val}</span>
          <button onClick={() => setVal(v => v + 1)}>+</button>
        </div>

        {val === 0 && <p className="modal-warn">삭제하시겠습니까?</p>}

        <div className="modal-actions">
          <button onClick={onClose}>취소</button>
          <button onClick={() => onSave(val)}>확인</button>
        </div>
      </div>
    </div>
  )
}

function ExportModal({ onClose, onExport, albumVersions }) {
  const [selectedTabs, setSelectedTabs] = useState(['all'])
  const [excludeCompleted, setExcludeCompleted] = useState(false)

  const handleToggle = (id) => {
    if (id === 'all') {
      if (selectedTabs.includes('all')) {
        setSelectedTabs([])
      } else {
        setSelectedTabs(['all'])
      }
    } else {
      let newSelected = selectedTabs.filter(t => t !== 'all')
      if (newSelected.includes(id)) {
        newSelected = newSelected.filter(t => t !== id)
      } else {
        newSelected.push(id)
      }

      if (newSelected.length === 0) {
        setSelectedTabs([])
      } else if (newSelected.length === albumVersions.length) {
        setSelectedTabs(['all'])
      } else {
        setSelectedTabs(newSelected)
      }
    }
  }

  const isAll = selectedTabs.includes('all')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">이미지 추출</h3>

        <div className="export-options" style={{ marginTop: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>추출 대상 (다중 선택 가능)</label>

            <div style={{ padding: '0 4px 8px 4px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isAll}
                  onChange={() => handleToggle('all')}
                  style={{ width: '18px', height: '18px', accentColor: '#d93915' }}
                />
                전체
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '10px', maxHeight: '150px', overflowY: 'auto' }}>
              {albumVersions.map(ver => (
                <label key={ver.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isAll || selectedTabs.includes(ver.id)}
                    onChange={() => handleToggle(ver.id)}
                    style={{ width: '16px', height: '16px', accentColor: '#d93915' }}
                  />
                  {ver.name}
                </label>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={excludeCompleted}
              onChange={e => setExcludeCompleted(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#d93915' }}
            />
            드볼 제외
          </label>
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>취소</button>
          <button onClick={() => onExport(selectedTabs, excludeCompleted)}>추출하기</button>
        </div>
      </div>
    </div>
  )
}


// ✅ UI 전용 컴포넌트 (HTML 분리)
function PocaBoardView(props) {
  const {
    navigate,
    handleReset,
    handleExport,
    exporting,
    albumVersions,
    activeTab,
    setActiveTab,
    activeVersion,
    cardCounts,
    handleCardClick,
    modal,
    setModal,
    handleModalSave,
    exportModal,
    setExportModal
  } = props

  return (
    <div className="poca-wrapper">
      <header className="poca-header">
        <button onClick={() => navigate('/')}>←</button>
        <h1>Caligo pt.2</h1>
        <div className="poca-header__actions">
          <button
            onClick={() => setExportModal(true)}
            disabled={exporting}
            className="poca-export-btn"
            title="이미지 저장"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0 3-3m-3 3V2.25" />
            </svg>

          </button>
          <span className="poca-header__divider">|</span>
          <button onClick={handleReset} className="poca-reset-btn">초기화</button>
        </div>
      </header >

      <div className="poca-tabs">
        {albumVersions.map(ver => (
          <button
            key={ver.id}
            onClick={() => setActiveTab(ver.id)}
            className={activeTab === ver.id ? 'active' : ''}
          >
            {ver.name}
          </button>
        ))}
      </div>

      <div className="poca-grid-area">
        {activeVersion?.groups.map(group => (
          <div key={group.name} className="poca-group">
            <h3 className="poca-group-title">{group.name}</h3>

            <div className="poca-grid">
              {group.cards.map(card => (
                <PocaCard
                  key={card.id}
                  card={card}
                  count={cardCounts[card.id] || 0}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {
        modal && (
          <CountModal
            card={modal.card}
            count={modal.count}
            onClose={() => setModal(null)}
            onSave={handleModalSave}
          />
        )
      }

      {exportModal && (
        <ExportModal
          albumVersions={albumVersions}
          onClose={() => setExportModal(false)}
          onExport={handleExport}
        />
      )}
    </div >
  )
}


// 메인
export default function PocaBoard() {
  const navigate = useNavigate()

  const [albumVersions, setAlbumVersions] = useState(() => loadStructureFromCache() || [])
  const [loading, setLoading] = useState(!loadStructureFromCache())
  const [error, setError] = useState(null)
  const [cardCounts, setCardCounts] = useState(() => loadFromStorage())
  const [modal, setModal] = useState(null)
  const [exportModal, setExportModal] = useState(false)
  const [activeTab, setActiveTab] = useState(() => {
    const cached = loadStructureFromCache()
    return cached && cached.length > 0 ? cached[0].id : null
  })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('poca_album_types')
          .select(`
            id,
            type_name,
            poca_components (
              id,
              component_name,
              image_path,
              sort_order,
              member_id,
              member_names (member_name)
            )
          `)

        if (error) throw error

        let transformed = transformData(data || [])

        // 미공포 데이터 가져오기
        const { data: migongpoRaw, error: mError } = await supabase
          .from('album_members')
          .select(`
            id,
            member_name,
            event_image_url,
            sort_order,
            album_id,
            safe_store_albums (
              created_at,
              safe_stores (
                name
              )
            )
          `)

        if (mError) throw mError

        const storeToAlbumMap = {}
        const storeToCreatedAtMap = {}
        const groupedMigongpo = {}
          ; (migongpoRaw || [])
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .forEach(item => {
              const groupName = item.safe_store_albums?.safe_stores?.name || '미지정'

              if (!storeToAlbumMap[groupName]) {
                storeToAlbumMap[groupName] = item.album_id
                storeToCreatedAtMap[groupName] = item.safe_store_albums?.created_at || ''
              }
              if (storeToAlbumMap[groupName] !== item.album_id) {
                return
              }

              if (!groupedMigongpo[groupName]) {
                groupedMigongpo[groupName] = []
              }
              groupedMigongpo[groupName].push({
                id: item.id,
                name: item.member_name,
                image: item.event_image_url,
              })
            })

        const migongpoTab = {
          id: 'migongpo',
          name: '미공포',
          groups: Object.entries(groupedMigongpo).map(([name, cards]) => ({
            name,
            cards
          })).sort((a, b) => {
            const timeA = new Date(storeToCreatedAtMap[a.name] || 0).getTime()
            const timeB = new Date(storeToCreatedAtMap[b.name] || 0).getTime()
            return timeA - timeB
          })
        }

        const TAB_ORDER = ['PHOTOBOOK', 'INVENTORY', 'ID PASS', 'POCAALBUM', '미공포']

        const finalTabs = [...transformed, migongpoTab].sort((a, b) => {
          let indexA = TAB_ORDER.indexOf(a.name)
          let indexB = TAB_ORDER.indexOf(b.name)
          if (indexA === -1) indexA = 999
          if (indexB === -1) indexB = 999
          return indexA - indexB
        })

        // 데이터가 실제로 변경되었을 때만 업데이트 (불필요한 리렌더링 및 캐시 갱신 방지)
        const currentStructure = loadStructureFromCache()
        if (JSON.stringify(finalTabs) !== JSON.stringify(currentStructure)) {
          setAlbumVersions(finalTabs)
          saveStructureToCache(finalTabs)

          // 탭이 하나도 선택되지 않은 경우만 첫 번째 탭 선택
          if (!activeTab && finalTabs.length > 0) {
            setActiveTab(finalTabs[0].id)
          }
        }
      } catch (err) {
        console.error('백그라운드 데이터 갱신 실패:', err)
        // 캐시가 없는 경우에만 에러 표시
        if (!loadStructureFromCache()) {
          setError('데이터 불러오기 실패')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    saveToStorage(cardCounts)
  }, [cardCounts])

  const handleCardClick = (cardId) => {
    const current = cardCounts[cardId] || 0

    if (current === 0) {
      setCardCounts(prev => ({ ...prev, [cardId]: 1 }))
    } else {
      const card = albumVersions
        .flatMap(v => v.groups)
        .flatMap(g => g.cards)
        .find(c => c.id === cardId)
      setModal({ card, count: current })
    }
  }

  const handleModalSave = (newCount) => {
    const { card } = modal

    setCardCounts(prev => {
      const next = { ...prev }
      if (newCount === 0) delete next[card.id]
      else next[card.id] = newCount
      return next
    })

    setModal(null)
  }

  const handleReset = () => {
    const ok = window.confirm('잠깐 타임✋, 초기화 해볼까?🌸');
    if (!ok) return;

    setCardCounts({})
    localStorage.removeItem(STORAGE_KEY)
  }

  const handleExport = async (exportTabIds, excludeCompleted) => {
    if (exporting || !albumVersions.length) return

    if (!exportTabIds || exportTabIds.length === 0) {
      alert('잠깐 타임✋, 앨범 종류를 선택해볼까~🌸')
      return
    }

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

  const activeVersion = albumVersions.find(v => v.id === activeTab)

  const activeCards = activeVersion?.cards || []
  const totalCards = activeCards.length
  const ownedCards = activeCards.filter(c => (cardCounts[c.id] || 0) > 0).length
  const dupCards = activeCards.filter(c => (cardCounts[c.id] || 0) > 1).length

  if (loading) return <div>로딩중...</div>
  if (error) return <div>{error}</div>

  return (
    <PocaBoardView
      navigate={navigate}
      handleReset={handleReset}
      handleExport={handleExport}
      exporting={exporting}
      albumVersions={albumVersions}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      activeVersion={activeVersion}
      cardCounts={cardCounts}
      handleCardClick={handleCardClick}
      modal={modal}
      setModal={setModal}
      handleModalSave={handleModalSave}
      exportModal={exportModal}
      setExportModal={setExportModal}
    />
  )
}
