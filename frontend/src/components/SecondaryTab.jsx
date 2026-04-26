import { useEffect, useState } from "react";
import { fetchSecondary } from "../api";

const PAGE_SIZE = 20;

function fmtPrice(p) {
  if (!p) return "—";
  if (p >= 1_000_000) return "AED " + (p / 1_000_000).toFixed(2) + "M";
  return "AED " + p.toLocaleString();
}

function bedsBadge(beds) {
  if (!beds) return null;
  const b = String(beds).toLowerCase();
  if (b.includes("studio")) return <span className="badge badge-purple">Studio</span>;
  return <span className="badge badge-blue">{beds} Bed</span>;
}

export default function SecondaryTab({ refreshKey }) {
  const [data, setData] = useState({ total: 0, results: [] });
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);

  const [filters, setFilters] = useState({
    min_price: "", max_price: "", bedrooms: "", area: "", property_type: "",
  });

  function load(off = 0) {
    setLoading(true);
    fetchSecondary({ ...filters, limit: PAGE_SIZE, offset: off })
      .then((d) => { setData(d); setOffset(off); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(0); }, [refreshKey]);

  function onFilter(e) {
    e.preventDefault();
    load(0);
  }

  function clearFilters() {
    setFilters({ min_price: "", max_price: "", bedrooms: "", area: "", property_type: "" });
    setLoading(true);
    fetchSecondary({ limit: PAGE_SIZE, offset: 0 })
      .then((d) => { setData(d); setOffset(0); })
      .finally(() => setLoading(false));
  }

  const totalPages = Math.ceil(data.total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <form className="filters" onSubmit={onFilter}>
        <div className="filter-group">
          <span className="filter-label">Min Price</span>
          <input
            style={{ width: 120 }}
            placeholder="e.g. 1000000"
            value={filters.min_price}
            onChange={(e) => setFilters((f) => ({ ...f, min_price: e.target.value }))}
          />
        </div>
        <div className="filter-group">
          <span className="filter-label">Max Price</span>
          <input
            style={{ width: 120 }}
            placeholder="e.g. 5000000"
            value={filters.max_price}
            onChange={(e) => setFilters((f) => ({ ...f, max_price: e.target.value }))}
          />
        </div>
        <div className="filter-group">
          <span className="filter-label">Bedrooms</span>
          <select
            style={{ width: 110 }}
            value={filters.bedrooms}
            onChange={(e) => setFilters((f) => ({ ...f, bedrooms: e.target.value }))}
          >
            <option value="">Any</option>
            <option>Studio</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
            <option>4</option>
            <option>5+</option>
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">Area</span>
          <input
            style={{ width: 150 }}
            placeholder="e.g. Downtown"
            value={filters.area}
            onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}
          />
        </div>
        <div className="filter-group">
          <span className="filter-label">Type</span>
          <select
            style={{ width: 130 }}
            value={filters.property_type}
            onChange={(e) => setFilters((f) => ({ ...f, property_type: e.target.value }))}
          >
            <option value="">Any</option>
            <option>apartment</option>
            <option>villa</option>
            <option>townhouse</option>
            <option>penthouse</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Apply</button>
        <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear</button>
      </form>

      <div style={{ marginBottom: 10, fontSize: 13, color: "#64748b" }}>
        {data.total} listing{data.total !== 1 ? "s" : ""}
        {loading && " · loading…"}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Price</th>
              <th>Beds</th>
              <th>Size</th>
              <th>Type</th>
              <th>Area</th>
              <th>Community</th>
              <th>DOM</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {data.results.length === 0 && !loading && (
              <tr><td colSpan={9} className="empty">No listings found</td></tr>
            )}
            {data.results.map((r) => (
              <tr key={r.id}>
                <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.title || "—"}
                </td>
                <td className="price">{fmtPrice(r.price_aed)}</td>
                <td>{bedsBadge(r.bedrooms) || "—"}</td>
                <td>{r.size_sqft ? r.size_sqft.toLocaleString() + " ft²" : "—"}</td>
                <td>{r.property_type ? <span className="badge badge-orange">{r.property_type}</span> : "—"}</td>
                <td>{r.area || "—"}</td>
                <td>{r.community || "—"}</td>
                <td>{r.days_on_market != null ? `${r.days_on_market}d` : "—"}</td>
                <td>
                  <a className="listing-link" href={r.listing_url} target="_blank" rel="noopener noreferrer">
                    View ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => load(offset - PAGE_SIZE)}>
            ← Prev
          </button>
          <span className="page-info">Page {currentPage} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={currentPage === totalPages} onClick={() => load(offset + PAGE_SIZE)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
