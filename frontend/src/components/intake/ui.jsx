// Shared design tokens and primitive UI components for the intake form

export const NAVY = '#111111';
export const GOLD = '#111111';
export const GOLD_LIGHT = '#F5F5F5';
export const BORDER = '#D1D5DB';
export const GREY = '#F9F9F9';

export function formatBudget(val) {
  if (val >= 1_000_000) {
    const m = val / 1_000_000;
    return `AED ${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  if (val >= 1_000) return `AED ${(val / 1_000).toFixed(0)}K`;
  return `AED ${val.toLocaleString()}`;
}

export function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', color: '#6B7280',
      fontSize: 14, cursor: 'pointer', marginBottom: 28,
      display: 'flex', alignItems: 'center', gap: 6,
      padding: 0, fontWeight: 500, fontFamily: 'inherit',
    }}>
      ← Back
    </button>
  );
}

export function NextBtn({ onClick, disabled, label = 'Continue →', fullWidth }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '14px 40px',
      background: disabled ? '#E5E7EB' : NAVY,
      color: disabled ? '#9CA3AF' : '#fff',
      border: 'none', borderRadius: 12,
      fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s',
      marginTop: 40,
      width: fullWidth ? '100%' : undefined,
      fontFamily: 'inherit',
    }}>
      {label}
    </button>
  );
}

export function ToggleCard({ icon, label, description, selected, onClick, small }) {
  return (
    <div onClick={onClick} style={{
      border: `2px solid ${selected ? '#000' : BORDER}`,
      borderRadius: 14,
      padding: small ? '14px 16px' : '20px 24px',
      background: selected ? '#000' : '#fff',
      cursor: 'pointer',
      transition: 'all 0.15s',
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative',
    }}>
      {icon && <div style={{ fontSize: small ? 22 : 28 }}>{icon}</div>}
      <div style={{ fontSize: small ? 14 : 16, fontWeight: 700, color: selected ? '#fff' : NAVY }}>
        {label}
      </div>
      {description && (
        <div style={{ fontSize: 12, color: selected ? '#CBD5E1' : '#6B7280', lineHeight: 1.5 }}>
          {description}
        </div>
      )}
      {selected && (
        <div style={{
          position: 'absolute', top: 10, right: 12,
          color: '#fff', fontSize: 16, fontWeight: 900,
        }}>✓</div>
      )}
    </div>
  );
}

export function Pill({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 22px',
      border: `2px solid ${selected ? '#000' : BORDER}`,
      borderRadius: 100,
      background: selected ? '#000' : '#fff',
      color: selected ? '#fff' : NAVY,
      fontSize: 14, fontWeight: 600, cursor: 'pointer',
      transition: 'all 0.15s', fontFamily: 'inherit',
    }}>
      {label}
    </button>
  );
}

export function YesNoToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {['Yes', 'No'].map(opt => (
        <button key={opt} onClick={() => onChange(opt === 'Yes')} style={{
          padding: '10px 32px',
          border: `2px solid ${value === (opt === 'Yes') ? '#000' : BORDER}`,
          borderRadius: 10,
          background: value === (opt === 'Yes') ? '#000' : '#fff',
          color: value === (opt === 'Yes') ? '#fff' : NAVY,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s', fontFamily: 'inherit',
        }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

export function StepTitle({ title, subtitle }) {
  return (
    <>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: '0 0 8px', lineHeight: 1.2 }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: '#6B7280', margin: '0 0 32px', fontSize: 15, lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}
    </>
  );
}

export function FieldLabel({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
      {children}{required && <span style={{ color: GOLD, marginLeft: 3 }}>*</span>}
    </label>
  );
}

export function TextInput({ value, onChange, placeholder, type = 'text', prefix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${BORDER}`, borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
      {prefix && (
        <span style={{ padding: '0 12px', color: '#6B7280', fontSize: 14, fontWeight: 500, borderRight: `1px solid ${BORDER}`, lineHeight: '44px', whiteSpace: 'nowrap' }}>
          {prefix}
        </span>
      )}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, border: 'none', outline: 'none',
          padding: '12px 14px', fontSize: 14, color: NAVY,
          background: '#fff', fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

export function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      width: '100%', padding: '12px 14px',
      border: `1.5px solid ${BORDER}`, borderRadius: 10,
      background: '#fff', color: value ? NAVY : '#9CA3AF',
      fontSize: 14, outline: 'none', cursor: 'pointer',
      fontFamily: 'inherit', appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
    }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
