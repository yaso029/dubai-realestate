import { NAVY, GOLD, BORDER, BackBtn, NextBtn, StepTitle } from './ui';

const FEATURES = [
  { value: 'pool', icon: '🏊', label: 'Swimming Pool' },
  { value: 'gym', icon: '💪', label: 'Gym / Fitness' },
  { value: 'parking', icon: '🚗', label: 'Covered Parking' },
  { value: 'sea_view', icon: '🌊', label: 'Sea / Water View' },
  { value: 'burj_view', icon: '🗼', label: 'Burj Khalifa View' },
  { value: 'garden', icon: '🌿', label: 'Garden / Outdoor' },
  { value: 'maids_room', icon: '🛏️', label: "Maid's Room" },
  { value: 'wardrobes', icon: '👔', label: 'Built-in Wardrobes' },
  { value: 'balcony', icon: '🌅', label: 'Balcony / Terrace' },
  { value: 'pet_friendly', icon: '🐾', label: 'Pet Friendly' },
  { value: 'kids_play', icon: '🎡', label: 'Kids Play Area' },
  { value: 'smart_home', icon: '📱', label: 'Smart Home' },
  { value: 'security', icon: '🔒', label: '24hr Security' },
];

export default function FeaturesStep({ data, update, onNext, onBack }) {
  function toggle(val) {
    update({
      features: data.features.includes(val)
        ? data.features.filter(f => f !== val)
        : [...data.features, val],
    });
  }

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>
      <BackBtn onClick={onBack} />
      <StepTitle
        title="Must-have features"
        subtitle="Select all features that are important to you."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {FEATURES.map(f => {
          const sel = data.features.includes(f.value);
          return (
            <div key={f.value} onClick={() => toggle(f.value)} style={{
              border: `2px solid ${sel ? GOLD : BORDER}`,
              borderRadius: 12, padding: '14px 16px',
              background: sel ? NAVY : '#fff',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: sel ? '#fff' : NAVY, lineHeight: 1.3 }}>
                {f.label}
              </span>
            </div>
          );
        })}
      </div>

      {data.features.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 13, color: '#6B7280' }}>
          {data.features.length} feature{data.features.length > 1 ? 's' : ''} selected
        </div>
      )}

      <NextBtn onClick={onNext} label="Continue →" />
    </div>
  );
}
