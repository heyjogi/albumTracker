import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
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


// ✅ UI 전용 컴포넌트 (HTML 분리)
function PocaBoardView(props) {
  const {
    navigate,
    handleReset,
    ownedCards,
    totalCards,
    dupCards,
    albumVersions,
    activeTab,
    setActiveTab,
    activeVersion,
    cardCounts,
    handleCardClick,
    modal,
    setModal,
    handleModalSave
  } = props

  return (
    <div className="poca-wrapper">
      <header className="poca-header">
        <button onClick={() => navigate('/')}>←</button>
        <h1>Caligo pt.2</h1>
        <button onClick={handleReset}>초기화</button>
      </header>

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

      {modal && (
        <CountModal
          card={modal.card}
          count={modal.count}
          onClose={() => setModal(null)}
          onSave={handleModalSave}
        />
      )}
    </div>
  )
}


// 메인
export default function PocaBoard() {
  const navigate = useNavigate()

  const [albumVersions, setAlbumVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cardCounts, setCardCounts] = useState(() => loadFromStorage())
  const [modal, setModal] = useState(null)
  const [activeTab, setActiveTab] = useState(null)

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

        const transformed = transformData(data || [])
        setAlbumVersions(transformed)
        if (transformed.length > 0) setActiveTab(transformed[0].id)
      } catch {
        setError('데이터 불러오기 실패')
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
    const ok = window.confirm('초기화 하시겠습니까?');
    if (!ok) return;

    setCardCounts({})
    localStorage.removeItem(STORAGE_KEY)
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
      ownedCards={ownedCards}
      totalCards={totalCards}
      dupCards={dupCards}
      albumVersions={albumVersions}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      activeVersion={activeVersion}
      cardCounts={cardCounts}
      handleCardClick={handleCardClick}
      modal={modal}
      setModal={setModal}
      handleModalSave={handleModalSave}
    />
  )
}