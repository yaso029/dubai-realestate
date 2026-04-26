import { useState, useEffect } from 'react';
import { NAVY, GOLD } from './ui';

const STEP_TIPS = {
  1:  { icon: '💰', tip: "Investment properties in Dubai enjoy 0% income tax on rental income and 0% capital gains tax." },
  2:  { icon: '🏢', tip: "Apartments are 70% of Dubai's market. Villas are rarer and hold value exceptionally well." },
  3:  { icon: '🛏️', tip: "2-bedroom units offer the best rental yield-to-price ratio in most Dubai communities." },
  4:  { icon: '📍', tip: "JVC and JVT are top-value picks with 7-8% gross rental yields. Marina starts from AED 800K." },
  5:  { icon: '🔑', tip: "Off-plan often prices 10-20% below ready market. Many projects offer post-handover payment plans." },
  6:  { icon: '💵', tip: "Palm Jumeirah from AED 2M. Business Bay from AED 800K. JVC from AED 450K for studios." },
  7:  { icon: '📅', tip: "Many developers offer 1% per month payment plans with 0% interest until handover." },
  8:  { icon: '🌊', tip: "Sea-view properties command a 15-25% premium. Burj Khalifa views add 10-15%." },
  9:  { icon: '⏰', tip: "Dubai's market peaks in Q1 and Q4. Acting in Q2/Q3 often gives better negotiation room." },
  10: { icon: '📋', tip: "The more detail you add here, the better we can tailor your shortlist." },
  11: { icon: '🏙️', tip: "Dubai has over 200 nationalities. Our advisors speak Arabic, English, Hindi and Russian." },
  12: { icon: '✅', tip: "Review your answers, generate your PDF, and email it directly to your broker in one click." },
};

export default function AISidebar({ step }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const tipData = STEP_TIPS[step];

  useEffect(() => {
    if (tipData) {
      setMessages([{ role: 'alex', text: tipData.tip }]);
    }
  }, [step]);

  async function ask() {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/intake/form/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, step }),
      });
      const data = await res.json();
      let text = data.answer || 'Let me look into that for you.';
      if (text.includes('401') || text.includes('authentication_error') || text.includes('invalid x-api-key')) {
        text = 'Yaso is offline — please add your Anthropic API key to the .env file and restart the backend.';
      }
      setMessages(prev => [...prev, { role: 'alex', text }]);
    } catch {
      setMessages(prev => [...prev, { role: 'alex', text: "I'm having trouble connecting right now. Please ask our team directly." }]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); }
  }

  if (step === 0) return null;

  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: '#F8FAFC',
      borderLeft: '1px solid #E5E7EB',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: NAVY,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: GOLD, flexShrink: 0,
        }}>A</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Yaso</div>
          <div style={{ fontSize: 11, color: '#10B981' }}>● Property Advisor</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: 12,
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            {m.role === 'alex' && (
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: NAVY, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10, fontWeight: 800,
                color: GOLD, flexShrink: 0, marginRight: 8, marginTop: 2,
              }}>A</div>
            )}
            <div style={{
              maxWidth: '82%',
              background: m.role === 'user' ? NAVY : '#fff',
              color: m.role === 'user' ? '#fff' : NAVY,
              border: m.role === 'user' ? 'none' : '1px solid #E5E7EB',
              borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              padding: '9px 12px', fontSize: 12, lineHeight: 1.55,
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: GOLD }}>A</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#94A3B8', animation: 'bounce 1.2s infinite', animationDelay: `${i*0.2}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #E5E7EB', background: '#fff' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask Yaso a question…"
            style={{
              flex: 1, padding: '9px 12px', border: '1.5px solid #E5E7EB',
              borderRadius: 10, fontSize: 12, outline: 'none',
              fontFamily: 'inherit', color: NAVY,
              background: '#fff',
            }}
          />
          <button onClick={ask} disabled={!input.trim() || loading} style={{
            width: 34, height: 34, borderRadius: '50%',
            background: !input.trim() || loading ? '#F1F5F9' : NAVY,
            border: 'none', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={!input.trim() || loading ? '#9CA3AF' : '#fff'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-4px);opacity:1} }
      `}</style>
    </div>
  );
}
