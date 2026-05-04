import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import IntroPage from './components/intake/IntroPage';
import ClientIntakeTab from './components/ClientIntakeTab';
import './index.css';

function IntakeApp() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {!started && <IntroPage onStart={() => setStarted(true)} />}
      {started && <ClientIntakeTab />}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode><IntakeApp /></StrictMode>
);
