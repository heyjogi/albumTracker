import { useState, useRef, useEffect } from "react";
import StatusBadge from "./StatusBadge";
import { supabase } from "../lib/supabase";
import "./PurchaseItem.css";

function getDday(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return { label: "D-DAY", color: "text-rose-600 bg-rose-50" };
  if (diff < 0)
    return {
      label: `D+${Math.abs(diff)}`,
      color: "text-slate-400 bg-slate-100",
    };
  if (diff <= 3)
    return { label: `D-${diff}`, color: "text-orange-600 bg-orange-50" };
  return { label: `D-${diff}`, color: "text-brand-600 bg-brand-50" };
}

function formatEndDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const yr = d.getFullYear().toString().slice(2);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hr = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yr}.${mo}.${da} ${hr}:${mi}`;
}

export default function PurchaseItem({ item, refresh }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [popPosition, setPopPosition] = useState("bottom");
  const menuBtnRef = useRef(null);

  const SHIPPING_DIVISION_FACTOR = 4;

  useEffect(() => {
    if (isMenuOpen && menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPopPosition(spaceBelow < 280 ? "top" : "bottom");
    }
  }, [isMenuOpen]);

  const albumName = item.album_name || "앨범 이름 없음";
  const storeName = item.store_name || "구매처 없음";
  const eventName = item.event_name ? `(${item.event_name})` : "";
  const dday = getDday(item.event_end_at);

  const toggleSettled = async () => {
    const idToUpdate = item.internal_purchase_id;
    if (!idToUpdate) return;
    setLoading(true);
    try {
      await supabase
        .from("purchases")
        .update({ is_settled: !item.is_settled })
        .eq("id", idToUpdate);
      refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleReceived = async () => {
    const idToUpdate = item.internal_purchase_id;
    if (!idToUpdate) return;
    setLoading(true);
    try {
      await supabase
        .from("purchases")
        .update({ received: !item.received })
        .eq("id", idToUpdate);
      refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const idToUpdate = item.internal_purchase_id;
    if (!idToUpdate) return;
    setLoading(true);
    try {
      await supabase.from("purchases").delete().eq("id", idToUpdate);
      refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isPersonal = !item.public_team_id;

  const cardClass = `pi-card ${isPersonal ? "is-personal" : "is-team"}`;

  const displayShippingFee =
    item.shipping_fee > 0
      ? item.public_team_id
        ? item.shipping_fee / SHIPPING_DIVISION_FACTOR
        : item.shipping_fee
      : 0;

  return (
    <div className={`pi-card ${isPersonal ? "is-personal" : "is-team"}`}>
      <div className="pi-left-wrap">
        <div className="pi-member-group">
          {/* 1. 이미지 영역 */}
          <div className="pi-img-pl">
            {item.event_image_url ? (
              <img
                src={item.event_image_url}
                alt={albumName}
                className="pi-img-photo"
              />
            ) : (
              <span className="pi-img-placeholder">
                {item.member_name ? item.member_name.charAt(0) : "?"}
              </span>
            )}
          </div>
          {/* 2. 멤버 이름 */}
          <span className="pi-member-name">{item.member_name}</span>
        </div>

        <div className="pi-details">
          <div className="flex items-center gap-1.5 mb-1">
            {!isPersonal && (
              <span className="text-[10px] bg-brand-500 text-white px-1.5 py-0.5 rounded-md font-bold shrink-0">
                분철
              </span>
            )}
            <h3 className="pi-title">
              {albumName} {eventName}
            </h3>
          </div>

          <div className="pi-tags">
            <span className="pi-store">{storeName}</span>
          </div>

          <div className="pi-meta">
            <span className="pi-qty">수량: {item.quantity}</span>
            {displayShippingFee > 0 && (
              <>
                <span className="pi-dot">·</span>
                <span className="pi-shipping">
                  배송비 {displayShippingFee.toLocaleString()}원
                </span>
              </>
            )}
          </div>

          {item.event_end_at && (
            <div className="text-[11px] text-slate-400 mt-0.5 tracking-tight">
              응모마감 | {formatEndDate(item.event_end_at)}
            </div>
          )}
          {dday && (
            <span className={`pi-dday ${dday.color}`}>{dday.label}</span>
          )}
        </div>
      </div>

      {/* 오른쪽 상태 배지 및 메뉴 버튼 (기존과 동일) */}
      <div className="pi-right-wrap">
        <div className="pi-badges">
          <StatusBadge
            type="settle"
            status={item.is_settled}
            label={item.is_settled ? "정산 완료" : "정산 대기"}
          />
          <StatusBadge
            type="receive"
            status={item.received}
            label={item.received ? "수령 완료" : "주문 완료"}
          />
        </div>
        <button
          ref={menuBtnRef}
          onClick={() => {
            setIsMenuOpen(!isMenuOpen);
            setConfirmDelete(false);
          }}
          className="pi-menu-btn"
        >
          <svg className="pi-menu-icon" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>
      {isMenuOpen && (
        <div
          className={`pi-pop-wrap ${popPosition === "top" ? "pi-pop-top" : "pi-pop-bottom"}`}
        >
          <div className="pi-pop-header">
            <span className="pi-pop-title">상태 관리</span>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                setConfirmDelete(false);
              }}
              className="pi-pop-close"
            >
              ×
            </button>
          </div>
          <div className="pi-pop-content">
            <div className="pi-toggle-row">
              <span className="pi-toggle-label">정산 여부</span>
              <button
                disabled={loading}
                onClick={toggleSettled}
                className={`pi-toggle-track ${item.is_settled ? "pi-toggle-track-active" : "pi-toggle-track-inactive"}`}
              >
                <span
                  className={`pi-toggle-knob ${item.is_settled ? "pi-toggle-knob-active" : ""}`}
                />
              </button>
            </div>
            <div className="pi-toggle-row">
              <span className="pi-toggle-label">수령 여부</span>
              <button
                disabled={loading}
                onClick={toggleReceived}
                className={`pi-toggle-track ${item.received ? "pi-toggle-track-active" : "pi-toggle-track-inactive"}`}
              >
                <span
                  className={`pi-toggle-knob ${item.received ? "pi-toggle-knob-active" : ""}`}
                />
              </button>
            </div>
            <div className="pi-divider">
              <button
                disabled={loading}
                onClick={handleDelete}
                className={`pi-btn-del ${confirmDelete ? "pi-btn-del-confirm" : "pi-btn-del-normal"}`}
              >
                {confirmDelete
                  ? "정말 삭제할까요?\n탭하면 삭제됩니다"
                  : "🗑 구매내역 삭제"}
              </button>
              {confirmDelete && (
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="pi-btn-cancel"
                >
                  취소
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
