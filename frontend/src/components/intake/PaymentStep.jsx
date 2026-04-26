import { NAVY, GOLD, BORDER, BackBtn, NextBtn, StepTitle, YesNoToggle, FieldLabel, TextInput, Pill } from './ui';

const METHODS = [
  { value: 'cash', icon: '💵', label: 'Cash Buyer', description: 'Full payment upfront' },
  { value: 'mortgage', icon: '🏦', label: 'Mortgage', description: 'Bank financed purchase' },
  { value: 'payment_plan', icon: '📅', label: 'Developer Payment Plan', description: 'Off-plan installment plan' },
  { value: 'unsure', icon: '🤔', label: 'Not Sure Yet', description: "I'd like to explore my options" },
];

const DOWN_PAYMENTS = ['10%', '20%', '30%', '40%', '50%+'];

export default function PaymentStep({ data, update, onNext, onBack }) {
  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <BackBtn onClick={onBack} />
      <StepTitle
        title="How will you finance the purchase?"
        subtitle="This helps us show you the most suitable payment options."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {METHODS.map(m => {
          const sel = data.paymentMethod === m.value;
          return (
            <div key={m.value} onClick={() => update({ paymentMethod: m.value })} style={{
              border: `2px solid ${sel ? GOLD : BORDER}`,
              borderRadius: 12, padding: '16px 20px',
              background: sel ? NAVY : '#fff',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 14, position: 'relative',
            }}>
              <span style={{ fontSize: 24 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: sel ? '#fff' : NAVY }}>{m.label}</div>
                <div style={{ fontSize: 12, color: sel ? '#CBD5E1' : '#6B7280' }}>{m.description}</div>
              </div>
              {sel && <div style={{ position: 'absolute', right: 16, color: GOLD, fontSize: 18, fontWeight: 900 }}>✓</div>}
            </div>
          );
        })}
      </div>

      {/* Mortgage conditional */}
      {data.paymentMethod === 'mortgage' && (
        <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 20, marginBottom: 20, animation: 'fadeUp 0.25s ease' }}>
          <div style={{ marginBottom: 16 }}>
            <FieldLabel>Are you pre-approved for a mortgage?</FieldLabel>
            <YesNoToggle value={data.mortgagePreapproved} onChange={v => update({ mortgagePreapproved: v })} />
          </div>
          {data.mortgagePreapproved && (
            <div>
              <FieldLabel>Approximate pre-approval amount (AED)</FieldLabel>
              <TextInput
                value={data.preapprovalAmount}
                onChange={v => update({ preapprovalAmount: v })}
                placeholder="e.g. 2,500,000"
              />
            </div>
          )}
        </div>
      )}

      {/* Payment plan conditional */}
      {data.paymentMethod === 'payment_plan' && (
        <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 20, marginBottom: 20, animation: 'fadeUp 0.25s ease' }}>
          <FieldLabel>Down payment available</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
            {DOWN_PAYMENTS.map(dp => (
              <Pill key={dp} label={dp} selected={data.downPaymentPct === dp} onClick={() => update({ downPaymentPct: dp })} />
            ))}
          </div>
        </div>
      )}

      <NextBtn onClick={onNext} disabled={!data.paymentMethod} />
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
