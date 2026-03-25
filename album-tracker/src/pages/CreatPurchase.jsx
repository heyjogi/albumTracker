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
  const [albumMembers, setAlbumMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

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

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    const [{ data: ss }, { data: ts }] = await Promise.all([
      supabase.from("safe_stores").select("*"),
      supabase.from("safe_teams").select("*"),
    ]);
    setStores(ss || []);
    setTeams(ts || []);

    if (ts && ts.length > 0) {
      const firstTeam = ts[0];
      setForm((f) => ({
        ...f,
        team_id: firstTeam.public_team_id,
        team_name: firstTeam.name,
      }));

      const { data: members } = await supabase
        .from("safe_team_members")
        .select("team_name, member_name")
        .eq("public_team_id", firstTeam.public_team_id);

      const loaded = sortMembers(members || []);
      setTeamMembers(loaded);
      const totalQty = loaded.reduce((sum, m) => sum + (m.quantity || 1), 0);
      setForm((f) => ({ ...f, quantity: totalQty || 1 }));
    }
  };

  const filteredDisplayMembers = useMemo(() => {
    if (!form.team_id || teamMembers.length === 0) {
      return albumMembers; // 개인 구매거나 팀 로딩 전이면 전체 표시
    }

    const teamMemberNames = teamMembers.map((m) => m.member_name);
    // 앨범 멤버 중 우리 분철팀 이름 목록에 포함된 멤버만 필터링
    return albumMembers.filter((am) =>
      teamMemberNames.includes(am.member_name),
    );
  }, [form.team_id, teamMembers, albumMembers]);

  const handleStoreChange = async (e) => {
    const storeId = e.target.value;
    // fetchOptions에서 이미 불러온 stores 목록에서 선택된 스토어를 찾습니다.
    const store = stores.find((s) => s.public_store_id === storeId);

    // 1. 폼 데이터 초기화 및 배송비/할인액 설정
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

    // 2. 관련 상태 초기화
    setAlbums([]);
    setAlbumMembers([]);
    setSelectedMemberIds([]);

    // 3. 앨범 목록 로드 (store.internal_store_id 사용)
    if (storeId && store?.internal_store_id) {
      const { data: albumsData } = await supabase
        .from("safe_store_albums")
        .select(
          "public_album_id, internal_album_id, store_id, album_name, event_name, price, event_end_at",
        )
        .eq("store_id", store.internal_store_id);

      setAlbums(albumsData || []);

      // 앨범이 딱 1개라면 자동으로 선택해주는 편의 기능 (기존 로직 유지)
      if (albumsData && albumsData.length === 1) {
        const album = albumsData[0];

        setForm((f) => ({
          ...f,
          album_id: album.public_album_id,
          album_name: album.album_name,
          event_name: album.event_name || "",
          price: Number(album.price) || 0,
        }));

        // 해당 앨범의 멤버 로드
        const { data: members } = await supabase
          .from("album_members")
          .select("id, member_name, event_image_url")
          .eq("album_id", album.internal_album_id);

        const loaded = sortMembers(members || []);
        setAlbumMembers(loaded);

        // 3. 분철팀(team_id) 유무에 따른 필터링 적용
        const currentTeamId = form.team_id;
        if (currentTeamId) {
          const { data: teamData } = await supabase
            .from("safe_team_members")
            .select("team_name, member_name")
            .eq("public_team_id", currentTeamId);

          const sortedTeam = sortMembers(teamData || []);

          const teamMemberNames = sortedTeam.map((m) => m.member_name);

          const selectedIds = loaded
            .filter((m) => teamMemberNames.includes(m.member_name))
            .map((m) => m.id);

          setSelectedMemberIds(selectedIds);
          setForm((f) => ({ ...f, quantity: selectedIds.length || 1 }));
        } else {
          // 개인 구매일 경우 전체 선택
          const allIds = loaded.map((m) => m.id);
          setSelectedMemberIds(allIds);
          setForm((f) => ({ ...f, quantity: allIds.length || 1 }));
        }
      }
    }
  };

  const handleAlbumChange = async (e) => {
    const albumId = e.target.value;

    // 1. 먼저 상태 초기화
    setAlbumMembers([]);
    setSelectedMemberIds([]);

    // 2. 앨범을 선택하지 않은 경우
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

    // 3. 선택한 앨범 찾기
    const album = albums.find((a) => a.public_album_id === albumId);
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

    // 4. 앨범 정보로 form 업데이트
    setForm((f) => ({
      ...f,
      album_id: albumId,
      album_name: album.album_name,
      event_name: album.event_name || "",
      price: album.price,
    }));

    // 5. 앨범 멤버 로드
    const { data: members } = await supabase
      .from("album_members")
      .select("id, member_name, event_image_url")
      .eq("album_id", album.internal_album_id);

    const loaded = sortMembers(members || []);
    setAlbumMembers(loaded);

    // 6. 팀 선택 여부에 따라 멤버 선택 처리
    const currentTeamId = form.team_id;
    if (currentTeamId) {
      // 팀 구매: 팀 멤버와 매칭되는 앨범 멤버만 선택
      const teamMemberNames = teamMembers.map((m) => m.member_name);
      const selectedIds = loaded
        .filter((m) => teamMemberNames.includes(m.member_name))
        .map((m) => m.id);

      setSelectedMemberIds(selectedIds);
      setForm((f) => ({ ...f, quantity: selectedIds.length || 1 }));
    } else {
      // 개인 구매: 전체 선택
      const allIds = loaded.map((m) => m.id);
      setSelectedMemberIds(allIds);
      setForm((f) => ({ ...f, quantity: allIds.length || 1 }));
    }
  };

  const handleTeamChange = async (e) => {
    const teamId = e.target.value;
    const team = teams.find((t) => t.public_team_id === teamId);
    setForm((f) => ({
      ...f,
      team_id: teamId,
      team_name: team?.name || "개인",
    }));
    setTeamMembers([]);

    if (teamId && team) {
      // 내가 담당하는 멤버 (기존 로직)
      const { data } = await supabase
        .from("safe_team_members")
        .select("id, team_name, member_name")
        .eq("public_team_id", teamId);

      const loaded = sortMembers(data || []);
      setTeamMembers(loaded);

      if (albumMembers.length > 0) {
        const teamMemberNames = loaded.map((m) => m.member_name);

        const selectedIds = albumMembers
          .filter((m) => teamMemberNames.includes(m.member_name))
          .map((m) => m.id);

        setSelectedMemberIds(selectedIds);
        setForm((f) => ({ ...f, quantity: selectedIds.length || 1 }));
      } else {
        const totalQty = loaded.reduce((sum, m) => sum + (m.quantity || 1), 0);
        setForm((f) => ({ ...f, quantity: totalQty || 1 }));
      }
    } else {
      if (albumMembers.length > 0) {
        const allIds = albumMembers.map((m) => m.id);
        setSelectedMemberIds(allIds);
        setForm((f) => ({ ...f, quantity: allIds.length }));
      } else {
        setForm((f) => ({ ...f, quantity: 1 }));
      }
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
    if (!user?.id) return alert("로그인이 필요합니다.");
    setLoading(true);

    try {
      // 2. 필터링 로직 재점검
      // albumMembers의 각 요소가 가진 id와 selectedMemberIds를 비교합니다.
      const filteredMembers = albumMembers.filter((m) =>
        selectedMemberIds.includes(m.id),
      );

      const nCount = filteredMembers.length;

      if (nCount === 0) throw new Error("등록할 멤버를 선택해주세요.");

      // 3. 배송비 및 할인액 계산
      const DIVISION_FACTOR = 4;
      const rawShipping = parseFloat(form.shipping_fee) || 0;
      const rawDiscount = parseFloat(form.discount) || 0;

      let finalShip = 0;
      let finalDisc = 0;

      if (form.team_id && form.team_id !== "") {
        // 분철팀일 때: (전체 / 4) / 아이템수
        finalShip = Math.floor(rawShipping / DIVISION_FACTOR / nCount);
        finalDisc = Math.floor(rawDiscount / DIVISION_FACTOR / nCount);
      } else {
        // 개인일 때: 전체 / 아이템수
        finalShip = Math.floor(rawShipping / nCount);
        finalDisc = Math.floor(rawDiscount / nCount);
      }

      // 4. 전송 데이터 생성
      const selectedStore = stores.find(
        (s) => s.public_store_id === form.store_id,
      );
      const storeInternalId = selectedStore?.internal_store_id;

      const rows = filteredMembers.map((member) => ({
        user_id: user.id,
        team_id:
          teams.find((t) => t.public_team_id === form.team_id)
            ?.internal_team_id || null,
        store_id: storeInternalId,
        album_id: member.album_id,
        store_name: form.store_name,
        album_name: form.album_name,
        event_name: form.event_name,
        price: parseFloat(form.price) || 0,
        quantity: 1, // 각 아이템은 항상 수량 1
        member_name: member.member_name,
        event_image_url: member.event_image_url || null,
        shipping_fee: finalShip, // 계산된 값 할당
        shipping_discount: finalDisc, // 계산된 값 할당
        is_settled: false,
        received: false,
      }));

      const { error } = await supabase.from("purchases").insert(rows);
      if (error) throw error;

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
  const inputClass = "cp-input-full";

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
                <option key={s.public_store_id} value={s.public_store_id}>
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
                    <option key={a.public_album_id} value={a.public_album_id}>
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
                <option key={t.public_team_id} value={t.public_team_id}>
                  {t.name}
                </option>
              ))}
            </select>
            <span className="cp-select-icon">▾</span>
          </div>
        </div>

        {/* 앨범 멤버 */}
        {filteredDisplayMembers.length > 0 && (
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
              {/* [중요] albumMembers 대신 filteredDisplayMembers를 사용합니다. */}
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
                          src={m.event_image_url}
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
                readOnly // 멤버 선택 시 자동 계산되므로 수동 수정 방지
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
              const currentTeam = teams.find(
                (t) => t.public_team_id === form.team_id,
              );
              const totalMembers = currentTeam?.total_members || 1;

              return (
                <div className="bg-brand-50 p-3 rounded-xl border border-brand-100">
                  <p className="text-[12px] text-brand-700 font-medium">
                    ✨ 인당 예상 금액 (총 4명)
                  </p>
                  <div className="flex justify-between text-[11px] text-brand-600 mt-1">
                    <span>
                      배송비: +
                      {Math.floor(
                        (form.shipping_fee || 0) / 4,
                      ).toLocaleString()}
                      원
                    </span>
                    <span>
                      할인: -
                      {Math.floor((form.discount || 0) / 4).toLocaleString()}원
                    </span>
                    <span className="font-bold">
                      합계:{" "}
                      {(
                        Number(form.price) +
                        Math.floor((form.shipping_fee || 0) / 4) -
                        Math.floor((form.discount || 0) / 4)
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
