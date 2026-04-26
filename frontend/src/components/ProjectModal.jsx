import { useEffect, useState, useCallback } from "react";
import { fetchProjectDetail } from "../api";

function fmtM(p) {
  if (!p) return null;
  return "AED " + (p / 1_000_000).toFixed(2) + "M";
}
function fmtRange(from, to) {
  if (!from) return "—";
  if (to && to > from) return `${(from/1e6).toFixed(2)}M – ${(to/1e6).toFixed(2)}M`;
  return `${(from/1e6).toFixed(2)}M`;
}

/* ─── Image Gallery ─────────────────────────────────────── */
function Gallery({ images }) {
  const [idx, setIdx] = useState(0);
  if (!images?.length) return null;
  const go = (d) => setIdx(i => (i + d + images.length) % images.length);
  return (
    <div style={{ position: "relative", background: "#000", flexShrink: 0, borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
      <img
        key={idx}
        src={images[idx]}
        alt=""
        style={{ width: "100%", height: 340, objectFit: "cover", display: "block" }}
        onError={e => { e.target.parentElement.style.display = "none"; }}
      />
      {images.length > 1 && <>
        <button onClick={() => go(-1)} style={navBtn("left")}>‹</button>
        <button onClick={() => go(1)}  style={navBtn("right")}>›</button>
        <div style={{
          position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 5,
        }}>
          {images.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{
              width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
              background: i === idx ? "#fff" : "rgba(255,255,255,0.4)",
              cursor: "pointer", transition: "width .2s",
            }} />
          ))}
        </div>
        <div style={{
          position: "absolute", bottom: 10, right: 12,
          background: "rgba(0,0,0,0.55)", color: "#fff",
          fontSize: 11, padding: "2px 8px", borderRadius: 4,
        }}>
          {idx + 1} / {images.length}
        </div>
      </>}
    </div>
  );
}
function navBtn(side) {
  return {
    position: "absolute", top: "50%", [side]: 10, transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.5)", color: "#fff", border: "none",
    borderRadius: "50%", width: 36, height: 36, fontSize: 20,
    cursor: "pointer", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center",
  };
}

/* ─── Status badge ──────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    "on sale":    { bg: "#dcfce7", color: "#166534" },
    "presale":    { bg: "#dbeafe", color: "#1e40af" },
    "out of stock": { bg: "#fee2e2", color: "#991b1b" },
  };
  const s = (status || "").toLowerCase();
  const style = map[s] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{
      background: style.bg, color: style.color,
      fontSize: 11, fontWeight: 700, padding: "3px 10px",
      borderRadius: 20, textTransform: "capitalize",
    }}>
      {status}
    </span>
  );
}

/* ─── Section title ─────────────────────────────────────── */
function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, color: "#1e293b",
      marginBottom: 14, paddingBottom: 8,
      borderBottom: "2px solid #e2e8f0",
    }}>{children}</div>
  );
}

/* ─── Main modal ────────────────────────────────────────── */
export default function ProjectModal({ reellyId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetchProjectDetail(reellyId)
      .then(setDetail).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [reellyId]);

  const handleKey = useCallback(e => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [handleKey]);

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        overflowY: "auto", padding: "32px 16px 48px",
      }}
    >
      <div style={{
        background: "#f8fafc", borderRadius: 16, width: "100%", maxWidth: 900,
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
        position: "relative", color: "#1e293b",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 12, zIndex: 20,
          background: "rgba(0,0,0,0.5)", color: "#fff",
          border: "none", borderRadius: "50%",
          width: 34, height: 34, fontSize: 18, cursor: "pointer",
          lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>

        {loading && (
          <div style={{ padding: 80, textAlign: "center", color: "#94a3b8", fontSize: 15 }}>
            Loading project…
          </div>
        )}
        {error && (
          <div style={{ padding: 60, textAlign: "center", color: "#ef4444", fontSize: 14 }}>
            {error}
          </div>
        )}

        {detail && <ModalContent detail={detail} />}
      </div>
    </div>
  );
}

function ModalContent({ detail }) {
  const minPrice = detail.units?.length
    ? Math.min(...detail.units.map(u => u.price_from_aed).filter(Boolean))
    : null;

  return (
    <>
      {/* Gallery */}
      <Gallery images={detail.images} />

      {/* Header bar */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        padding: "20px 28px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
              {detail.project_name}
            </div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              by <strong style={{ color: "#334155" }}>{detail.developer_name}</strong>
              {detail.area && <> · 📍 {detail.area}{detail.region && detail.region !== detail.area && `, ${detail.region}`}</>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {minPrice && (
              <div style={{ fontSize: 20, fontWeight: 800, color: "#059669" }}>
                From AED {(minPrice/1e6).toFixed(2)}M
              </div>
            )}
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6, flexWrap: "wrap" }}>
              {detail.sale_status && <StatusBadge status={detail.sale_status} />}
              {detail.completion_date && (
                <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                  🗓 {detail.completion_date}
                </span>
              )}
              {detail.max_commission > 0 && (
                <span style={{ background: "#ede9fe", color: "#5b21b6", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                  ⭐ {detail.max_commission}% commission
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Overview */}
        {detail.overview && (
          <div>
            <SectionTitle>Overview</SectionTitle>
            <div style={{
              fontSize: 13, lineHeight: 1.75, color: "#475569",
              whiteSpace: "pre-wrap",
            }}>
              {detail.overview.replace(/#{1,6}\s*/g, "").replace(/\*\*/g, "").trim()}
            </div>
          </div>
        )}

        {/* Details + Payment Plan side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Details box */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
            <SectionTitle>Details</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Completion date", detail.completion_date],
                ["Status", detail.sale_status],
                ["Unit types", detail.units?.map(u => u.type).filter((v,i,a) => a.indexOf(v)===i).join(", ")],
                ["Floors", detail.floors],
                ["Furnishing", detail.furnishing],
                ["Service charge", detail.service_charge],
                ["Readiness", detail.readiness],
                ["Post-handover", detail.post_handover ? "Yes" : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#94a3b8", flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment plan box */}
          {detail.payment_plans?.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
              <SectionTitle>Payment plan</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {detail.payment_plans.map((p, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 0",
                    borderBottom: i < detail.payment_plans.length - 1 ? "1px solid #f1f5f9" : "none",
                  }}>
                    <span style={{ fontSize: 13, color: "#64748b" }}>{p.when}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 80, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${p.percent}%`, height: "100%", background: "#3b82f6", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", minWidth: 38, textAlign: "right" }}>
                        {p.percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Unit Types & Pricing */}
        {detail.units?.length > 0 && (
          <div>
            <SectionTitle>Unit Types & Pricing</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {detail.units.map((u, i) => (
                <div key={i} style={{
                  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
                  padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                    {u.unit_bedrooms || u.type}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                    {u.area_from_sqft && u.area_to_sqft
                      ? `${u.area_from_sqft.toLocaleString()} – ${u.area_to_sqft.toLocaleString()} sqft`
                      : u.area_from_sqft ? `from ${u.area_from_sqft.toLocaleString()} sqft` : ""}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#059669" }}>
                    AED {fmtRange(u.price_from_aed, u.price_to_aed)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Amenities */}
        {detail.facilities?.length > 0 && (
          <div>
            <SectionTitle>Amenities</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {detail.facilities.map((f, i) => (
                <span key={i} style={{
                  background: "#fff", border: "1px solid #e2e8f0",
                  color: "#475569", fontSize: 12, padding: "6px 14px",
                  borderRadius: 20,
                }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Nearby */}
        {detail.map_points?.length > 0 && (
          <div>
            <SectionTitle>Nearby Landmarks</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {detail.map_points.slice(0, 8).map((p, i) => (
                <div key={i} style={{
                  background: "#fff", border: "1px solid #e2e8f0",
                  borderRadius: 8, padding: "10px 14px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 12, color: "#475569" }}>📍 {p.name}</span>
                  {p.distance && <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{p.distance} km</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video */}
        {detail.video_id && (
          <div>
            <SectionTitle>Project Video</SectionTitle>
            <div style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "16/9" }}>
              <iframe
                width="100%" height="100%"
                src={`https://www.youtube.com/embed/${detail.video_id}`}
                title="Project video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Footer action */}
        <div style={{ paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
          <a
            href={detail.reelly_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block", width: "100%", padding: "13px 0",
              textAlign: "center", background: "#0f172a", color: "#fff",
              borderRadius: 10, fontSize: 14, fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Open in Reelly ↗
          </a>
        </div>
      </div>
    </>
  );
}
