import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import "./CreatPurchase.css";

const MEMBER_ORDER = {
  예준: 1,
  노아: 2,
  밤비: 3,
  은호: 4,
  하민: 5,
};

const sortMembers = (members) => {
  return [...members].sort((a, b) => {
    const orderA = MEMBER_ORDER[a.member_name] || 99;
    const orderB = MEMBER_ORDER[b.member_name] || 99;
    return orderA - orderB;
  });
};

export default function CreatePurchase() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [stores, setStores] = useState([]);
  const [teams, setTeams] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  // const [allTeamMembers, setAllTeamMembers] = useState([]);
  const [albumMembers, setAlbumMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [isBulkRegister, setIsBulkRegister] = useState(false);
  const [isCurrentUserLeader, setIsCurrentUserLeader] = useState(false);
  const [teamDivisor, setTeamDivisor] = useState(1);
  const [teamTotalMembers, setTeamTotalMembers] = useState(0);

  const [form, setForm] = useState({
    store_id: "",
    store_name: "",
    team_id: "",
    team_name: "개인",
    album_id: "",
    album_name: "",
    event_name: "",
    price: 0,
    quantity: 1,
    discount: 0,
    shipping_fee: 0,
  });


  const filteredDisplayMembers = useMemo(() => {
    // 개인 구매면 전체 표시
    if (!form.team_id) {
      return albumMembers;
    }

    // 팀 선택했지만, 팀 로딩중이거나 담당 멤버가 없을 경우
    if (teamMembers.length === 0) {
      return [];
    }

    const teamMemberNames = teamMembers.map((m) => m.member_name);

    // 앨범 멤버 중 우리 분철팀 이름 목록에 포함된 멤버만 필터링
    return albumMembers.filter((am) =>
      teamMemberNames.includes(am.member_name),
    );
  }, [form.team_id, teamMembers, albumMembers]);

  useEffect(() => {
    fetchOptions();
  }, []);

  // 상점의 배송비 무료 기준에 따른 배송비 자동 계산
  useEffect(() => {
    if (!form.store_id || stores.length === 0) return;
    const store = stores.find((s) => s.id === form.store_id);
    if (!store) return;

    const threshold = Number(store.free_shipping_threshold || 0);
    const defaultShipping = Number(store.shipping_fee || 0);

    // 무료배송 기준 계산용 수량
    let effectiveQuantity = 1;

    if (form.team_id) {
      // 팀 구매: 팀 전체 멤버 수와 앨범 멤버 매칭
      if (teamTotalMembers > 0 && albumMembers.length > 0) {
        // 앨범에 있는 멤버 중 팀 멤버와 매칭되는 수
        // 일단 teamTotalMembers 사용
        effectiveQuantity = Math.min(teamTotalMembers, albumMembers.length);
      } else {
        effectiveQuantity = teamTotalMembers || teamDivisor;
      }
    } else {
      effectiveQuantity = selectedMemberIds.length || 1;
    }

    const totalPrice = Number(form.price || 0) * effectiveQuantity;

    // 무료배송 기준 금액을 넘으면 배송비 0, 아니면 기본 배송비
    let newShippingFee = defaultShipping;
    if (threshold > 0 && totalPrice >= threshold) {
      newShippingFee = 0;
    }

    setForm((prev) => {
      if (prev.shipping_fee === newShippingFee) return prev;
      return { ...prev, shipping_fee: newShippingFee };
    });
  }, [form.store_id, form.price, form.team_id, stores, teamTotalMembers, albumMembers, teamDivisor, selectedMemberIds]);

  const fetchOptions = async () => {
    // 1. 내가 속한 team_id 목록 먼저 조회
    const { data: myMemberships } = await supabase
      .from("safe_team_members")
      .select("team_id");

    const myTeamIds = [...new Set((myMemberships || []).map((m) => m.team_id))];

    const [{ data: ss }, { data: ts }, { data: allAlbums }] = await Promise.all([
      supabase.from("safe_stores").select("*"),
      myTeamIds.length > 0
        ? supabase.from("safe_teams").select("*").in("id", myTeamIds).order("name", { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase.from("safe_store_albums").select("store_id, event_end_at"),
    ]);

    const nowTime = new Date().getTime();
    const storeHasActiveAlbum = new Set();
    const storeHasAnyAlbum = new Set();

    (allAlbums || []).forEach(album => {
      storeHasAnyAlbum.add(album.store_id);

      if (!album.event_end_at) {
        storeHasActiveAlbum.add(album.store_id);
      } else {
        const expireTime = new Date(album.event_end_at).getTime();
        if (expireTime > nowTime) {
          storeHasActiveAlbum.add(album.store_id);
        }
      }
    });

    const activeStores = (ss || []).filter(store => {
      // 앨범이 하나라도 있는데 모두 만료된 경우만 숨김
      if (storeHasAnyAlbum.has(store.id) && !storeHasActiveAlbum.has(store.id)) {
        return false;
      }
      return true;
    });

    setStores(activeStores || []);
    setTeams(ts || []);

    if (ts && ts.length > 0) {
      const firstTeam = ts[0];
      const firstTeamId = firstTeam.id;

      setForm((f) => ({
        ...f,
        team_id: firstTeamId,
        team_name: firstTeam.name,
      }));

      // 팀 멤버 가져오기 (user_id 포함)
      const { data: members } = await supabase
        .from("safe_team_members")
        .select("member_id, member_name, user_id")
        .eq("team_id", firstTeamId);

      const loaded = sortMembers(members || []);
      setTeamMembers(loaded);

      // 팀 구매 정보(리더 여부 등) 가져오기
      const { data: teamInfo } = await supabase.rpc("get_team_purchase_info", {
        p_team_id: firstTeamId,
      });
      setIsCurrentUserLeader(!!teamInfo?.is_leader);
      setTeamDivisor(teamInfo?.divisor || 1);
      setTeamTotalMembers(teamInfo?.total_members || 0);

      // 내가 담당한 멤버 수로 수량 초기화
      const myAssigned = loaded.filter((m) => m.user_id === user?.id);
      setForm((f) => ({ ...f, quantity: myAssigned.length || 1 }));
    }
  };

  const handleStoreChange = async (e) => {
    const storeId = e.target.value; // 여기서 storeId가 정의됩니다.
    const store = stores.find((s) => s.id === storeId);

    // 1. 폼 데이터 및 상태 초기화
    setForm((f) => ({
      ...f,
      store_id: storeId,
      store_name: store?.name || "",
      album_id: "",
      album_name: "",
      event_name: "",
      price: 0,
      quantity: 1,
      discount: 0,
      shipping_fee: Number(store?.shipping_fee) || 0,
    }));

    setAlbums([]);
    setAlbumMembers([]);
    setSelectedMemberIds([]);

    // 2. 해당 상점의 앨범 목록 로드 (마감기한 필터링 적용)
    if (storeId) {
      const { data: albumsData } = await supabase
        .from("safe_store_albums")
        .select("id, store_id, album_name, event_name, price, event_end_at")
        .eq("store_id", storeId);

      // --- 수정한 필터링 로직 ---
      const nowTime = new Date().getTime(); // 현재 시간을 밀리초 숫자로 변환

      const activeAlbums = (albumsData || []).filter((album) => {
        // 1. 마감 기한이 없으면(null) 표시
        if (!album.event_end_at) return true;

        // 2. DB 날짜 문자열을 Date 객체로 바꾼 뒤 밀리초 숫자로 변환
        const expireTime = new Date(album.event_end_at).getTime();

        // 3. 숫자로 크기 비교 (현재보다 미래일 때만 true)
        return expireTime > nowTime;
      });

      setAlbums(activeAlbums);

      // 3. 필터링된 앨범이 딱 1개라면 자동 선택
      if (activeAlbums.length === 1) {
        const album = activeAlbums[0];

        setForm((f) => ({
          ...f,
          album_id: album.id,
          album_name: album.album_name,
          event_name: album.event_name || "",
          event_end_at: album.event_end_at || null,
          price: Number(album.price) || 0,
        }));

        // 해당 앨범의 멤버 로드 로직 (기존 코드와 동일)
        const { data: members } = await supabase
          .from("album_members")
          .select("id, member_id, member_name, event_image_url")
          .eq("album_id", album.id);

        const loaded = sortMembers(members || []);
        setAlbumMembers(loaded);

        // 3. 분철팀(team_id) 유무에 따른 필터링 적용
        const currentTeamId = form.team_id;
        if (currentTeamId && user) {
          // 현재 teamMembers 상태에 user_id가 포함되어 있으므로 그대로 사용
          const myAssigned = teamMembers.filter((m) => m.user_id === user.id);
          const myMemberNames = myAssigned.map((m) => m.member_name);

          const selectedIds = loaded
            .filter((m) => myMemberNames.includes(m.member_name))
            .map((m) => m.id);

          setSelectedMemberIds(selectedIds);
          setForm((f) => ({ ...f, quantity: selectedIds.length || 1 }));
        } else {
          // 개인 구매일 경우
          setSelectedMemberIds([]);
          setForm((f) => ({ ...f, quantity: 0 }));
        }
      }
    }
  };

  const handleAlbumChange = async (e) => {
    const albumId = e.target.value;

    setAlbumMembers([]);
    setSelectedMemberIds([]);

    if (!albumId) {
      setForm((f) => ({
        ...f,
        album_id: "",
        album_name: "",
        event_name: "",
        price: 0,
        quantity: form.team_id
          ? teamMembers.reduce((sum, m) => sum + (m.quantity || 1), 0)
          : 1,
      }));
      return;
    }

    const album = albums.find((a) => a.id === albumId);
    if (!album) {
      setForm((f) => ({
        ...f,
        album_id: "",
        album_name: "",
        event_name: "",
        price: 0,
      }));
      return;
    }

    setForm((f) => ({
      ...f,
      album_id: albumId,
      album_name: album.album_name,
      event_name: album.event_name || "",
      event_end_at: album.event_end_at || null,
      price: album.price,
    }));

    const { data: members } = await supabase
      .from("album_members")
      .select("id, member_id, member_name, event_image_url")
      .eq("album_id", album.id);

    const loaded = sortMembers(members || []);
    setAlbumMembers(loaded);

    if (form.team_id && user) {
      // 내가 담당한 팀 멤버 (teamMembers에 user_id 포함되어 있음)
      const myAssignedMembers = teamMembers.filter((m) => m.user_id === user.id);
      const myMemberNames = myAssignedMembers.map((m) => m.member_name);

      // 앨범 멤버 중 내 담당 멤버 이름과 일치하는 ID만 추출
      const selectedIds = loaded
        .filter((m) => myMemberNames.includes(m.member_name))
        .map((m) => m.id);

      setSelectedMemberIds(selectedIds);
      setForm((f) => ({ ...f, quantity: selectedIds.length || 1 }));
    } else {
      // 개인 구매: 선택 안함 (유저가 직접 지정)
      setSelectedMemberIds([]);
      setForm((f) => ({ ...f, quantity: 0 }));
    }
  };

  const handleTeamChange = async (e) => {
    const teamId = e.target.value;
    const team = teams.find((t) => t.id === teamId);
    setForm((f) => ({
      ...f,
      team_id: teamId,
      team_name: team?.name || "개인",
    }));
    setTeamMembers([]);
    setIsBulkRegister(false);
    setIsCurrentUserLeader(false);
    setTeamDivisor(1);
    setTeamTotalMembers(0);

    if (teamId && team) {
      const { data: memberData, error } = await supabase
        .from("safe_team_members")
        .select("member_id, member_name, user_id")
        .eq("team_id", teamId);

      if (error) console.error("safe_team_members fetch error:", error);

      const loaded = sortMembers(memberData || []);
      setTeamMembers(loaded);

      const { data: teamInfo } = await supabase.rpc("get_team_purchase_info", {
        p_team_id: team.id,
      });
      setIsCurrentUserLeader(!!teamInfo?.is_leader);
      setTeamDivisor(teamInfo?.divisor || 1);
      setTeamTotalMembers(teamInfo?.total_members || 0);

      // 앨범이 선택된 상태라면 → 내 담당 멤버 기준으로 selectedMemberIds 재계산
      if (albumMembers.length > 0 && user) {
        const myAssigned = loaded.filter((m) => m.user_id === user.id);
        const myMemberNames = myAssigned.map((m) => m.member_name);

        const selectedIds = albumMembers
          .filter((m) => myMemberNames.includes(m.member_name))
          .map((m) => m.id);

        setSelectedMemberIds(selectedIds);
        setForm((f) => ({ ...f, quantity: selectedIds.length || 1 }));
      } else {
        // 앨범 미선택 시 내 담당 멤버 수로 수량 초기화
        const myAssigned = loaded.filter((m) => m.user_id === user?.id);
        setForm((f) => ({ ...f, quantity: myAssigned.length || 1 }));
      }
    } else {
      setSelectedMemberIds([]);
      setForm((f) => ({ ...f, quantity: 0 }));
    }
  };

  const toggleAlbumMember = (memberId) => {
    if (form.team_id) return;
    setSelectedMemberIds((prev) => {
      const next = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
      setForm((f) => ({ ...f, quantity: next.length || 1 }));
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (form.team_id) return;
    if (selectedMemberIds.length === albumMembers.length) {
      setSelectedMemberIds([]);
      setForm((f) => ({ ...f, quantity: 0 }));
    } else {
      const allIds = albumMembers.map((m) => m.id);
      setSelectedMemberIds(allIds);
      setForm((f) => ({ ...f, quantity: allIds.length }));
    }
  };

  const submit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!user?.id) return alert("로그인이 필요합니다.");
    setLoading(true);

    try {
      const rawShipping = parseFloat(form.shipping_fee) || 0;
      const rawDiscount = parseFloat(form.discount) || 0;

      const selectedStore = stores.find((s) => s.id === form.store_id);
      const storeId = selectedStore?.id || null;
      const teamId = teams.find((t) => t.id === form.team_id)?.id || null;
      const albumId = albums.find((a) => a.id === form.album_id)?.id || null;

      let rows = [];

      if (form.team_id && isBulkRegister) {
        // 일괄 등록 (팀원 전체) - DB RPC 수행
        const { error: bulkError } = await supabase.rpc(
          "register_bulk_purchase",
          {
            p_team_id: teamId,
            p_store_id: storeId,
            p_album_id: albumId,
            p_price: parseFloat(form.price) || 0,
            p_quantity: 1,
            p_store_name: form.store_name || "",
            p_album_name: form.album_name || "",
            p_event_name: form.event_name || "",
            p_event_end_at: form.event_end_at || null,
            p_shipping_fee: rawShipping,
            p_discount: rawDiscount,
          }
        );

        if (bulkError) throw bulkError;
      } else {
        const filteredMembers = albumMembers.filter((m) =>
          selectedMemberIds.includes(m.id)
        );

        const nCount = filteredMembers.length;
        if (nCount === 0) throw new Error("등록할 멤버를 선택해주세요.");

        const finalShip = Math.round(rawShipping / teamDivisor / nCount);
        const finalDisc = Math.round(rawDiscount / teamDivisor / nCount);

        rows = filteredMembers.map((member) => ({
          user_id: user.id,
          team_id: teamId,
          store_id: storeId,
          album_id: albumId,
          store_name: form.store_name,
          album_name: form.album_name,
          event_name: form.event_name,
          event_end_at: form.event_end_at || null,
          price: parseFloat(form.price) || 0,
          quantity: 1,// 각 아이템은 항상 수량 1
          member_id: member.member_id,
          member_name: member.member_name,
          event_image_url: member.event_image_url || null,
          shipping_fee: finalShip,
          shipping_discount: finalDisc,
          is_settled: false,
          received: false,
        }));
      }

      if (rows.length > 0) {
        const { error } = await supabase.from("purchases").insert(rows);
        if (error) throw error;
      }

      navigate("/");
    } catch (error) {
      console.error("에러 발생:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isPersonal = !form.team_id;
  const allSelected =
    albumMembers.length > 0 && selectedMemberIds.length === albumMembers.length;

  const selectClass = "cp-select";
  // const inputClass = "cp-input-full";



  return (
    <div className="cp-wrapper">
      <header className="cp-header">
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
        <h1 className="cp-title">새 구매내역 등록</h1>
      </header>

      <div className="cp-card">
        {/* 구매처 */}
        <div>
          <label className="cp-label">구매처</label>
          <div className="cp-select-wrap">
            <select
              className={selectClass}
              value={form.store_id}
              onChange={handleStoreChange}
            >
              <option value="">구매처를 선택하세요</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="cp-select-icon">▾</span>
          </div>
        </div>

        {/* 앨범 */}
        {form.store_id && (
          <div>
            <label className="cp-label">앨범</label>
            {albums.length === 0 ? (
              <p className="cp-empty-msg">
                등록된 앨범이 없습니다. 직접 입력해주세요.
              </p>
            ) : (
              <div className="cp-select-wrap">
                <select
                  className={selectClass}
                  value={form.album_id || ""}
                  onChange={handleAlbumChange}
                >
                  <option value="">앨범을 선택하세요</option>
                  {albums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.album_name}
                      {a.event_name ? ` (${a.event_name})` : ""}
                    </option>
                  ))}
                </select>
                <span className="cp-select-icon">▾</span>
              </div>
            )}
          </div>
        )}

        {/* 분철팀 */}
        <div>
          <label className="cp-label">분철팀</label>
          <div className="cp-select-wrap">
            <select
              className={selectClass}
              value={form.team_id}
              onChange={handleTeamChange}
            >
              <option value="">개인</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <span className="cp-select-icon">▾</span>
          </div>
        </div>

        {/* 일괄 등록 체크박스 (리더전용) */}
        {isCurrentUserLeader && (
          <div className="bulk-register">
            <label className="bulk-register-label">
              <input
                type="checkbox"
                className="bulk-register-checkbox"
                checked={isBulkRegister}
                onChange={(e) => setIsBulkRegister(e.target.checked)}
              />
              <span className="bulk-register-text">
                분철팀 일괄 구매 등록
              </span>
            </label>

            {isBulkRegister && (
              <p className="bulk-register-desc">
              </p>
            )}
          </div>
        )}

        {/* 앨범 멤버 */}
        {filteredDisplayMembers.length > 0 && !isBulkRegister && (
          <div>
            <div className="cp-member-header">
              <label className="cp-label" style={{ marginBottom: 0 }}>
                {isPersonal ? "멤버 선택" : "나의 멤버"}
              </label>
              {isPersonal && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className={`cp-select-all-btn ${allSelected ? "cp-select-all-on" : "cp-select-all-off"}`}
                >
                  {allSelected ? "전체 해제" : "전체 선택"}
                </button>
              )}
            </div>
            <div className="cp-member-scroll">
              {filteredDisplayMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                const isDisabled = !isPersonal;

                let cardClassName = "cp-member-card";
                cardClassName += isSelected
                  ? " cp-member-card-on"
                  : " cp-member-card-off";
                if (isDisabled) cardClassName += " cp-member-card-disabled";

                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => toggleAlbumMember(m.id)}
                    className={cardClassName}
                  >
                    <div className="cp-member-img">
                      {isSelected && (
                        <div className="cp-member-check-overlay">
                          <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            className="cp-member-check-icon"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                      {m.event_image_url ? (
                        <img
                          src={`/image/pob/${m.event_image_url?.split('/').pop()}`}
                          alt={m.member_name}
                          className="cp-member-img-photo"
                        />
                      ) : (
                        <span className="cp-member-img-placeholder">
                          {m.member_name?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="cp-member-name">{m.member_name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 앨범명 / 이벤트명 */}
        <div>
          <label className="cp-label">앨범명 / 이벤트명</label>
          <div className="cp-input-group">
            <input
              type="text"
              placeholder="앨범명"
              className="cp-input-half"
              value={form.album_name}
              onChange={(e) => setForm({ ...form, album_name: e.target.value })}
            />
            <input
              type="text"
              placeholder="이벤트명"
              className="cp-input-half"
              value={form.event_name}
              onChange={(e) => setForm({ ...form, event_name: e.target.value })}
            />
          </div>
        </div>

        {/* 가격 / 수량 / 할인 / 배송비 섹션 */}
        <div className="space-y-4">
          <div className="cp-row">
            <div className="cp-col-flex">
              <label className="cp-label">가격 (원)</label>
              <input
                type="number"
                className="cp-input-full"
                value={form.price || ""}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="cp-col-1-3">
              <label className="cp-label">수량</label>
              <input
                type="number"
                className="cp-input-full bg-slate-50"
                value={form.quantity}
                readOnly
              />
            </div>
          </div>

          <div className="cp-row">
            <div className="cp-col-flex">
              <label className="cp-label text-rose-600">총 할인액 (-)</label>
              <input
                type="number"
                placeholder="0"
                className="cp-input-full border-rose-200 focus:ring-rose-100"
                value={form.discount || 0}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
              />
            </div>
            <div className="cp-col-flex">
              <label className="cp-label">총 배송비</label>
              <input
                type="number"
                className="cp-input-full"
                value={form.shipping_fee}
                onChange={(e) =>
                  setForm({ ...form, shipping_fee: e.target.value })
                }
              />
            </div>
          </div>

          {/* 계산 미리보기 안내 */}
          {!isPersonal &&
            form.team_id &&
            (() => {
              const divFactor = teamDivisor > 0 ? teamDivisor : 1;

              return (
                <div className="bg-brand-50 p-3 rounded-xl border border-brand-100">
                  <p className="text-[12px] text-brand-700 font-medium">
                    ✨ 인당 예상 금액 (총 {divFactor}명)
                  </p>
                  <div className="flex justify-between text-[11px] text-brand-600 mt-1">
                    <span>
                      배송비: +
                      {Math.round(
                        (form.shipping_fee || 0) / divFactor,
                      ).toLocaleString()}
                      원
                    </span>
                    <span>
                      할인: -
                      {Math.round((form.discount || 0) / divFactor).toLocaleString()}원
                    </span>
                    <span className="font-bold">
                      합계:{" "}
                      {(
                        Number(form.price) +
                        Math.round((form.shipping_fee || 0) / divFactor) -
                        Math.round((form.discount || 0) / divFactor)
                      ).toLocaleString()}
                      원
                    </span>
                  </div>
                </div>
              );
            })()}
        </div>

        <div className="cp-submit-wrap">
          <button
            onClick={submit}
            disabled={loading || !form.store_name}
            className="cp-submit-btn"
          >
            {loading ? "등록 중..." : "등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
