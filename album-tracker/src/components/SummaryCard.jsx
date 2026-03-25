import "./SummaryCard.css";

export default function SummaryCard({ list }) {
  if (!list) return null;

  const { totalExpenditure, settledAmount, unSettledAmount } = list.reduce(
    (acc, curr) => {
      const unitPrice = curr.price || 0;
      const unitShipping = curr.shipping_fee || 0;
      const unitDiscount = curr.shipping_discount || 0;
      const qty = curr.quantity || 1;

      // (개당 가격 + 개당 배송비 - 개당 할인액) * 수량
      const itemTotal = (unitPrice + unitShipping - unitDiscount) * qty;

      acc.totalExpenditure += itemTotal;

      // 정산 여부에 따른 합산
      if (curr.is_settled) {
        acc.settledAmount += itemTotal;
      } else {
        acc.unSettledAmount += itemTotal;
      }

      return acc;
    },
    { totalExpenditure: 0, settledAmount: 0, unSettledAmount: 0 },
  );

  const albumCounts = {};
  list.forEach((v) => {
    const name = v.album_name || "기타";
    albumCounts[name] = (albumCounts[name] || 0) + v.quantity;
  });

  const sortedAlbums = Object.entries(albumCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const maxCount = sortedAlbums.length > 0 ? sortedAlbums[0][1] : 1;

  return (
    <div className="sc-container">
      <div className="sc-total-card">
        <div className="sc-total-content">
          <p className="sc-total-label">총 지출 금액</p>
          <h2 className="sc-total-value">
            ₩{totalExpenditure.toLocaleString()}
          </h2>
          <div className="sc-sub-stats">
            <div className="sc-sub-item">
              <span className="sc-sub-label">정산 완료</span>
              <span className="sc-sub-value settled">
                ₩{settledAmount.toLocaleString()}
              </span>
            </div>
            <div className="sc-sub-divider"></div>
            <div className="sc-sub-item">
              <span className="sc-sub-label">미정산</span>
              <span className="sc-sub-value unsettled">
                ₩{unSettledAmount.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="sc-deco-1"></div>
          <div className="sc-deco-2"></div>
        </div>
        <div className="sc-deco-1"></div>
        <div className="sc-deco-2"></div>
      </div>

      {sortedAlbums.length > 0 && (
        <div className="sc-stats-card">
          <div className="sc-stats-header">
            <h3 className="sc-stats-title">앨범 종류별 수량</h3>
            <svg
              className="sc-stats-icon"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div className="sc-stats-list">
            {sortedAlbums.map(([name, count], idx) => {
              const colors = ["bg-brand-500", "bg-emerald-500", "bg-amber-500"];
              const color = colors[idx % colors.length];
              const percentage = Math.max((count / maxCount) * 100, 10);
              return (
                <div key={name} className="sc-stat-item">
                  <span className="sc-stat-name">{name}</span>
                  <div className="sc-stat-bar-bg">
                    <div
                      className={`sc-stat-bar-fill ${color}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="sc-stat-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
