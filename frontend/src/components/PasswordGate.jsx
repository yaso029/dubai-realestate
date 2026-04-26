import { useState } from "react";
import "./PasswordGate.css";

const CORRECT = "Penta@2024$$";

export default function PasswordGate({ onUnlock }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (value === CORRECT) {
      onUnlock();
    } else {
      setError(true);
      setShaking(true);
      setValue("");
      setTimeout(() => setShaking(false), 600);
    }
  }

  return (
    <div className="gate">
      <div className="gate-glow" />

      <div className="gate-title">PENTA</div>
      <div className="gate-sub">Real Estate Intelligence</div>

      <form className={`gate-form ${shaking ? "shake" : ""}`} onSubmit={handleSubmit}>
        <input
          className={`gate-input ${error ? "gate-input-err" : ""}`}
          type="password"
          placeholder="Enter password"
          value={value}
          autoFocus
          onChange={(e) => { setValue(e.target.value); setError(false); }}
        />
        {error && <div className="gate-error">Incorrect password</div>}
        <button type="submit" className="gate-btn">Access Platform</button>
      </form>
    </div>
  );
}
