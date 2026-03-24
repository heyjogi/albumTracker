export default function SummaryCard({ list }) {
    if (!list) return null

    const totalExpenditure = list.reduce((acc, curr) => {
        return acc + (curr.price * curr.quantity)
    }, 0)

    // Aggregate by album_name
    const albumCounts = {}
    list.forEach(v => {
        const name = v.album_name || '기타'
        if (!albumCounts[name]) albumCounts[name] = 0
        albumCounts[name] += v.quantity
    })

    const sortedAlbums = Object.entries(albumCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
    const maxCount = sortedAlbums.length > 0 ? sortedAlbums[0][1] : 1

    return (
        <div className="space-y-6">
            {/* 총 지출 금액 카드 */}
            <div className="bg-brand-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-brand-100 font-medium mb-1 drop-shadow-sm">총 지출 금액</p>
                    <h2 className="text-3xl font-bold tracking-tight">
                        ₩{totalExpenditure.toLocaleString()}
                    </h2>
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-brand-800 opacity-20 rounded-full blur-xl"></div>
            </div>

            {/* 앨범 종류별 수량 요약 */}
            {sortedAlbums.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800">앨범 종류별 수량</h3>
                        <svg className="w-5 h-5 text-brand-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                    </div>
                    <div className="space-y-3">
                        {sortedAlbums.map(([name, count], idx) => {
                            const colors = ['bg-brand-500', 'bg-emerald-500', 'bg-amber-500']
                            const color = colors[idx % colors.length]
                            const percentage = Math.max((count / maxCount) * 100, 10)
                            return (
                                <div key={name} className="flex items-center gap-3">
                                    <span className="w-24 text-sm font-medium text-slate-600 truncate">{name}</span>
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
                                    </div>
                                    <span className="w-6 text-right font-bold text-slate-800 text-sm">{count}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}