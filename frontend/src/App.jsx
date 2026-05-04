import { useState } from "react";
import PasswordGate from "./components/PasswordGate";
import Landing from "./components/Landing";
import Stats from "./components/Stats";
import OffplanTab from "./components/OffplanTab";
import MatchTab from "./components/MatchTab";
import LogsTab from "./components/LogsTab";
import ClientIntakeTab from "./components/ClientIntakeTab";
import IntroPage from "./components/intake/IntroPage";
import { triggerScrape } from "./api";
import "./index.css";

const TABS = ["Off-Plan", "Match Clients", "Scrape Logs", "Client Intake"];

export default function App() {
  const isIntakePage = window.location.pathname === "/intake";
  const [intakeStarted, setIntakeStarted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [entered, setEntered] = useState(false);
  const [tab, setTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState(null);

  async function runScrape() {
    setScraping(true);
    setScrapeMsg(null);
    try {
      await triggerScrape("reelly", 20);
      setScrapeMsg("Scraping started — check Scrape Logs");
      setTimeout(() => {
        setRefreshKey((k) => k + 1);
        setScrapeMsg(null);
      }, 15000);
    } catch {
      setScrapeMsg("Scrape trigger failed");
    } finally {
      setScraping(false);
    }
  }

  if (isIntakePage) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
        {!intakeStarted && <IntroPage onStart={() => setIntakeStarted(true)} />}
        {intakeStarted && <ClientIntakeTab />}
      </div>
    );
  }

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  if (!entered) {
    return <Landing onEnter={() => setEntered(true)} />;
  }

  return (
    <div className="app" style={{ animation: "dashFadeIn 0.6s ease forwards" }}>
      <style>{`
        @keyframes dashFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <nav className="navbar">
        <div className="navbar-brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Mini logo mark */}
          <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
            <path
              d="M 2 25 L 2 2 L 11 2 Q 20 2 20 10 Q 20 18 11 18 L 6 18 L 6 25 Z M 6 6 L 6 14 L 10 14 Q 15 14 15 10 Q 15 6 10 6 Z"
              fill="#60a5fa"
              fillRule="evenodd"
            />
          </svg>
          <span style={{ color: "#60a5fa", fontWeight: 700 }}>PENTA</span>
          <span style={{ color: "#e2e8f0", fontWeight: 400 }}>Real Estate</span>
        </div>
        <div className="navbar-scrape">
          {scrapeMsg && (
            <span style={{ fontSize: 12, color: "#94a3b8", alignSelf: "center" }}>{scrapeMsg}</span>
          )}
          <button className="btn btn-success btn-sm" onClick={runScrape} disabled={scraping}>
            {scraping ? "Scraping…" : "⟳ Run Scrape"}
          </button>
        </div>
      </nav>

      <main className="main">
        <Stats refreshKey={refreshKey} />

        <div className="tabs">
          {TABS.map((t, i) => (
            <button key={t} className={`tab ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>
              {t}
            </button>
          ))}
        </div>

        {tab === 0 && <OffplanTab refreshKey={refreshKey} />}
        {tab === 1 && <MatchTab />}
        {tab === 2 && <LogsTab refreshKey={refreshKey} />}
        {tab === 3 && <ClientIntakeTab />}
      </main>
    </div>
  );
}
