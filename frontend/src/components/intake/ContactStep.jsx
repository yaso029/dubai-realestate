import { NAVY, GOLD, BackBtn, NextBtn, StepTitle, FieldLabel, TextInput, SelectInput, YesNoToggle } from './ui';

const NATIONALITIES = [
  { value: 'AE', label: '🇦🇪 United Arab Emirates' },
  { value: 'IN', label: '🇮🇳 India' },
  { value: 'PK', label: '🇵🇰 Pakistan' },
  { value: 'GB', label: '🇬🇧 United Kingdom' },
  { value: 'US', label: '🇺🇸 United States' },
  { value: 'RU', label: '🇷🇺 Russia' },
  { value: 'CN', label: '🇨🇳 China' },
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'DE', label: '🇩🇪 Germany' },
  { value: 'SA', label: '🇸🇦 Saudi Arabia' },
  { value: 'KW', label: '🇰🇼 Kuwait' },
  { value: 'BH', label: '🇧🇭 Bahrain' },
  { value: 'QA', label: '🇶🇦 Qatar' },
  { value: 'OM', label: '🇴🇲 Oman' },
  { value: 'EG', label: '🇪🇬 Egypt' },
  { value: 'LB', label: '🇱🇧 Lebanon' },
  { value: 'JO', label: '🇯🇴 Jordan' },
  { value: 'TR', label: '🇹🇷 Turkey' },
  { value: 'IR', label: '🇮🇷 Iran' },
  { value: 'PH', label: '🇵🇭 Philippines' },
  { value: 'NG', label: '🇳🇬 Nigeria' },
  { value: 'ZA', label: '🇿🇦 South Africa' },
  { value: 'CA', label: '🇨🇦 Canada' },
  { value: 'AU', label: '🇦🇺 Australia' },
  { value: 'IT', label: '🇮🇹 Italy' },
  { value: 'ES', label: '🇪🇸 Spain' },
  { value: 'NL', label: '🇳🇱 Netherlands' },
  { value: 'OTHER', label: '🌍 Other' },
];

export default function ContactStep({ data, update, onNext, onBack }) {
  const canProceed = data.fullName.trim() && data.whatsapp.trim();

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <BackBtn onClick={onBack} />
      <StepTitle
        title="Almost done — your contact details"
        subtitle="We'll use these to send your personalised property report and get in touch."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <FieldLabel required>Full Name</FieldLabel>
          <TextInput
            value={data.fullName}
            onChange={v => update({ fullName: v })}
            placeholder="e.g. Ahmed Al Mansouri"
          />
        </div>

        <div>
          <FieldLabel required>WhatsApp Number</FieldLabel>
          <TextInput
            value={data.whatsapp}
            onChange={v => update({ whatsapp: v })}
            placeholder="50 123 4567"
            type="tel"
            prefix="+971"
          />
        </div>

        <div>
          <FieldLabel>Email Address</FieldLabel>
          <TextInput
            value={data.email}
            onChange={v => update({ email: v })}
            placeholder="your@email.com"
            type="email"
          />
        </div>

        <div>
          <FieldLabel>Nationality</FieldLabel>
          <SelectInput
            value={data.nationality}
            onChange={v => update({ nationality: v })}
            options={NATIONALITIES}
            placeholder="Select your nationality"
          />
        </div>

        <div>
          <FieldLabel>Are you currently based in Dubai?</FieldLabel>
          <YesNoToggle value={data.inDubai} onChange={v => update({ inDubai: v })} />
        </div>
      </div>

      <NextBtn onClick={onNext} disabled={!canProceed} />
    </div>
  );
}
