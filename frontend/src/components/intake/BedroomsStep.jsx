import { BackBtn, NextBtn, StepTitle, Pill } from './ui';

const OPTIONS = ['Studio', '1 BR', '2 BR', '3 BR', '4 BR', '5+ BR'];

export default function BedroomsStep({ data, update, onNext, onBack }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <BackBtn onClick={onBack} />
      <StepTitle
        title="How many bedrooms?"
        subtitle="Select the size that best fits your needs."
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {OPTIONS.map(opt => (
          <Pill
            key={opt}
            label={opt}
            selected={data.bedrooms === opt}
            onClick={() => update({ bedrooms: opt })}
          />
        ))}
      </div>

      <NextBtn onClick={onNext} disabled={!data.bedrooms} />
    </div>
  );
}
