// src/pages/SettingsPage.jsx — Profile only (tabs removed)
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T, GLOBAL_CSS } from "../theme";
import Sidebar from "../components/Sidebar";

function useGlobalStyles() {
  useEffect(() => {
    if (document.getElementById("pg-global-css")) return;
    const el = document.createElement("style");
    el.id = "pg-global-css";
    el.textContent =
      GLOBAL_CSS +
      `
      @keyframes pg-fadeSlideIn {
        from { opacity:0; transform:translateY(12px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes pg-toastIn  { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
      @keyframes pg-toastOut { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(40px)} }

      .pg-settings-input {
        width:100%; box-sizing:border-box;
        background:rgba(0,0,0,.45);
        border:1px solid rgba(0,229,255,.18);
        border-radius:7px; padding:11px 14px;
        color:#e2e8f0; font-family:'Share Tech Mono',monospace;
        font-size:14px; outline:none;
        transition:border-color .25s, box-shadow .25s;
      }
      .pg-settings-input:focus {
        border-color:rgba(0,229,255,.7);
        box-shadow:0 0 0 3px rgba(0,229,255,.08);
      }
      .pg-settings-input::placeholder { color:rgba(160,180,210,.35); }
      .pg-settings-input:disabled { opacity:.45; cursor:not-allowed; }

      .pg-btn-primary {
        display:inline-flex; align-items:center; justify-content:center; gap:8px;
        padding:10px 24px; background:rgba(0,229,255,.08);
        border:1px solid rgba(0,229,255,.55); border-radius:6px; color:#00e5ff;
        font-family:'Orbitron',monospace; font-size:10px; font-weight:700; letter-spacing:2px;
        cursor:pointer; transition:all .22s;
      }
      .pg-btn-primary:hover    { background:rgba(0,229,255,.17); box-shadow:0 0 18px rgba(0,229,255,.22); }
      .pg-btn-primary:disabled { opacity:.45; cursor:not-allowed; }

      .pg-btn-ghost {
        display:inline-flex; align-items:center; justify-content:center; gap:8px;
        padding:10px 20px; background:transparent;
        border:1px solid rgba(255,255,255,.12); border-radius:6px;
        color:rgba(160,180,210,.7); font-family:'Share Tech Mono',monospace;
        font-size:11px; letter-spacing:1px; cursor:pointer; transition:all .22s;
      }
      .pg-btn-ghost:hover { border-color:rgba(255,255,255,.28); color:#e2e8f0; }

      .pg-tag {
        display:inline-block; padding:2px 9px; border-radius:20px;
        font-size:9px; letter-spacing:1.5px; font-family:'Share Tech Mono',monospace;
      }

      .pg-section-card {
        background:rgba(8,14,28,.82); border:1px solid rgba(26,45,74,.9);
        border-radius:14px; overflow:hidden;
        animation: pg-fadeSlideIn .45s ease both;
      }

      .pg-section-header {
        padding:14px 22px; border-bottom:1px solid rgba(26,45,74,.9);
        background:rgba(4,8,18,.6); display:flex; align-items:center; gap:10px;
      }
      `;
    document.head.appendChild(el);
  }, []);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed", top:22, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding:"12px 18px", borderRadius:8, minWidth:240,
          background: t.type === "success" ? "rgba(57,255,20,.12)" : "rgba(255,59,59,.13)",
          border: `1px solid ${t.type === "success" ? "rgba(57,255,20,.5)" : "rgba(255,59,59,.5)"}`,
          color: t.type === "success" ? "#39ff14" : "#ff3b3b",
          fontFamily:"'Share Tech Mono',monospace", fontSize:12, letterSpacing:1,
          display:"flex", alignItems:"center", gap:10,
          animation:`${t.exiting ? "pg-toastOut" : "pg-toastIn"} .3s ease both`,
          backdropFilter:"blur(8px)",
        }}>
          <span>{t.type === "success" ? "✓" : "✕"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, color = T.accent }) {
  return (
    <div className="pg-section-header">
      <div style={{ width:32, height:32, borderRadius:8, background:`${color}18`, border:`1px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
        {icon}
      </div>
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, fontWeight:700, letterSpacing:3, color }}>
        {title}
      </div>
    </div>
  );
}

// ── Field label ───────────────────────────────────────────────────────────────
function FieldLabel({ children, required }) {
  return (
    <div style={{ fontSize:9, letterSpacing:2, color:"rgba(160,180,210,.6)", marginBottom:7, fontFamily:"'Share Tech Mono',monospace", display:"flex", gap:5 }}>
      {children}{required && <span style={{ color:"#ff3b3b" }}>*</span>}
    </div>
  );
}

// ── Password strength bar ─────────────────────────────────────────────────────
function StrengthBar({ password }) {
  const score  = [password.length>=8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password), password.length>=14].filter(Boolean).length;
  const colors = ["","#ff3b3b","#ff6b35","#ffd700","#39ff14","#00e5ff"];
  const labels = ["","WEAK","FAIR","GOOD","STRONG","EXCELLENT"];
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ display:"flex", gap:4, marginBottom:5 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ flex:1, height:3, borderRadius:2, background:i<=score?colors[score]:"rgba(255,255,255,.08)", transition:"background .4s", boxShadow:i<=score?`0 0 6px ${colors[score]}`:"none" }}/>
        ))}
      </div>
      <div style={{ fontSize:9, letterSpacing:2, color:colors[score], fontFamily:"'Orbitron',monospace" }}>{labels[score]}</div>
    </div>
  );
}

// ── Password section — standalone component (useState at top level) ───────────
function PasswordSection({ addToast }) {
  const [pw,     setPw]     = useState({ current:"", next:"", confirm:"" });
  const [showPw, setShowPw] = useState({ current:false, next:false, confirm:false });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!pw.current)             { addToast("CURRENT PASSWORD REQUIRED", "error"); return; }
    if (pw.next.length < 8)      { addToast("MIN 8 CHARACTERS REQUIRED", "error"); return; }
    if (pw.next !== pw.confirm)  { addToast("PASSWORDS DO NOT MATCH",    "error"); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    setPw({ current:"", next:"", confirm:"" });
    addToast("PASSWORD CHANGED SUCCESSFULLY", "success");
  };

  const FIELDS = [
    { field:"current", label:"CURRENT PASSWORD",     ph:"Enter current password"           },
    { field:"next",    label:"NEW PASSWORD",         ph:"Min 8 chars, uppercase + number"   },
    { field:"confirm", label:"CONFIRM NEW PASSWORD", ph:"Repeat new password"               },
  ];

  return (
    <div style={{ padding:"22px 24px", display:"flex", flexDirection:"column", gap:16 }}>
      {FIELDS.map(({ field, label, ph }) => (
        <div key={field}>
          <FieldLabel>{label}</FieldLabel>
          <div style={{ position:"relative" }}>
            <input className="pg-settings-input"
              type={showPw[field] ? "text" : "password"}
              value={pw[field]}
              onChange={e => setPw(p => ({ ...p, [field]: e.target.value }))}
              placeholder={ph}
              style={{ paddingRight:48 }}/>
            <button
              onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
              style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:14 }}>
              {showPw[field] ? "🙈" : "👁"}
            </button>
          </div>
          {field === "next" && pw.next && <StrengthBar password={pw.next}/>}
          {field === "confirm" && pw.confirm && (
            <div style={{ marginTop:5, fontSize:9, letterSpacing:1, fontFamily:"'Share Tech Mono',monospace", color:pw.next===pw.confirm?"#39ff14":"#ff3b3b" }}>
              {pw.next === pw.confirm ? "✓ PASSWORDS MATCH" : "✕ PASSWORDS DO NOT MATCH"}
            </div>
          )}
        </div>
      ))}

      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        <button className="pg-btn-primary" onClick={handleSave} disabled={saving}
          style={{ borderColor:"rgba(255,215,0,.5)", color:T.gold }}>
          {saving ? (
            <>
              <span className="pg-spin" style={{ width:11, height:11, border:"2px solid rgba(255,215,0,.2)", borderTopColor:T.gold, borderRadius:"50%", display:"inline-block" }}/>
              UPDATING…
            </>
          ) : "🔑 UPDATE PASSWORD"}
        </button>
        <button className="pg-btn-ghost" onClick={() => setPw({ current:"", next:"", confirm:"" })}>CLEAR</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  useGlobalStyles();
  const navigate = useNavigate();

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type, exiting:false }]);
    setTimeout(() => setToasts(p => p.map(t => t.id===id ? {...t,exiting:true} : t)), 2500);
    setTimeout(() => setToasts(p => p.filter(t => t.id!==id)), 2800);
  }, []);

  // ── Profile state ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    displayName: "Grid Operator",
    username:    "gridop_01",
    email:       "operator@powergrid.local",
    phone:       "",
    timezone:    "Asia/Kolkata",
    role:        "ADMIN",
    bio:         "",
  });
  const [saving,         setSaving]         = useState(false);
  const [avatarInitials, setAvatarInitials] = useState("GO");

  useEffect(() => {
    const parts = profile.displayName.trim().split(" ");
    setAvatarInitials(parts.map(p => p[0]).join("").toUpperCase().slice(0, 2) || "??");
  }, [profile.displayName]);

  const saveProfile = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    addToast("PROFILE UPDATED SUCCESSFULLY", "success");
  };

  const resetProfile = () => {
    setProfile({ displayName:"Grid Operator", username:"gridop_01", email:"operator@powergrid.local", phone:"", timezone:"Asia/Kolkata", role:"ADMIN", bio:"" });
    addToast("PROFILE RESET TO DEFAULTS", "error");
  };

  // Reset entire system to initial state (calls backend)
  const resetSystem = async () => {
    if (!window.confirm("Reset system to initial state? This will delete anomalies, alerts, sessions and sensor history.")) return;
    addToast("RESETTING SYSTEM — PLEASE WAIT...", "success");
    try {
      const res = await fetch('/api/sensor/reset-all', { method: 'POST' });
      const j = await res.json();
      if (res.ok) {
        addToast(`SYSTEM RESET: ${j.message}`, 'success');
      } else {
        addToast(`RESET FAILED: ${j.message || 'Server error'}`, 'error');
      }
    } catch (err) {
      addToast(`RESET ERROR: ${err.message}`, 'error');
    }
  };

  const P = "22px 24px";

  return (
    <div style={{ display:"flex", background:T.bg, minHeight:"100vh" }}>
      <Sidebar active="SETTINGS"/>
      <Toast toasts={toasts}/>

      <div style={{ marginLeft:220, flex:1, padding:"24px 28px 48px" }}>
        {/* Dot grid background */}
        <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(0,229,255,.016) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.016) 1px,transparent 1px)", backgroundSize:"44px 44px", pointerEvents:"none", zIndex:0 }}/>

        <div style={{ position:"relative", zIndex:1, maxWidth:860 }}>

          {/* ── HEADER ── */}
          <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:20, borderBottom:`1px solid ${T.border}`, marginBottom:28 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <button onClick={() => navigate(-1)}
                style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 12px", color:T.muted, cursor:"pointer", fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:1, transition:"all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.color=T.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.muted; }}>
                ← BACK
              </button>
              <div style={{ width:44, height:44, borderRadius:10, background:"rgba(0,229,255,.07)", border:"1px solid rgba(0,229,255,.35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>⚙</div>
              <div>
                <div style={{ fontFamily:"'Orbitron',monospace", fontSize:20, fontWeight:900, letterSpacing:3, color:T.accent, textShadow:"0 0 22px rgba(0,229,255,.35)" }}>
                  SYSTEM SETTINGS
                </div>
                <div style={{ fontSize:9, color:T.muted, letterSpacing:2, marginTop:3 }}>
                  USER PROFILE • POWERGRID v2.0
                </div>
              </div>
            </div>
            {/* Role badge */}
            <div style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 14px", border:"1px solid rgba(57,255,20,.35)", borderRadius:4, fontSize:9, color:"#39ff14", letterSpacing:2 }}>
              <span className="pg-blink" style={{ width:5, height:5, borderRadius:"50%", background:"#39ff14", display:"inline-block", boxShadow:"0 0 6px #39ff14" }}/>
              {profile.role}
            </div>
          </header>

          {/* ── AVATAR CARD ── */}
          <div className="pg-section-card" style={{ marginBottom:22 }}>
            <SectionHeader icon="👤" title="IDENTITY & AVATAR"/>
            <div style={{ padding:P, display:"flex", alignItems:"center", gap:24 }}>
              {/* Avatar */}
              <div style={{ position:"relative", flexShrink:0 }}>
                <div style={{ width:86, height:86, borderRadius:"50%", background:"linear-gradient(135deg,rgba(0,229,255,.18),rgba(0,229,255,.04))", border:"2px solid rgba(0,229,255,.45)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 28px rgba(0,229,255,.18)" }}>
                  <span style={{ fontFamily:"'Orbitron',monospace", fontSize:28, fontWeight:900, color:T.accent }}>{avatarInitials}</span>
                </div>
                <div style={{ position:"absolute", bottom:2, right:2, width:16, height:16, borderRadius:"50%", background:"#39ff14", border:`2px solid ${T.bg}`, boxShadow:"0 0 8px #39ff14" }}/>
              </div>
              {/* Info */}
              <div>
                <div style={{ fontFamily:"'Orbitron',monospace", fontSize:20, fontWeight:900, color:T.text, marginBottom:4 }}>{profile.displayName}</div>
                <div style={{ fontSize:11, color:T.muted, fontFamily:"'Share Tech Mono',monospace", marginBottom:10 }}>@{profile.username} • {profile.email}</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <span className="pg-tag" style={{ background:"rgba(0,229,255,.1)", border:"1px solid rgba(0,229,255,.3)", color:T.accent }}>{profile.role}</span>
                  <span className="pg-tag" style={{ background:"rgba(57,255,20,.08)", border:"1px solid rgba(57,255,20,.25)", color:"#39ff14" }}>● ACTIVE</span>
                  {profile.timezone && (
                    <span className="pg-tag" style={{ background:"rgba(255,215,0,.07)", border:"1px solid rgba(255,215,0,.2)", color:T.gold }}>🕐 {profile.timezone}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── PROFILE FIELDS ── */}
          <div className="pg-section-card" style={{ marginBottom:22 }}>
            <SectionHeader icon="✏️" title="PROFILE DETAILS"/>
            <div style={{ padding:P, display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              <div>
                <FieldLabel required>DISPLAY NAME</FieldLabel>
                <input className="pg-settings-input" value={profile.displayName}
                  onChange={e => setProfile(p => ({ ...p, displayName:e.target.value }))} placeholder="Your Name"/>
              </div>
              <div>
                <FieldLabel required>USERNAME</FieldLabel>
                <input className="pg-settings-input" value={profile.username}
                  onChange={e => setProfile(p => ({ ...p, username:e.target.value.toLowerCase().replace(/\s/g,"_") }))} placeholder="username"/>
              </div>
              <div>
                <FieldLabel required>EMAIL ADDRESS</FieldLabel>
                <input className="pg-settings-input" type="email" value={profile.email}
                  onChange={e => setProfile(p => ({ ...p, email:e.target.value }))} placeholder="user@example.com"/>
              </div>
              <div>
                <FieldLabel>PHONE NUMBER</FieldLabel>
                <input className="pg-settings-input" type="tel" value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone:e.target.value }))} placeholder="+91 XXXXX XXXXX"/>
              </div>
              <div>
                <FieldLabel>TIMEZONE</FieldLabel>
                <select className="pg-settings-input" value={profile.timezone}
                  onChange={e => setProfile(p => ({ ...p, timezone:e.target.value }))} style={{ appearance:"none", cursor:"pointer" }}>
                  {["Asia/Kolkata","Asia/Dubai","Asia/Singapore","Europe/London","America/New_York","America/Los_Angeles","UTC"].map(tz => (
                    <option key={tz} value={tz} style={{ background:"#0a0f1e" }}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>OPERATOR ROLE</FieldLabel>
                <select className="pg-settings-input" value={profile.role}
                  onChange={e => setProfile(p => ({ ...p, role:e.target.value }))} style={{ appearance:"none", cursor:"pointer" }}>
                  {["ADMIN","OPERATOR","VIEWER","TECHNICIAN"].map(r => (
                    <option key={r} value={r} style={{ background:"#0a0f1e" }}>{r}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <FieldLabel>BIO / NOTES</FieldLabel>
                <textarea className="pg-settings-input" value={profile.bio}
                  onChange={e => setProfile(p => ({ ...p, bio:e.target.value }))}
                  placeholder="Brief operator notes or department info…"
                  rows={3} style={{ resize:"vertical", fontFamily:"'Share Tech Mono',monospace" }}/>
              </div>
            </div>
            <div style={{ padding:"0 24px 22px", display:"flex", gap:10 }}>
              <button className="pg-btn-primary" onClick={saveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <span className="pg-spin" style={{ width:11, height:11, border:"2px solid rgba(0,229,255,.2)", borderTopColor:T.accent, borderRadius:"50%", display:"inline-block" }}/>
                    SAVING…
                  </>
                ) : "💾 SAVE PROFILE"}
              </button>
              <button className="pg-btn-ghost" onClick={resetProfile}>RESET</button>
            </div>
          </div>

          {/* ── CHANGE PASSWORD ── */}
          <div className="pg-section-card">
            <SectionHeader icon="🔐" title="CHANGE PASSWORD" color={T.gold}/>
            <PasswordSection addToast={addToast}/>
          </div>

          {/* Footer */}
          <footer style={{ marginTop:32, paddingTop:14, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", fontSize:9, color:T.muted, letterSpacing:2 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span className="pg-blink" style={{ width:5, height:5, borderRadius:"50%", background:T.accent3, display:"inline-block", boxShadow:`0 0 5px ${T.accent3}` }}/>
              POWERGRID v2.0 — SETTINGS
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button className="pg-btn-ghost" onClick={resetProfile}>RESET PROFILE</button>
              <button className="pg-btn-ghost" onClick={() => {
                // Non-destructive UI refresh: clear frontend-only values
                if (window.confirm("Clear all displayed values on the UI (non-destructive)?")) {
                  window.dispatchEvent(new Event('app:clear-ui'));
                  addToast('UI refreshed (display cleared)', 'success');
                }
              }}>REFRESH UI</button>
              <button className="pg-btn-ghost" onClick={resetSystem} style={{ color:'#ff6b6b', borderColor:'rgba(255,107,107,.12)' }}>RESET SYSTEM</button>
              <div>SESSION: {profile.username.toUpperCase()}</div>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}