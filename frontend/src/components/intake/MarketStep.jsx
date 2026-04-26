import { NAVY, GOLD, BORDER, BackBtn, NextBtn, StepTitle } from './ui';

const OPTIONS = [
  {
    value: 'offplan',
    icon: '🏗️',
    label: 'Off-Plan',
    description: 'Buy direct from developer. Flexible payment plans. Lower entry price.',
  },
  {
    value: 'ready',
    icon: '🏠',
    label: 'Ready / Secondary',
    description: 'Move in immediately. Established communities. Full transparency.',
  },
  {
    value: 'both',
    icon: '🔍',
    label: 'Open to Both',
    description: 'Show me all options — I want to compare and decide.',
  },
];

export default function MarketStep({ data, update, onNext, onBack }) {
  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <BackBtn onClick={onBack} />
      <StepTitle
        title="Off-plan or ready market?"
        subtitle="This determines which listings and developers we'll show you."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {OPTIONS.map(opt => {
          const sel = data.marketPreference === opt.value;
          return (
            <div key={opt.value} onClick={() => update({ marketPreference: opt.value })} style={{
              border: `2px solid ${sel ? GOLD : BORDER}`,
              borderRadius: 14, padding: '18px 22px',
              background: sel ? NAVY : '#fff',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 16,
              position: 'relative',
            }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{opt.icon}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: sel ? '#fff' : NAVY, marginBottom: 4 }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 13, color: sel ? '#CBD5E1' : '#6B7280', lineHeight: 1.5 }}>
                  {opt.description}
                </div>
              </div>
              {sel && (
                <div style={{ position: 'absolute', right: 18, color: GOLD, fontSize: 18, fontWeight: 900 }}>✓</div>
              )}
            </div>
          );
        })}
      </div>

      <NextBtn onClick={onNext} disabled={!data.marketPreference} />
    </div>
  );
}
