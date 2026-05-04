import { useState, useEffect } from 'react';

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: 3 + (i * 4.3) % 94,
  delay: (i * 0.5) % 10,
  dur: 10 + (i * 1.1) % 8,
}));

function PentaLogo({ size = 180 }) {
  return (
    <svg width={size} viewBox="0 0 300 380" xmlns="http://www.w3.org/2000/svg">
      {/* Serif P */}
      <path fillRule="evenodd" fill="white" d={[
        "M 45,25 L 45,315 L 97,315 L 97,222",
        "C 175,222 252,186 252,122",
        "C 252,58 175,25 97,25 Z",
        "M 97,73 C 152,73 196,96 196,122",
        "C 196,150 153,173 97,173 Z",
      ].join(" ")} />
      {/* Burj Khalifa inside stem */}
      <path fill="black" d={[
        "M 71,82",
        "L 75,132 L 81,132",
        "L 81,174 L 93,174",
        "L 93,196 L 81,196",
        "L 83,238 L 97,238",
        "L 97,262 L 84,262",
        "L 86,304 L 102,304",
        "L 102,330 L 89,330",
        "L 91,352 L 100,352 L 100,362",
        "L 42,362 L 42,352 L 51,352",
        "L 53,330 L 40,330",
        "L 40,304 L 56,304",
        "L 58,262 L 45,262",
        "L 45,238 L 59,238",
        "L 61,196 L 49,196",
        "L 49,174 L 61,174",
        "L 67,132 Z",
      ].join(" ")} />
      <line x1="71" y1="132" x2="71" y2="355" stroke="white" strokeWidth="1.2" opacity="0.5"/>
      {/* PENTA */}
      <text x="150" y="352" textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontSize="58" fontWeight="700" fill="white" letterSpacing="7">PENTA</text>
      {/* REAL ESTATE */}
      <text x="150" y="375" textAnchor="middle"
        fontFamily="Arial,Helvetica,sans-serif"
        fontSize="13" fontWeight="400" fill="white" letterSpacing="8">REAL ESTATE</text>
    </svg>
  );
}

export default function IntroPage({ onStart }) {
  const [visible, setVisible]   = useState(false);
  const [leaving, setLeaving]   = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  function handleStart() {
    setLeaving(true);
    setTimeout(onStart, 700);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      opacity: leaving ? 0 : visible ? 1 : 0,
      transition: leaving ? 'opacity 0.7s ease' : 'opacity 1.2s ease',
    }}>
      <style>{`
        @keyframes floatUp {
          0%   { transform:translateY(0) scale(1);    opacity:0;   }
          8%   { opacity:.35; }
          92%  { opacity:.12; }
          100% { transform:translateY(-105vh) scale(.4); opacity:0; }
        }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%,100% { opacity:.15; transform:scale(1); }
          50%     { opacity:.3;  transform:scale(1.05); }
        }
      `}</style>

      {/* Subtle grid */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:.04 }}>
        <defs>
          <pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0L0 0 0 60" fill="none" stroke="white" strokeWidth=".6"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>

      {/* Large faint circle behind logo */}
      <div style={{
        position:'absolute',
        width: 500, height: 500,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.06)',
        animation: 'pulse 6s ease infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position:'absolute',
        width: 700, height: 700,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.04)',
        animation: 'pulse 8s 1s ease infinite',
        pointerEvents: 'none',
      }} />

      {/* Floating particles */}
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:`${p.x}%`, bottom:-4,
          width: 2, height: 2, borderRadius:'50%',
          background: 'white', opacity:0,
          animation:`floatUp ${p.dur}s ${p.delay}s infinite ease-out`,
          pointerEvents:'none',
        }} />
      ))}

      {/* Logo */}
      <div style={{
        animation:'slideUp 1s .3s ease both', opacity:0,
        marginBottom: 40,
      }}>
        <PentaLogo size={160} />
      </div>

      {/* Tagline */}
      <p style={{
        fontSize: 'clamp(13px, 1.8vw, 16px)',
        color: 'rgba(255,255,255,0.45)',
        margin: '0 0 44px',
        letterSpacing: 2,
        textTransform: 'uppercase',
        animation: 'slideUp 1s .55s ease both', opacity:0,
      }}>
        Dubai Property Advisor
      </p>

      {/* CTA */}
      <button
        onClick={handleStart}
        style={{
          padding: '16px 56px',
          background: '#fff',
          color: '#000',
          border: 'none', borderRadius: 4,
          fontSize: 14, fontWeight: 700,
          cursor: 'pointer', letterSpacing: 3,
          textTransform: 'uppercase',
          transition: 'all 0.2s ease',
          fontFamily: 'inherit',
          animation: 'slideUp 1s .75s ease both', opacity:0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.outline = '1px solid #fff';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#fff';
          e.currentTarget.style.color = '#000';
          e.currentTarget.style.outline = 'none';
        }}
      >
        Begin →
      </button>

      {/* Bottom badges */}
      <div style={{
        position: 'absolute', bottom: 32,
        display: 'flex', gap: 32,
        animation: 'slideUp 1s 1s ease both', opacity:0,
      }}>
        {['🔒 Secure', '⚡ 3 Minutes', '📋 Free Report'].map(b => (
          <div key={b} style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>{b}</div>
        ))}
      </div>
    </div>
  );
}
