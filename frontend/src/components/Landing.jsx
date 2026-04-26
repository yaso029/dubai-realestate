import { useEffect, useState } from "react";
import "./Landing.css";

/**
 * Penta Real Estate logo — SVG recreation.
 * Large serif P with Burj Khalifa silhouette inside the stem, text below.
 */
function PentaLogo() {
  return (
    <svg
      width="260"
      viewBox="0 0 300 430"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {/* ── Large serif P ──
          Outer contour: stem + bowl curve
          Inner bowl: subtracted with evenodd to create the hollow
      */}
      <path
        fillRule="evenodd"
        fill="white"
        d={[
          /* outer P */
          "M 45,25 L 45,315 L 97,315 L 97,222",
          "C 175,222 252,186 252,122",
          "C 252,58 175,25 97,25 Z",
          /* inner bowl cutout */
          "M 97,73 C 152,73 196,96 196,122",
          "C 196,150 153,173 97,173 Z",
        ].join(" ")}
      />

      {/* ── Burj Khalifa silhouette ──
          Centered at x=71 (centre of stem x=45–97).
          Three wing setbacks give the distinctive stepped look.
          Extends from inside the P down below its baseline.
      */}
      <path
        fill="white"
        d={[
          /* spire tip */
          "M 71,82",
          /* right side going down */
          "L 75,132 L 81,132",       /* right of upper body */
          "L 81,174 L 93,174",       /* right wing-1 protrudes */
          "L 93,196 L 81,196",       /* wing-1 bottom, step back */
          "L 83,238 L 97,238",       /* right wing-2 protrudes */
          "L 97,262 L 84,262",       /* wing-2 bottom, step back */
          "L 86,304 L 102,304",      /* right wing-3 protrudes */
          "L 102,330 L 89,330",      /* wing-3 bottom, step back */
          "L 91,352 L 100,352 L 100,362", /* base right */
          /* left side going up */
          "L 42,362 L 42,352 L 51,352",   /* base left */
          "L 53,330 L 40,330",       /* wing-3 left outer */
          "L 40,304 L 56,304",       /* wing-3 left step back */
          "L 58,262 L 45,262",       /* wing-2 left outer */
          "L 45,238 L 59,238",       /* wing-2 step back */
          "L 61,196 L 49,196",       /* wing-1 left outer */
          "L 49,174 L 61,174",       /* wing-1 step back */
          "L 67,132 Z",              /* left of upper body, close to tip */
        ].join(" ")}
      />

      {/* ── Thin detail lines — give depth to the tower ── */}
      {/* Central spine */}
      <line x1="71" y1="132" x2="71" y2="355" stroke="black" strokeWidth="1.4" opacity="0.65" />
      {/* Left structural line */}
      <line x1="63" y1="196" x2="63" y2="355" stroke="black" strokeWidth="0.9" opacity="0.45" />
      {/* Right structural line */}
      <line x1="79" y1="196" x2="79" y2="355" stroke="black" strokeWidth="0.9" opacity="0.45" />

      {/* ── PENTA ── */}
      <text
        x="150" y="398"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="64"
        fontWeight="700"
        fill="white"
        letterSpacing="8"
      >
        PENTA
      </text>

      {/* ── REAL ESTATE ── */}
      <text
        x="150" y="424"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="15"
        fontWeight="400"
        fill="white"
        letterSpacing="9"
      >
        REAL ESTATE
      </text>
    </svg>
  );
}

/* ── Floating particles ── */
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${5 + (i * 5.3) % 90}%`,
  delay: `${(i * 0.7) % 12}s`,
  duration: `${8 + (i * 1.3) % 12}s`,
  size: `${1 + (i % 2)}px`,
}));

export default function Landing({ onEnter }) {
  const [exiting, setExiting] = useState(false);
  const [count, setCount] = useState({ secondary: 0, offplan: 0, avg: 0 });

  useEffect(() => {
    fetch("http://localhost:8000/listings/stats")
      .then((r) => r.json())
      .then((d) => {
        animateCount("secondary", d.secondary_total || 0);
        animateCount("offplan", d.offplan_total || 0);
        animateCount("avg", Math.round((d.secondary_avg_price_aed || 0) / 1_000_000));
      })
      .catch(() => {});
  }, []);

  function animateCount(key, target) {
    const step = Math.max(1, target / 40);
    let cur = 0;
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      setCount((c) => ({ ...c, [key]: Math.floor(cur) }));
      if (cur >= target) clearInterval(iv);
    }, 40);
  }

  function handleEnter() {
    setExiting(true);
    setTimeout(onEnter, 750);
  }

  return (
    <div className={`landing ${exiting ? "exiting" : ""}`}>
      <div className="landing-grid" />
      <div className="landing-glow" />

      {PARTICLES.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: "-4px",
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}

      <div className="landing-content">
        <div className="logo-wrap">
          <PentaLogo />
        </div>

        <div className="brand-divider" />
        <div className="brand-tagline">Dubai Property Intelligence Platform</div>

        <button className="enter-btn" onClick={handleEnter}>
          Enter Platform
        </button>
      </div>

      <div className="landing-stats">
        <div className="landing-stat">
          <div className="landing-stat-val">{count.secondary}+</div>
          <div className="landing-stat-label">Listings</div>
        </div>
        <div className="landing-stat">
          <div className="landing-stat-val">{count.offplan}+</div>
          <div className="landing-stat-label">Off-Plan Projects</div>
        </div>
        <div className="landing-stat">
          <div className="landing-stat-val">AED {count.avg}M</div>
          <div className="landing-stat-label">Avg Price</div>
        </div>
      </div>
    </div>
  );
}
