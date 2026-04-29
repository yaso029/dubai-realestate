const BASE = import.meta.env.VITE_API_URL || "https://dubai-realestate-production.up.railway.app";

export async function fetchStats() {
  const r = await fetch(`${BASE}/listings/stats`);
  return r.json();
}

export async function fetchOffplanOptions() {
  const r = await fetch(`${BASE}/listings/offplan/options`);
  return r.json();
}

export async function fetchOffplan(params = {}) {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null && v !== undefined))
  );
  const r = await fetch(`${BASE}/listings/offplan?${q}`);
  return r.json();
}

export async function matchListings(req) {
  const r = await fetch(`${BASE}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return r.json();
}

export async function triggerScrape(source, maxPages = 2) {
  const r = await fetch(`${BASE}/scrape/${source}?max_pages=${maxPages}`, { method: "POST" });
  return r.json();
}

export async function fetchLogs(limit = 10) {
  const r = await fetch(`${BASE}/scrape/logs?limit=${limit}`);
  return r.json();
}

// ── Client Intake ──────────────────────────────────────────────────────────────
export async function startIntake(sessionId = null) {
  const r = await fetch(`${BASE}/intake/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  return r.json();
}

export async function sendIntakeMessage(sessionId, message) {
  const r = await fetch(`${BASE}/intake/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  return r.json();
}

export async function generateIntakeReport(sessionId) {
  const r = await fetch(`${BASE}/intake/generate-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!r.ok) throw new Error("Report generation failed");
  const blob = await r.blob();
  const cd = r.headers.get("Content-Disposition") || "";
  const name = cd.match(/filename="([^"]+)"/)?.[1] || "PROPIQ_Client_Report.pdf";
  return { blob, name };
}

export async function fetchIntakeClients() {
  const r = await fetch(`${BASE}/intake/clients`);
  return r.json();
}

export async function fetchProjectDetail(reellyId) {
  const r = await fetch(`${BASE}/listings/offplan/${reellyId}/detail`);
  if (!r.ok) throw new Error(`Detail fetch failed: ${r.status}`);
  return r.json();
}
