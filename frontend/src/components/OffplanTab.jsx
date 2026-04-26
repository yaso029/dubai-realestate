import { useEffect, useState } from "react";
import { fetchOffplan, fetchOffplanOptions } from "../api";
import ProjectModal from "./ProjectModal";

const PAGE_SIZE = 24;

function fmtPrice(p) {
  if (!p) return "—";
  return "AED " + (p / 1_000_000).toFixed(2) + "M";
}

function isCompleted(r) {
  const s = (r.sale_status || "").toLowerCase();
  return s === "out of stock" || s === "sold out" || s === "completed" || s === "delivered";
}

export default function OffplanTab({ refreshKey }) {
  const [data, setData] = useState({ total: 0, results: [] });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState({
    min_price: "", max_price: "", handover: "", area: "", developer: "", sale_status: ""
  });
  const [options, setOptions] = useState({ developers: [], areas: [], handovers: [], statuses: [] });

  useEffect(() => {
    fetchOffplanOptions().then(setOptions).catch(() => {});
  }, [refreshKey]);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  function load(currentPage, currentFilters) {
    setLoading(true);
    fetchOffplan({
      ...currentFilters,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    })
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setPage(1);
    load(1, filters);
  }, [refreshKey]);

  function onFilter(e) {
    e.preventDefault();
    setPage(1);
    load(1, filters);
  }

  function clearFilters() {
    const empty = { min_price: "", max_price: "", handover: "", area: "", developer: "", sale_status: "" };
    setFilters(empty);
    setPage(1);
    load(1, empty);
  }

  function goToPage(p) {
    const clamped = Math.max(1, Math.min(p, totalPages));
    setPage(clamped);
    load(clamped, filters);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getReellyId(url) {
    const m = (url || "").match(/\/projects\/(\d+)/);
    return m ? parseInt(m[1]) : null;
  }

  return (
    <div>
      {selectedId && (
        <ProjectModal
          reellyId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
      <form className="filters" onSubmit={onFilter}>
        <div className="filter-group">
          <span className="filter-label">Max Price</span>
          <input style={{ width: 130 }} placeholder="e.g. 5000000" value={filters.max_price}
            onChange={(e) => setFilters((f) => ({ ...f, max_price: e.target.value }))} />
        </div>

        <div className="filter-group">
          <span className="filter-label">Handover</span>
          <select style={{ width: 120 }} value={filters.handover}
            onChange={(e) => setFilters((f) => ({ ...f, handover: e.target.value }))}>
            <option value="">All</option>
            {options.handovers.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Status</span>
          <select style={{ width: 140 }} value={filters.sale_status}
            onChange={(e) => setFilters((f) => ({ ...f, sale_status: e.target.value }))}>
            <option value="">All</option>
            {options.statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Area</span>
          <select style={{ width: 180 }} value={filters.area}
            onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}>
            <option value="">All Areas</option>
            {options.areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Developer</span>
          <select style={{ width: 200 }} value={filters.developer}
            onChange={(e) => setFilters((f) => ({ ...f, developer: e.target.value }))}>
            <option value="">All Developers</option>
            {options.developers.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn-primary">Apply</button>
        <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear</button>
      </form>

      <div style={{ marginBottom: 12, fontSize: 13, color: "#64748b" }}>
        {data.total} project{data.total !== 1 ? "s" : ""}
        {data.total > 0 && ` · page ${page} of ${totalPages}`}
        {loading && " · loading…"}
      </div>

      <div className="cards-grid">
        {data.results.length === 0 && !loading && (
          <div className="empty" style={{ gridColumn: "1/-1" }}>No projects found</div>
        )}
        {data.results.map((r) => {
          const completed = isCompleted(r);
          const reellyId = getReellyId(r.listing_url);
          return (
            <div
              className="project-card"
              key={r.id}
              onClick={() => reellyId && setSelectedId(reellyId)}
              style={{
                ...(completed ? { borderColor: "#059669", background: "#0a1f18" } : {}),
                padding: 0, overflow: "hidden",
                cursor: reellyId ? "pointer" : "default",
              }}
            >

              {r.cover_image_url && (
                <div style={{ position: "relative", width: "100%", height: 140, flexShrink: 0 }}>
                  <img
                    src={r.cover_image_url}
                    alt={r.project_name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={(e) => { e.target.style.display = "none"; e.target.parentElement.style.display = "none"; }}
                  />
                  {completed && (
                    <div style={{
                      position: "absolute", top: 8, left: 8,
                      background: "#059669", color: "#fff",
                      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: 1, padding: "3px 8px", borderRadius: 4,
                    }}>
                      ✓ Delivered
                    </div>
                  )}
                  {r.max_commission > 0 && (
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      background: "#1e293b", color: "#fbbf24",
                      fontSize: 11, fontWeight: 700,
                      padding: "3px 8px", borderRadius: 4,
                    }}>
                      {r.max_commission}% comm
                    </div>
                  )}
                </div>
              )}

              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {!r.cover_image_url && completed && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: 1, color: "#34d399",
                  }}>
                    ✓ Completed / Delivered
                  </div>
                )}

                <div>
                  <div className="project-name">{r.project_name || "—"}</div>
                  <div className="project-dev">{r.developer_name || "Unknown Developer"}</div>
                </div>

                <div className="project-price">{fmtPrice(r.starting_price_aed)}</div>

                <div className="project-meta">
                  {(r.completion_date_text || r.handover_year) && (
                    <span className={`badge ${completed ? "badge-green" : "badge-orange"}`}>
                      {r.completion_date_text || `${r.handover_year}`}
                    </span>
                  )}
                  {r.sale_status && !completed && (
                    <span className="badge badge-purple">{r.sale_status}</span>
                  )}
                  {!r.cover_image_url && r.max_commission > 0 && (
                    <span className="badge" style={{ background: "#1e293b", color: "#fbbf24" }}>
                      {r.max_commission}% comm
                    </span>
                  )}
                </div>

                {(r.community || r.area) && (
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    📍 {[r.community, r.area].filter((v, i, a) => v && a.indexOf(v) === i).join(", ")}
                  </div>
                )}

                <a className="listing-link" href={r.listing_url} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 12, marginTop: "auto" }}>
                  View on Reelly ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" onClick={() => goToPage(1)} disabled={page === 1}>«</button>
          <button className="btn btn-secondary btn-sm" onClick={() => goToPage(page - 1)} disabled={page === 1}>‹ Prev</button>
          <span className="page-info">Page {page} of {totalPages} ({data.total} total)</span>
          <button className="btn btn-secondary btn-sm" onClick={() => goToPage(page + 1)} disabled={page === totalPages}>Next ›</button>
          <button className="btn btn-secondary btn-sm" onClick={() => goToPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}
    </div>
  );
}
