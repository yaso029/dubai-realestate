import { useEffect, useState } from "react";
import { fetchStats } from "../api";

function fmt(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

export default function Stats({ refreshKey }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
  }, [refreshKey]);

  if (!stats) return <div className="loading">Loading stats…</div>;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Off-Plan Projects</div>
        <div className="stat-value">{stats.offplan_total}</div>
        <div className="stat-sub">New developments · Dubai</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Data Source</div>
        <div className="stat-value" style={{ fontSize: 20 }}>Reelly</div>
        <div className="stat-sub">Off-plan intelligence API</div>
      </div>
    </div>
  );
}
