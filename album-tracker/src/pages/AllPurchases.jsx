import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PurchaseList from "../components/PurchaseList";
import CoverMatrix from "../components/CoverMatrix";
import { useAuth } from "../hooks/useAuth";
import "./AllPurchases.css";

const TABS = ["POCAALBUM", "INVENTORY", "ID PASS", "전체"];

export default function AllPurchases() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [matrixList, setMatrixList] = useState([]);
  const [activeTab, setActiveTab] = useState("POCAALBUM");
  const [teamContext, setTeamContext] = useState(null);

  const fetchData = async () => {
    if (!user?.id) return;

    // 1. 내가 속한 팀 ID 조회
    const { data: myMemberships } = await supabase
      .from("safe_team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .limit(1);

    let teamId = myMemberships?.[0]?.team_id;

    // 2. 데이터 병렬 및 순차 로드
    // A. 내 개인 구매 내역 (리스트 및 요약카드용)
    const personalQuery = supabase
      .from("purchases")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // B. 팀 전체 커버 내역 (매트릭스용 - 민감정보 제외 가능)
    let teamQuery = null;
    if (teamId) {
      teamQuery = supabase
        .from("purchases")
        .select("id, user_id, team_id, store_name, member_name, cover_label, quantity, album_name")
        .eq("team_id", teamId);
    }

    const [personalRes, teamRes] = await Promise.all([
      personalQuery,
      teamId ? teamQuery : Promise.resolve({ data: [] })
    ]);

    if (personalRes.error) console.error("Error fetching personal data:", personalRes.error);
    if (teamRes?.error) console.error("Error fetching team data:", teamRes.error);

    setList(personalRes.data || []);
    setMatrixList(teamRes?.data || []);

    // 3. 팀원 정보 조회 (닉네임 + 담당 멤버)
    if (teamId) {
      const { data: memberData } = await supabase
        .from("safe_team_members")
        .select("user_id, member_name")
        .eq("team_id", teamId);

      if (memberData && memberData.length > 0) {
        const userIds = [...new Set(memberData.map(m => m.user_id))];
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, nickname")
          .in("id", userIds);

        const nicknameMap = {};
        profileData?.forEach(p => {
          nicknameMap[p.id] = p.nickname;
        });

        const mapping = {};
        memberData.forEach(m => {
          mapping[m.user_id] = {
            nickname: nicknameMap[m.user_id] || "알수없음",
            assigned_member: m.member_name
          };
        });

        const memberToNickname = {};
        memberData.forEach(m => {
          memberToNickname[m.member_name] = nicknameMap[m.user_id] || "알수없음";
        });

        setTeamContext({
          members: memberData.map(m => ({
            ...m,
            profiles: { nickname: nicknameMap[m.user_id] }
          })),
          mapping,
          memberToNickname
        });
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, activeTab]);

  // A. 개인 구매 목록 필터링 (Tab 기준)
  const filteredList = useMemo(() => {
    if (activeTab === "전체") return list;
    return list.filter((item) => item.album_name === activeTab);
  }, [list, activeTab]);

  // B. 팀 전체 매트릭스용 필터링 (Tab 기준)
  const filteredMatrixList = useMemo(() => {
    if (activeTab === "전체") return [];
    return matrixList.filter((item) => item.album_name === activeTab);
  }, [matrixList, activeTab]);

  return (
    <div className="ap-wrapper">
      <header className="ap-header">
        <button onClick={() => navigate("/")} className="cp-back-btn">
          <svg
            className="cp-back-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="ap-title">전체 구매 목록</h1>
      </header>

      <div className="ap-tabs">
        <div className="ap-tab-row">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`ap-tab ${activeTab === tab ? "active" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="ap-content">
        {/* 매트릭스는 "전체" 탭이 아닐 때만 표시 */}
        {activeTab !== "전체" && (
          <CoverMatrix purchases={filteredMatrixList} teamContext={teamContext} />
        )}

        <div className="ap-list-title">나의 상세 내역 ({filteredList.length})</div>
        <PurchaseList list={filteredList} refresh={fetchData} />
      </main>
    </div>
  );
}
