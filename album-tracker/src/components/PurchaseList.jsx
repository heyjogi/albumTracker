import PurchaseItem from './PurchaseItem'
import './PurchaseList.css'

export default function PurchaseList({ list, refresh }) {
    if (!list || list.length === 0) {
        return (
            <div className="pl-empty-container">
                <p className="pl-empty-title">진행 중인 구매 내역이 없습니다.</p>
                <p className="pl-empty-subtitle">새 구매내역 등록을 통해 분철을 시작해보세요.</p>
            </div>
        )
    }

    return (
        <div className="pl-container">
            <div className="pl-header">
                <h2 className="pl-title">진행 중인 분철/구매</h2>
                <button className="pl-view-all">
                    전체 보기 →
                </button>
            </div>
            {list.map(v => (
                <PurchaseItem key={v.id} item={v} refresh={refresh} />
            ))}
        </div>
    )
}