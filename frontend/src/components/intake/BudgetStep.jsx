import { useState } from 'react';
import { NAVY, GOLD, BORDER, BackBtn, NextBtn, StepTitle, formatBudget } from './ui';

const PRESETS = [
  { label: 'Under 1M', min: 300_000, max: 1_000_000 },
  { label: '1M – 2M', min: 1_000_000, max: 2_000_000 },
  { label: '2M – 5M', min: 2_000_000, max: 5_000_000 },
  { label: '5M – 10M', min: 5_000_000, max: 10_000_000 },
  { label: '10M+', min: 10_000_000, max: 50_000_000 },
];

const MIN_RANGE = 300_000;
const MAX_RANGE = 50_000_000;
const STEP = 100_000;

function DualSlider({ minVal, maxVal, onMinChange, onMaxChange }) {
  const minPct = ((minVal - MIN_RANGE) / (MAX_RANGE - MIN_RANGE)) * 100;
  const maxPct = ((maxVal - MIN_RANGE) / (MAX_RANGE - MIN_RANGE)) * 100;

  return (
    <div style={{ position: 'relative', height: 44, margin: '8px 0', userSelect: 'none' }}>
      {/* Track background */}
      <div style={{
        position: 'absolute', top: '50%', left: 0, right: 0,
        height: 6, background: '#E5E7EB', borderRadius: 3, transform: 'translateY(-50%)',
      }}>
        <div style={{
          position: 'absolute', height: '100%', borderRadius: 3,
          left: `${minPct}%`, width: `${maxPct - minPct}%`,
          background: GOLD,
        }} />
      </div>

      {/* Min thumb */}
      <div style={{
        position: 'absolute', top: '50%', left: `${minPct}%`,
        width: 22, height: 22, transform: 'translate(-50%, -50%)',
        background: '#fff', border: `3px solid ${GOLD}`,
        borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        pointerEvents: 'none',
      }} />

      {/* Max thumb */}
      <div style={{
        position: 'absolute', top: '50%', left: `${maxPct}%`,
        width: 22, height: 22, transform: 'translate(-50%, -50%)',
        background: '#fff', border: `3px solid ${GOLD}`,
        borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        pointerEvents: 'none',
      }} />

      {/* Min input */}
      <input type="range" min={MIN_RANGE} max={MAX_RANGE} step={STEP} value={minVal}
        onChange={e => {
          const v = Number(e.target.value);
          if (v < maxVal - STEP) onMinChange(v);
        }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: minVal > MAX_RANGE - (MAX_RANGE - MIN_RANGE) * 0.1 ? 5 : 3 }}
      />

      {/* Max input */}
      <input type="range" min={MIN_RANGE} max={MAX_RANGE} step={STEP} value={maxVal}
        onChange={e => {
          const v = Number(e.target.value);
          if (v > minVal + STEP) onMaxChange(v);
        }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 4 }}
      />
    </div>
  );
}

export default function BudgetStep({ data, update, onNext, onBack }) {
  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <BackBtn onClick={onBack} />
      <StepTitle
        title="What's your budget?"
        subtitle="Set your minimum and maximum to help us filter the best options."
      />

      {/* Budget display */}
      <div style={{
        background: NAVY, borderRadius: 14, padding: '20px 28px',
        textAlign: 'center', marginBottom: 32,
      }}>
        <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 6 }}>Selected Budget Range</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
          {formatBudget(data.budgetMin)} — {formatBudget(data.budgetMax)}
        </div>
      </div>

      <DualSlider
        minVal={data.budgetMin}
        maxVal={data.budgetMax}
        onMinChange={v => update({ budgetMin: v })}
        onMaxChange={v => update({ budgetMax: v })}
      />

      {/* Range labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 32 }}>
        <span>AED 300K</span>
        <span>AED 50M</span>
      </div>

      {/* Preset buttons */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 12 }}>Quick select:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map(p => {
            const active = data.budgetMin === p.min && data.budgetMax === p.max;
            return (
              <button key={p.label} onClick={() => update({ budgetMin: p.min, budgetMax: p.max })} style={{
                padding: '8px 16px',
                border: `2px solid ${active ? GOLD : BORDER}`,
                borderRadius: 8,
                background: active ? GOLD : '#fff',
                color: active ? '#fff' : NAVY,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <NextBtn onClick={onNext} />
    </div>
  );
}
