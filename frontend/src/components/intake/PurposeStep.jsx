import { NAVY, BackBtn, NextBtn, StepTitle, ToggleCard } from './ui';

const PURPOSE_OPTS = [
  { value: 'investment', icon: '📈', label: 'Investment', description: 'Buy to earn rental income or capital growth' },
  { value: 'end_user', icon: '🏠', label: 'Personal Use', description: 'Buy to live in the property yourself' },
];

const INVESTMENT_OPTS = [
  { value: 'rental_yield', icon: '🔑', label: 'Rental Yield', description: 'Steady monthly rental income' },
  { value: 'capital', icon: '📊', label: 'Capital Appreciation', description: 'Buy now, sell higher later' },
  { value: 'both', icon: '⭐', label: 'Both', description: 'Rental income + long-term growth' },
];

const RESIDENCE_OPTS = [
  { value: 'primary', icon: '🏡', label: 'Primary Residence', description: 'My main home in Dubai' },
  { value: 'holiday', icon: '☀️', label: 'Holiday Home', description: 'Use occasionally, rent when away' },
];

export default function PurposeStep({ data, update, onNext, onBack }) {
  const canProceed = data.purpose &&
    (data.purpose === 'investment' ? !!data.investmentGoal : !!data.residenceType);

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <BackBtn onClick={onBack} />
      <StepTitle
        title="What's your purchase purpose?"
        subtitle="This helps us recommend the right type of property and communities for you."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        {PURPOSE_OPTS.map(opt => (
          <ToggleCard
            key={opt.value}
            icon={opt.icon}
            label={opt.label}
            description={opt.description}
            selected={data.purpose === opt.value}
            onClick={() => update({ purpose: opt.value, investmentGoal: null, residenceType: null })}
          />
        ))}
      </div>

      {data.purpose === 'investment' && (
        <div style={{ animation: 'fadeUp 0.25s ease' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 16 }}>
            What's your investment goal?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {INVESTMENT_OPTS.map(opt => (
              <ToggleCard
                key={opt.value}
                icon={opt.icon}
                label={opt.label}
                description={opt.description}
                selected={data.investmentGoal === opt.value}
                onClick={() => update({ investmentGoal: opt.value })}
                small
              />
            ))}
          </div>
        </div>
      )}

      {data.purpose === 'end_user' && (
        <div style={{ animation: 'fadeUp 0.25s ease' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 16 }}>
            What type of residence?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {RESIDENCE_OPTS.map(opt => (
              <ToggleCard
                key={opt.value}
                icon={opt.icon}
                label={opt.label}
                description={opt.description}
                selected={data.residenceType === opt.value}
                onClick={() => update({ residenceType: opt.value })}
              />
            ))}
          </div>
        </div>
      )}

      <NextBtn onClick={onNext} disabled={!canProceed} />
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
