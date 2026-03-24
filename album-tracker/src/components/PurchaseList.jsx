import PurchaseItem from './PurchaseItem'

export default function PurchaseList({ list, refresh }) {
    if (!list || list.length === 0) {
        return (
            <div className="mt-8 text-center p-8 bg-white/50 rounded-2xl border border-dashed border-brand-200">
                <p className="text-slate-500 mb-2">진행 중인 구매 내역이 없습니다.</p>
                <p className="text-sm text-slate-400">새 구매내역 등록을 통해 분철을 시작해보세요.</p>
            </div>
        )
    }

    return (
        <div className="mt-8 space-y-4 pb-20">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800">진행 중인 분철/구매</h2>
                <button className="text-brand-600 text-sm font-semibold hover:underline">
                    전체 보기 →
                </button>
            </div>
            {list.map(v => (
                <PurchaseItem key={v.id} item={v} refresh={refresh} />
            ))}
        </div>
    )
}