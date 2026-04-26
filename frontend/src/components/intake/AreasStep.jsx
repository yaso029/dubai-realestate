import { NAVY, GOLD, BORDER, BackBtn, NextBtn, StepTitle } from './ui';

const AREAS = [
  'Downtown Dubai', 'Dubai Marina', 'Palm Jumeirah', 'Business Bay',
  'JVC', 'JVT', 'Dubai Hills', 'Arabian Ranches', 'Meydan',
  'Dubai Creek Harbour', 'Emaar Beachfront', 'MBR City',
  'DIFC', 'Jumeirah', 'Al Barsha', 'Sports City', 'Motor City',
  'Dubai South', 'Damac Hills', 'Tilal Al Ghaf',
];

export default function AreasStep({ data, update, onNext, onBack }) {
  function toggle(area) {
    update({
      areas: data.areas.includes(area)
        ? data.areas.filter(a => a !== area)
        : [...data.areas, area],
    });
  }

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>
      <BackBtn onClick={onBack} />
      <StepTitle
        title="Preferred areas in Dubai"
        subtitle="Select all communities you're interested in. You can choose multiple."
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {AREAS.map(area => {
          const sel = data.areas.includes(area);
          return (
            <button key={area} onClick={() => toggle(area)} style={{
              padding: '9px 18px',
              border: `2px solid ${sel ? GOLD : BORDER}`,
              borderRadius: 100,
              background: sel ? NAVY : '#fff',
              color: sel ? '#fff' : NAVY,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}>
              {sel && '✓ '}{area}
            </button>
          );
        })}
      </div>

      {data.areas.length > 0 && (
        <div style={{ marginTop: 20, fontSize: 13, color: '#6B7280' }}>
          {data.areas.length} area{data.areas.length > 1 ? 's' : ''} selected
        </div>
      )}

      <NextBtn onClick={onNext} disabled={data.areas.length === 0} />
    </div>
  );
}
