import { NAVY, BORDER, BackBtn, NextBtn, StepTitle } from './ui';

export default function NotesStep({ data, update, onNext, onBack }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <BackBtn onClick={onBack} />
      <StepTitle
        title="Anything else we should know?"
        subtitle="Add any specific requirements, preferences, or questions for our team."
      />

      <textarea
        value={data.additionalNotes}
        onChange={e => update({ additionalNotes: e.target.value })}
        placeholder="e.g. Close to a specific school, near the metro, high floor preference, specific developer in mind, investment for my kids, relocating from London in September..."
        rows={6}
        style={{
          width: '100%', padding: '14px 16px',
          border: `1.5px solid ${BORDER}`,
          borderRadius: 12, resize: 'vertical',
          fontSize: 14, color: NAVY, lineHeight: 1.65,
          outline: 'none', boxSizing: 'border-box',
          fontFamily: 'inherit', background: '#fff',
        }}
        onFocus={e => { e.target.style.borderColor = '#C9A84C'; }}
        onBlur={e => { e.target.style.borderColor = BORDER; }}
      />

      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
        Optional — you can skip this step
      </div>

      <NextBtn onClick={onNext} label="Review My Answers →" />
    </div>
  );
}
