import { useState } from "react";
import { matchListings } from "../api";

const BASE = import.meta.env.VITE_API_URL || "https://dubai-realestate-production.up.railway.app";

function fmtPrice(p) {
  if (!p) return "—";
  return "AED " + (p / 1_000_000).toFixed(2) + "M";
}

function scoreColor(pct) {
  if (pct >= 80) return "#34d399";
  if (pct >= 50) return "#f59e0b";
  return "#f87171";
}

function buildBody(form) {
  const body = { market_type: "offplan" };
  if (form.budget_min)        body.budget_min = Number(form.budget_min);
  if (form.budget_max)        body.budget_max = Number(form.budget_max);
  if (form.bedrooms)          body.bedrooms = form.bedrooms;
  if (form.property_type)     body.property_type = form.property_type;
  if (form.max_handover_year) body.max_handover_year = Number(form.max_handover_year);
  if (form.preferred_areas.trim())
    body.preferred_areas = form.preferred_areas.split(",").map((s) => s.trim()).filter(Boolean);
  return body;
}

export default function MatchTab() {
  const [form, setForm] = useState({
    budget_min: "", budget_max: "", bedrooms: "",
    property_type: "", preferred_areas: "",
    max_handover_year: "", client_name: "",
  });
  const [results, setResults]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [downloading, setDl]      = useState(false);
  const [error, setError]         = useState(null);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await matchListings(buildBody(form));
      setResults(data.results || data);
    } catch (err) {
      setError("Match failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadReport() {
    setDl(true);
    try {
      const res = await fetch(`${BASE}/report/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_request: buildBody(form),
          client_name: form.client_name || "",
        }),
      });
      if (!res.ok) throw new Error("Report generation failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href     = url;
      a.download = `penta_match_${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Download failed: " + err.message);
    } finally {
      setDl(false);
    }
  }

  return (
    <div className="match-layout">
      {/* ── Form ── */}
      <form className="match-form" onSubmit={onSubmit}>
        <div className="form-title">Client Requirements</div>
        <hr className="divider" />

        <div className="form-group">
          <label className="form-label">Client Name (for report)</label>
          <input
            placeholder="e.g. Ahmed Al Mansouri"
            value={form.client_name}
            onChange={(e) => set("client_name", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Budget (AED)</label>
          <div className="form-row">
            <input placeholder="Min" value={form.budget_min} onChange={(e) => set("budget_min", e.target.value)} />
            <input placeholder="Max" value={form.budget_max} onChange={(e) => set("budget_max", e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Bedrooms</label>
          <select value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)}>
            <option value="">Any</option>
            <option>Studio</option>
            <option>1</option><option>2</option>
            <option>3</option><option>4</option>
            <option value="5+">5+</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Property Type</label>
          <select value={form.property_type} onChange={(e) => set("property_type", e.target.value)}>
            <option value="">Any</option>
            <option>apartment</option>
            <option>villa</option>
            <option>townhouse</option>
            <option>penthouse</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Preferred Areas (comma separated)</label>
          <input
            placeholder="e.g. Downtown, Marina, JVC"
            value={form.preferred_areas}
            onChange={(e) => set("preferred_areas", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Max Handover Year</label>
          <input placeholder="e.g. 2028" value={form.max_handover_year}
            onChange={(e) => set("max_handover_year", e.target.value)} />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Matching…" : "Find Matches"}
        </button>

        {/* Download button — only shown after results exist */}
        {results && results.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={downloadReport}
            disabled={downloading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {downloading ? "Generating PDF…" : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download PDF Report
              </>
            )}
          </button>
        )}
      </form>

      {/* ── Results ── */}
      <div>
        {error && <div className="error-msg">{error}</div>}

        {results === null && !loading && (
          <div className="empty">Fill in the client requirements and click Find Matches</div>
        )}

        {results !== null && results.length === 0 && (
          <div className="empty">No matches found — try relaxing the filters</div>
        )}

        {results && results.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>
                {results.length} match{results.length !== 1 ? "es" : ""} found
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={downloadReport}
                disabled={downloading}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {downloading ? "Generating…" : "Download PDF"}
              </button>
            </div>

            {results.map((r, i) => {
              const bd    = r.breakdown || {};
              const color = scoreColor(r.score_pct);
              return (
                <div className="match-result" key={r.listing_id}>
                  <div className={`match-rank ${i < 3 ? "top" : ""}`}>#{i + 1}</div>

                  <div className="match-body">
                    <div className="match-title">
                      <a className="listing-link" href={r.listing_url} target="_blank" rel="noopener noreferrer">
                        {r.title || "Untitled"}
                      </a>
                      {" "}
                      <span className="badge badge-blue" style={{ fontSize: 10 }}>
                        {r.listing_type === "offplan" ? "Off-Plan" : "Ready"}
                      </span>
                    </div>
                    <div className="match-sub">
                      {fmtPrice(r.price_aed)}
                      {r.bedrooms && ` · ${r.bedrooms} Bed`}
                      {r.size_sqft && ` · ${r.size_sqft.toLocaleString()} ft²`}
                      {(r.area || r.community) && ` · ${[r.community, r.area].filter(Boolean).join(", ")}`}
                    </div>
                    <div className="match-breakdown">
                      {Object.entries(bd).map(([k, v]) => (
                        <span key={k} className={`match-crit ${v > 0 ? "hit" : ""}`}>
                          {k}: {v > 0 ? "✓" : "✗"}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="score-bar-wrap">
                    <div className="score-pct" style={{ color }}>{r.score_pct}%</div>
                    <div className="score-bar">
                      <div className="score-bar-fill"
                        style={{ width: `${r.score_pct}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
