import { useEffect, useState } from "react";
import { fetchLogs } from "../api";

function fmt(ts) {
  if (!ts) return "—";
  return new Date(ts + "Z").toLocaleString();
}

export default function LogsTab({ refreshKey }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs(20).then(setLogs).catch(() => {});
  }, [refreshKey]);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Source</th>
            <th>Status</th>
            <th>Started</th>
            <th>Duration</th>
            <th>Found</th>
            <th>New</th>
            <th>Updated</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 && (
            <tr><td colSpan={9} className="empty">No scrape logs yet</td></tr>
          )}
          {logs.map((l) => {
            const dur = l.started_at && l.finished_at
              ? ((new Date(l.finished_at + "Z") - new Date(l.started_at + "Z")) / 1000).toFixed(1) + "s"
              : "—";
            return (
              <tr key={l.id} className="log-row">
                <td>{l.id}</td>
                <td><span className="badge badge-blue">{l.source}</span></td>
                <td>
                  <span className={`status-dot status-${l.status}`} />
                  {l.status}
                </td>
                <td>{fmt(l.started_at)}</td>
                <td>{dur}</td>
                <td>{l.listings_found ?? "—"}</td>
                <td style={{ color: "#34d399" }}>{l.listings_new ?? "—"}</td>
                <td>{l.listings_updated ?? "—"}</td>
                <td style={{ color: "#f87171", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.error_message || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
