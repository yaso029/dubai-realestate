import { useState, useEffect, useCallback } from 'react';
import { NAVY, GOLD } from './intake/ui';
import WelcomeStep from './intake/WelcomeStep';
import ContactStep from './intake/ContactStep';
import PurposeStep from './intake/PurposeStep';
import PropertyTypeStep from './intake/PropertyTypeStep';
import BedroomsStep from './intake/BedroomsStep';
import AreasStep from './intake/AreasStep';
import MarketStep from './intake/MarketStep';
import BudgetStep from './intake/BudgetStep';
import PaymentStep from './intake/PaymentStep';
import FeaturesStep from './intake/FeaturesStep';
import TimelineStep from './intake/TimelineStep';
import NotesStep from './intake/NotesStep';
import ReviewStep from './intake/ReviewStep';
import AISidebar from './intake/AISidebar';

const INITIAL_DATA = {
  language: 'en',
  fullName: '', whatsapp: '', email: '', nationality: '', inDubai: null,
  purpose: null, investmentGoal: null, residenceType: null,
  propertyTypes: [], bedrooms: null,
  areas: [],
  marketPreference: null,
  budgetMin: 1_000_000, budgetMax: 5_000_000,
  paymentMethod: null, mortgagePreapproved: null, preapprovalAmount: '', downPaymentPct: null,
  features: [],
  timeline: null, viewedProperties: null, otherBrokers: null,
  additionalNotes: '',
};

const STEP_NAMES = [
  'welcome', 'purpose', 'propertyType', 'bedrooms', 'areas',
  'market', 'budget', 'payment', 'features', 'timeline', 'notes', 'contact', 'review',
];
const TOTAL_STEPS = 11; // steps 1–11

export default function ClientIntakeTab() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('propiq-intake-v3');
      return saved ? { ...INITIAL_DATA, ...JSON.parse(saved) } : INITIAL_DATA;
    } catch { return INITIAL_DATA; }
  });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    if (step > 0) localStorage.setItem('propiq-intake-v3', JSON.stringify(data));
  }, [data, step]);

  const update = useCallback(fields => setData(prev => ({ ...prev, ...fields })), []);

  function next() { setStep(s => Math.min(s + 1, STEP_NAMES.length - 1)); }
  function back() { setStep(s => Math.max(0, s - 1)); }
  function goTo(s) { setStep(s); }

  async function generateReport() {
    setGenerating(true);
    setGenError(null);
    try {
      const saveRes = await fetch('http://localhost:8000/intake/form/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_data: data }),
      });
      if (!saveRes.ok) throw new Error('Failed to save form data');
      const { session_id } = await saveRes.json();

      const pdfRes = await fetch('http://localhost:8000/intake/form/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id }),
      });
      if (!pdfRes.ok) throw new Error('PDF generation failed');

      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const name = data.fullName.replace(/\s+/g, '_') || 'Client';
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href = url;
      a.download = `PROPIQ_Intake_${name}_${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      localStorage.removeItem('propiq-intake-v3');
    } catch (e) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  const progressPct = step === 0 ? 0 : step >= 12 ? 100 : Math.round((step / TOTAL_STEPS) * 100);
  const stepProps = { data, update, onNext: next, onBack: back, onGoTo: goTo };
  const isWelcome = step === 0;

  // Welcome — full width, light standalone card
  if (isWelcome) {
    return (
      <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <WelcomeStep
          onStart={next}
          language={data.language}
          onLanguage={lang => update({ language: lang })}
        />
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex', height: 'calc(100vh - 175px)',
      background: '#fff', borderRadius: 16, overflow: 'hidden',
      border: '1px solid #E5E7EB',
    }}>
      {/* Main form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Progress bar */}
        <div style={{ padding: '16px 32px 0', background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>
              {step < 12 ? `Step ${step} of ${TOTAL_STEPS}` : '✓ Review & Confirm'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>
                {step >= 12 ? '100%' : `${progressPct}%`}
              </span>
              <button onClick={() => { setStep(0); }} style={{
                fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                ✕ Restart
              </button>
            </div>
          </div>
          <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, marginBottom: 16 }}>
            <div style={{
              height: '100%',
              width: `${step >= 12 ? 100 : progressPct}%`,
              background: `linear-gradient(90deg, ${GOLD}, #E8C15A)`,
              borderRadius: 2, transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Step content with fade animation */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
          <div key={step} style={{ animation: 'fadeSlide 0.3s ease' }}>
            {step === 1 && <PurposeStep {...stepProps} />}
            {step === 2 && <PropertyTypeStep {...stepProps} />}
            {step === 3 && <BedroomsStep {...stepProps} />}
            {step === 4 && <AreasStep {...stepProps} />}
            {step === 5 && <MarketStep {...stepProps} />}
            {step === 6 && <BudgetStep {...stepProps} />}
            {step === 7 && <PaymentStep {...stepProps} />}
            {step === 8 && <FeaturesStep {...stepProps} />}
            {step === 9 && <TimelineStep {...stepProps} />}
            {step === 10 && <NotesStep {...stepProps} />}
            {step === 11 && <ContactStep {...stepProps} />}
            {step === 12 && (
              <>
                <ReviewStep {...stepProps} onGenerate={generateReport} generating={generating} />
                {genError && (
                  <div style={{
                    marginTop: 16, padding: '12px 20px',
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    borderRadius: 10, fontSize: 13, color: '#DC2626', textAlign: 'center',
                  }}>
                    {genError} — make sure the backend is running.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Sidebar */}
      <AISidebar step={step} stepName={STEP_NAMES[step]} data={data} />

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
