import React from "react";
import "./CoverMatrix.css";

const MEMBERS = ["💙", "💜", "💗", "❤️", "🖤"];
const MEMBER_MAP = {
  "💙": "yejun",
  "💜": "noah",
  "💗": "bamby",
  "❤️": "eunho",
  "🖤": "hamin",
};

export default function CoverMatrix({ purchases, teamContext }) {
  if (!purchases || purchases.length === 0) return null;

  // 1. 기초 데이터 준비
  const stores = [...new Set(purchases.map((p) => p.store_name || "미지정"))].sort();

  // 팀 정보가 없을 경우를 대비한 기본값 (팀 미참여 유저 등)
  const isTeamMode = !!teamContext;
  const nicknames = isTeamMode
    ? [...new Set(teamContext.members.map(m => m.profiles?.nickname))].filter(Boolean)
    : ["-"];

  // 2. 집계 로직
  // matrixData[store][cover_label] = Set of nicknames (initials) who got this cover
  const matrixData = {};
  // summaryData[nickname][cover_label] = total quantity
  const summaryData = {};

  purchases.forEach((p) => {
    const store = p.store_name || "미지정";
    const cover = p.cover_label;
    if (!cover) return;

    // 누가 이 버전을 담당하는가? (커버 수령 현황용)
    const responsibleNickname = isTeamMode
      ? teamContext.memberToNickname[p.member_name]
      : null;

    if (responsibleNickname) {
      if (!matrixData[store]) matrixData[store] = {};
      if (!matrixData[store][cover]) matrixData[store][cover] = new Set();
      matrixData[store][cover].add(responsibleNickname);
    }

    // 누가 이 앨범을 샀는가? (팀원별 수량용)
    const buyerNickname = isTeamMode
      ? teamContext.mapping[p.user_id]?.nickname
      : "개인";

    if (buyerNickname) {
      if (!summaryData[buyerNickname]) summaryData[buyerNickname] = {};
      summaryData[buyerNickname][cover] = (summaryData[buyerNickname][cover] || 0) + (p.quantity || 1);
    }
  });

  return (
    <div className="matrix-container">
      <div className="matrix-section">
        <div className="matrix-header-row">
          <h4 className="matrix-title">커버 수령 현황</h4>
          {isTeamMode && <span className="matrix-subtitle">팀원별 담당 멤버 기반</span>}
        </div>
        <div className="matrix-scroll">
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="sticky-col">스토어</th>
                {MEMBERS.map((m) => (
                  <th key={m}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store}>
                  <td className="sticky-col store-name">{store}</td>
                  {MEMBERS.map((member) => {
                    const nicknameSet = matrixData[store]?.[member];
                    const nickList = nicknameSet ? Array.from(nicknameSet) : [];

                    return (
                      <td key={member} className="matrix-cell">
                        {nickList.length > 0 ? (
                          <div className="matrix-dots-container">
                            {nickList.map((nick) => (
                              <div key={nick} className="matrix-dot-wrap">
                                <span className={`matrix-dot dot-${MEMBER_MAP[member] || "none"}`}>
                                  {nick.charAt(0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="dot-empty" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="matrix-section">
        <h4 className="matrix-title">팀원별 앨범 수량</h4>
        <div className="matrix-scroll">
          <table className="cnt-table">
            <thead>
              <tr>
                <th>팀원</th>
                {MEMBERS.map((m) => (
                  <th key={m}>{m}</th>
                ))}
                <th>합계</th>
              </tr>
            </thead>
            <tbody>
              {nicknames.map((nick) => {
                let rowTotal = 0;
                return (
                  <tr key={nick}>
                    <td className="member-name">{nick}</td>
                    {MEMBERS.map((member) => {
                      const qty = summaryData[nick]?.[member] || 0;
                      rowTotal += qty;
                      return (
                        <td key={member} className={qty > 0 ? "cnt-hi" : ""}>
                          {qty || 0}
                        </td>
                      );
                    })}
                    <td className="row-total">{rowTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
