import { BackBtn, NextBtn, StepTitle, ToggleCard } from './ui';

const TYPES = [
  { value: 'apartment', icon: '🏢', label: 'Apartment', description: 'Unit in a residential tower' },
  { value: 'villa', icon: '🏡', label: 'Villa', description: 'Standalone home with garden' },
  { value: 'townhouse', icon: '🏘️', label: 'Townhouse', description: 'Multi-floor row home' },
  { value: 'penthouse', icon: '👑', label: 'Penthouse', description: 'Top-floor luxury unit' },
];

export default function PropertyTypeStep({ data, update, onNext, onBack }) {
  function toggle(val) {
    const current = data.propertyTypes;
    update({
      propertyTypes: current.includes(val)
        ? current.filter(t => t !== val)
        : [...current, val],
    });
  }

  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <BackBtn onClick={onBack} />
      <StepTitle
        title="What type of property?"
        subtitle="You can select more than one option."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {TYPES.map(t => (
          <ToggleCard
            key={t.value}
            icon={t.icon}
            label={t.label}
            description={t.description}
            selected={data.propertyTypes.includes(t.value)}
            onClick={() => toggle(t.value)}
          />
        ))}
      </div>

      <NextBtn onClick={onNext} disabled={data.propertyTypes.length === 0} />
    </div>
  );
}
