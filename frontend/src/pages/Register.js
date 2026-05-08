import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Register.css";
import bgImage from "../assets/BG1.png";

const API = axios.create({ baseURL: "http://localhost:5000" });

// ── Floating particles ────────────────────────────────────────────────────────
function Particle({ style }) {
  return <div className="rp-particle" style={style} />;
}

// ── Animated grid ─────────────────────────────────────────────────────────────
function GridLines() {
  return (
    <div className="rp-grid" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rp-grid-v" style={{ left: `${(i + 1) * 12.5}%`, animationDelay: `${i * 0.15}s` }} />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rp-grid-h" style={{ top: `${(i + 1) * 16.66}%`, animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

// ── Password strength meter ───────────────────────────────────────────────────
function StrengthMeter({ password }) {
  const calc = (p) => {
    if (!p) return { score: 0, label: "", color: "transparent" };
    let s = 0;
    if (p.length >= 6)  s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    if (s <= 1) return { score: 1, label: "WEAK",   color: "#ff3b3b" };
    if (s <= 2) return { score: 2, label: "FAIR",   color: "#ffd700" };
    if (s <= 3) return { score: 3, label: "GOOD",   color: "#00e5ff" };
    return              { score: 4, label: "STRONG", color: "#39ff14" };
  };
  const { score, label, color } = calc(password);
  if (!password) return null;
  return (
    <div className="rp-strength">
      <div className="rp-strength-bars">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rp-strength-seg"
            style={{ background: i <= score ? color : "rgba(255,255,255,.07)", boxShadow: i <= score ? `0 0 8px ${color}60` : "none" }} />
        ))}
      </div>
      <span className="rp-strength-label" style={{ color }}>{label}</span>
    </div>
  );
}

function Register() {
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);
  const [focused,    setFocused]    = useState(null);
  const [showPass,   setShowPass]   = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [glitch,     setGlitch]     = useState(false);
  const [step,       setStep]       = useState(0); // for staggered intro

  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      style: {
        left:              `${Math.random() * 100}%`,
        top:               `${Math.random() * 100}%`,
        width:             `${2 + Math.random() * 3}px`,
        height:            `${2 + Math.random() * 3}px`,
        animationDuration: `${4 + Math.random() * 6}s`,
        animationDelay:    `${Math.random() * 4}s`,
        opacity:           0.15 + Math.random() * 0.35,
      },
    }))
  );

  useEffect(() => {
    const t = setTimeout(() => setStep(1), 100);
    const g = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 300); }, 5000);
    return () => { clearTimeout(t); clearInterval(g); };
  }, []);

  const validate = () => {
    if (!email)    { setError("Email is required."); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Enter a valid email."); return false; }
    if (!password) { setError("Password is required."); return false; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return false; }
    if (password !== confirm) { setError("Passwords do not match."); return false; }
    return true;
  };

  const handleRegister = async () => {
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await API.post("/api/auth/register", { email, password });
      setSuccess(true);
      setTimeout(() => (window.location.href = "/"), 2000);
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed. Try again.");
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleRegister(); };

  const passwordsMatch = confirm && password === confirm;
  const passwordMismatch = confirm && password !== confirm;

  return (
    <div className="rp-root" style={{ backgroundImage: `url(${bgImage})` }}>
      <div className="rp-overlay" />
      <GridLines />
      {particles.map(p => <Particle key={p.id} style={p.style} />)}
      <div className="rp-glow-orb rp-orb1" />
      <div className="rp-glow-orb rp-orb2" />
      <div className="rp-glow-orb rp-orb3" />

      {/* ── CARD ── */}
      <div className={`rp-card ${step ? "rp-card-visible" : ""}`}>
        <div className="rp-scan" />
        <div className="rp-corner rp-tl" /><div className="rp-corner rp-tr" />
        <div className="rp-corner rp-bl" /><div className="rp-corner rp-br" />

        {/* ── Brand ── */}
        <div className="rp-brand">
          <div className="rp-logo-wrap">
            <div className="rp-ring rp-ring1" />
            <div className="rp-ring rp-ring2" />
            <div className="rp-logo-core">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="#39ff14">
                <path d="M13 2L5 14h6l-1 8 8-12h-5z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className={`rp-title ${glitch ? "rp-glitch" : ""}`} data-text="POWERGRID">POWERGRID</h1>
            <p className="rp-subtitle">CREATE YOUR ACCESS NODE</p>
          </div>
        </div>

        {/* ── Progress dots ── */}
        <div className="rp-progress">
          {["EMAIL", "PASSWORD", "CONFIRM"].map((lbl, i) => {
            const done = (i === 0 && email) || (i === 1 && password) || (i === 2 && passwordsMatch);
            const active = (i === 0 && !email) || (i === 1 && email && !password) || (i === 2 && password && !passwordsMatch);
            return (
              <div key={i} className="rp-prog-item">
                <div className={`rp-prog-dot ${done ? "rp-prog-done" : active ? "rp-prog-active" : ""}`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`rp-prog-label ${done ? "rp-prog-done-txt" : active ? "rp-prog-active-txt" : ""}`}>{lbl}</span>
              </div>
            );
          })}
          <div className="rp-prog-line" />
        </div>

        {/* ── Divider ── */}
        <div className="rp-divider">
          <span className="rp-divider-line" />
          <span className="rp-divider-label">SECURE REGISTRATION</span>
          <span className="rp-divider-line" />
        </div>

        {/* ── Success state ── */}
        {success ? (
          <div className="rp-success">
            <div className="rp-success-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#39ff14" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div className="rp-success-title">ACCESS GRANTED</div>
            <div className="rp-success-sub">Redirecting to login...</div>
            <div className="rp-success-bar"><div className="rp-success-bar-fill" /></div>
          </div>
        ) : (
          <>
            {/* ── Error ── */}
            {error && (
              <div className="rp-error">
                <span>⚠</span> {error}
              </div>
            )}

            {/* ── Email ── */}
            <div className={`rp-field ${focused === "email" ? "rp-field-focus" : ""}`}>
              <label className="rp-label">EMAIL ADDRESS</label>
              <div className="rp-input-wrap">
                <span className="rp-field-icon">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
                  </svg>
                </span>
                <input type="email" placeholder="user@grid.io" className="rp-input"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  onKeyDown={handleKeyDown}
                  autoComplete="email"
                />
                {email && /\S+@\S+\.\S+/.test(email) && (
                  <span className="rp-valid-icon">✓</span>
                )}
                <span className="rp-field-bar" />
              </div>
            </div>

            {/* ── Password ── */}
            <div className={`rp-field ${focused === "password" ? "rp-field-focus" : ""}`}>
              <label className="rp-label">PASSWORD</label>
              <div className="rp-input-wrap">
                <span className="rp-field-icon">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </span>
                <input type={showPass ? "text" : "password"} placeholder="Min. 6 characters" className="rp-input"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  onKeyDown={handleKeyDown}
                  autoComplete="new-password"
                />
                <button type="button" className="rp-eye-btn" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                  {showPass
                    ? <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
                <span className="rp-field-bar" />
              </div>
              <StrengthMeter password={password} />
            </div>

            {/* ── Confirm Password ── */}
            <div className={`rp-field ${focused === "confirm" ? "rp-field-focus" : ""} ${passwordMismatch ? "rp-field-error" : ""} ${passwordsMatch ? "rp-field-ok" : ""}`}>
              <label className="rp-label">CONFIRM PASSWORD</label>
              <div className="rp-input-wrap">
                <span className="rp-field-icon">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </span>
                <input type={showConf ? "text" : "password"} placeholder="Repeat password" className="rp-input"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(""); }}
                  onFocus={() => setFocused("confirm")}
                  onBlur={() => setFocused(null)}
                  onKeyDown={handleKeyDown}
                  autoComplete="new-password"
                />
                <button type="button" className="rp-eye-btn" onClick={() => setShowConf(s => !s)} tabIndex={-1}>
                  {showConf
                    ? <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
                {passwordsMatch   && <span className="rp-valid-icon rp-match">✓</span>}
                {passwordMismatch && <span className="rp-valid-icon rp-nomatch">✗</span>}
                <span className="rp-field-bar" />
              </div>
            </div>

            {/* ── Register button ── */}
            <button
              className={`rp-btn ${loading ? "rp-btn-loading" : ""}`}
              onClick={handleRegister}
              disabled={loading}
            >
              <span className="rp-btn-inner">
                {loading ? (
                  <><span className="rp-spinner" /> CREATING NODE...</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#39ff14">
                      <path d="M13 2L5 14h6l-1 8 8-12h-5z" />
                    </svg>
                    INITIALIZE ACCOUNT
                  </>
                )}
              </span>
              <span className="rp-btn-glow" />
            </button>

            {/* ── Login link ── */}
            <div className="rp-footer">
              <span className="rp-footer-text">Already have access?</span>
              <button className="rp-login-link" onClick={() => (window.location.href = "/")}>
                LOGIN →
              </button>
            </div>
          </>
        )}

        {/* ── Status bar ── */}
        <div className="rp-statusbar">
          <span className="rp-status-dot" />
          <span>SYSTEM ONLINE</span>
          <span className="rp-status-sep">|</span>
          <span>v2.0</span>
          <span className="rp-status-sep">|</span>
          <span>ENCRYPTED</span>
        </div>
      </div>
    </div>
  );
}

export default Register;