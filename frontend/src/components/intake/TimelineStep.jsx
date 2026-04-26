import { NAVY, GOLD, BORDER, BackBtn, NextBtn, StepTitle, FieldLabel, YesNoToggle } from './ui';

const TIMELINES = [
  { value: 'immediate', label: '⚡ Immediately', sub: 'Within 1 month' },
  { value: '3months', label: '📅 Within 3 Months', sub: 'Ready to move fast' },
  { value: '6months', label: '🗓️ Within 6 Months', sub: 'Taking my time' },
  { value: '1year', label: '📆 Within 1 Year', sub: 'Still researching' },
  { value: 'exploring', label: '🔍 Just Exploring', sub: 'No fixed timeline yet' },
];

export default function TimelineStep({ data, update, onNext, onBack }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <BackBtn onClick={onBack} />
      <StepTitle
        title="When are you looking to buy?"
        subtitle="This helps us prioritise the right options and developers for you."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {TIMELINES.map(t => {
          const sel = data.timeline === t.value;
          return (
            <div key={t.value} onClick={() => update({ timeline: t.value })} style={{
              border: `2px solid ${sel ? GOLD : BORDER}`,
              borderRadius: 12, padding: '14px 20px',
              background: sel ? NAVY : '#fff',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: sel ? '#fff' : NAVY }}>{t.label}</div>
                <div style={{ fontSize: 12, color: sel ? '#CBD5E1' : '#9CA3AF', marginTop: 2 }}>{t.sub}</div>
              </div>
              {sel && <div style={{ color: GOLD, fontSize: 18, fontWeight: 900 }}>✓</div>}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <FieldLabel>Have you viewed properties already?</FieldLabel>
          <YesNoToggle value={data.viewedProperties} onChange={v => update({ viewedProperties: v })} />
        </div>
        <div>
          <FieldLabel>Are you working with other brokers?</FieldLabel>
          <YesNoToggle value={data.otherBrokers} onChange={v => update({ otherBrokers: v })} />
        </div>
      </div>

      <NextBtn onClick={onNext} disabled={!data.timeline} />
    </div>
  );
}
