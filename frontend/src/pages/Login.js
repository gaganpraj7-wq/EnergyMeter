import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Login.css";
import bgImage from "../assets/BG1.png";

const API = axios.create({ baseURL: "http://localhost:5000" });

// ── Animated electricity bolt SVG paths ──────────────────────────────────────
const BOLTS = [
  "M12 2L4 14h7l-2 8 9-12h-6z",
  "M13 2L5 14h6l-1 8 8-12h-5z",
  "M11 2L3 14h7l-3 8 10-12h-6z",
];

// ── Floating particle component ───────────────────────────────────────────────
function Particle({ style }) {
  return <div className="lp-particle" style={style} />;
}

// ── Animated grid lines ───────────────────────────────────────────────────────
function GridLines() {
  return (
    <div className="lp-grid" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="lp-grid-line lp-grid-v" style={{ left: `${(i + 1) * 12.5}%`, animationDelay: `${i * 0.15}s` }} />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="lp-grid-line lp-grid-h" style={{ top: `${(i + 1) * 16.66}%`, animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

// ── Volt meter bar ────────────────────────────────────────────────────────────
function VoltMeter({ active }) {
  const bars = 12;
  return (
    <div className="lp-voltmeter">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`lp-volt-bar ${active ? "lp-volt-active" : ""}`}
          style={{
            animationDelay: active ? `${i * 0.06}s` : "0s",
            background: i < 4 ? "#39ff14" : i < 8 ? "#ffd700" : "#ff3b3b",
          }}
        />
      ))}
    </div>
  );
}

function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [focused,  setFocused]  = useState(null); // "email" | "password"
  const [showPass, setShowPass] = useState(false);
  const [glitch,   setGlitch]   = useState(false);
  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      style: {
        left:             `${Math.random() * 100}%`,
        top:              `${Math.random() * 100}%`,
        width:            `${2 + Math.random() * 3}px`,
        height:           `${2 + Math.random() * 3}px`,
        animationDuration:`${4 + Math.random() * 6}s`,
        animationDelay:   `${Math.random() * 4}s`,
        opacity:          0.15 + Math.random() * 0.4,
      },
    }))
  );

  // Periodic glitch on the title
  useEffect(() => {
    const id = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 300);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError("All fields required."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/api/auth/login", { email, password });
      localStorage.setItem("token",  res.data.token);
      localStorage.setItem("userId", res.data.user.id);
      window.location.href = "/sockets";
    } catch {
      setError("Invalid credentials. Try again.");
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div
      className="lp-root"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Dark overlay */}
      <div className="lp-overlay" />

      {/* Grid */}
      <GridLines />

      {/* Particles */}
      {particles.map(p => <Particle key={p.id} style={p.style} />)}

      {/* Radial glow behind card */}
      <div className="lp-glow-orb lp-orb1" />
      <div className="lp-glow-orb lp-orb2" />

      {/* ── CARD ── */}
      <div className="lp-card">

        {/* Top edge scan line */}
        <div className="lp-scan" />

        {/* Corner brackets */}
        <div className="lp-corner lp-tl" /><div className="lp-corner lp-tr" />
        <div className="lp-corner lp-bl" /><div className="lp-corner lp-br" />

        {/* ── Logo / Brand ── */}
        <div className="lp-brand">
          <div className="lp-logo-wrap">
            <div className="lp-logo-ring lp-ring1" />
            <div className="lp-logo-ring lp-ring2" />
            <div className="lp-logo-core">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="#00e5ff">
                <path d={BOLTS[0]} />
              </svg>
            </div>
          </div>
          <div className="lp-brand-text">
            <h1 className={`lp-title ${glitch ? "lp-glitch" : ""}`} data-text="POWERGRID">
              POWERGRID
            </h1>
            <p className="lp-subtitle">ENERGY MONITORING SYSTEM</p>
          </div>
        </div>

        {/* ── Volt meter ── */}
        <VoltMeter active={loading} />

        {/* ── Divider ── */}
        <div className="lp-divider">
          <span className="lp-divider-line" />
          <span className="lp-divider-label">SECURE ACCESS</span>
          <span className="lp-divider-line" />
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="lp-error">
            <span>⚠</span> {error}
          </div>
        )}

        {/* ── Email field ── */}
        <div className={`lp-field ${focused === "email" ? "lp-field-focus" : ""}`}>
          <label className="lp-label">EMAIL ADDRESS</label>
          <div className="lp-input-wrap">
            <span className="lp-field-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
              </svg>
            </span>
            <input
              type="email"
              placeholder="user@grid.io"
              className="lp-input"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              onKeyDown={handleKeyDown}
              autoComplete="email"
            />
            <span className="lp-field-bar" />
          </div>
        </div>

        {/* ── Password field ── */}
        <div className={`lp-field ${focused === "password" ? "lp-field-focus" : ""}`}>
          <label className="lp-label">PASSWORD</label>
          <div className="lp-input-wrap">
            <span className="lp-field-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </span>
            <input
              type={showPass ? "text" : "password"}
              placeholder="••••••••••"
              className="lp-input"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="lp-eye-btn"
              onClick={() => setShowPass(s => !s)}
              tabIndex={-1}
            >
              {showPass ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
            <span className="lp-field-bar" />
          </div>
        </div>

        {/* ── Login button ── */}
        <button
          className={`lp-btn ${loading ? "lp-btn-loading" : ""}`}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <span className="lp-btn-inner">
              <span className="lp-spinner" />
              AUTHENTICATING...
            </span>
          ) : (
            <span className="lp-btn-inner">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#00e5ff">
                <path d={BOLTS[0]} />
              </svg>
              INITIALIZE SESSION
            </span>
          )}
          <span className="lp-btn-glow" />
        </button>

        {/* ── Register link ── */}
        <div className="lp-footer">
          <span className="lp-footer-text">No account?</span>
          <button
            className="lp-register-link"
            onClick={() => (window.location.href = "/register")}
          >
            CREATE ACCESS →
          </button>
        </div>

        {/* ── Status bar ── */}
        <div className="lp-statusbar">
          <span className="lp-status-dot" />
          <span>SYSTEM ONLINE</span>
          <span className="lp-status-sep">|</span>
          <span>v2.0</span>
          <span className="lp-status-sep">|</span>
          <span>ESP32 READY</span>
        </div>

      </div>
    </div>
  );
}

export default Login;