import './SummaryCard.css'

export default function SummaryCard({ list }) {
    if (!list) return null

    const totalExpenditure = list.reduce((acc, curr) => {
        const itemShipping = curr.shipping_fee ? (curr.team_id ? curr.shipping_fee / 5 : curr.shipping_fee) : 0
        return acc + (curr.price * curr.quantity) + itemShipping
    }, 0)

    const albumCounts = {}
    list.forEach(v => {
        const name = v.album_name || '기타'
        albumCounts[name] = (albumCounts[name] || 0) + v.quantity
    })

    const sortedAlbums = Object.entries(albumCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
    const maxCount = sortedAlbums.length > 0 ? sortedAlbums[0][1] : 1

    return (
        <div className="sc-container">
            <div className="sc-total-card">
                <div className="sc-total-content">
                    <p className="sc-total-label">총 지출 금액</p>
                    <h2 className="sc-total-value">₩{totalExpenditure.toLocaleString()}</h2>
                </div>
                <div className="sc-deco-1"></div>
                <div className="sc-deco-2"></div>
            </div>

            {sortedAlbums.length > 0 && (
                <div className="sc-stats-card">
                    <div className="sc-stats-header">
                        <h3 className="sc-stats-title">앨범 종류별 수량</h3>
                        <svg className="sc-stats-icon" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                    </div>
                    <div className="sc-stats-list">
                        {sortedAlbums.map(([name, count], idx) => {
                            const colors = ['bg-brand-500', 'bg-emerald-500', 'bg-amber-500']
                            const color = colors[idx % colors.length]
                            const percentage = Math.max((count / maxCount) * 100, 10)
                            return (
                                <div key={name} className="sc-stat-item">
                                    <span className="sc-stat-name">{name}</span>
                                    <div className="sc-stat-bar-bg">
                                        <div className={`sc-stat-bar-fill ${color}`} style={{ width: `${percentage}%` }}></div>
                                    </div>
                                    <span className="sc-stat-count">{count}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}