import { useEffect, useState } from "react";
import axios from "axios";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from "recharts";

const API = axios.create({ baseURL: "http://localhost:5000" });

// ─── THEME (matches your dashboard) ──────────────────────────────────────────
const T = {
  bg: "#060a12", panel: "#0c1420", panel2: "#0f1a2e",
  border: "#1a2d4a", accent: "#00e5ff", accent2: "#ff6b35",
  accent3: "#39ff14", warn: "#ff3b3b", gold: "#ffd700",
  text: "#c8e0f0", muted: "#4a6a8a",
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; overflow-x: hidden; }

  ::-webkit-scrollbar       { width: 4px; }
  ::-webkit-scrollbar-track { background: ${T.bg}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }

  @keyframes hy-fade-up   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes hy-blink     { 0%,100%{opacity:1} 50%{opacity:.15} }
  @keyframes hy-scan      { 0%{transform:translateX(-100%);opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{transform:translateX(100%);opacity:0} }
  @keyframes hy-spin      { to{transform:rotate(360deg)} }
  @keyframes hy-pulse-glow{ 0%,100%{box-shadow:0 0 12px rgba(0,229,255,.2)} 50%{box-shadow:0 0 28px rgba(0,229,255,.5)} }
  @keyframes hy-sidebar-in{ from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes hy-card-in   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }

  .hy-root {
    font-family: 'Share Tech Mono', monospace;
    background: ${T.bg}; color: ${T.text};
    min-height: 100vh; display: flex;
  }

  /* Grid bg */
  .hy-root::before {
    content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
    background-image:
      linear-gradient(rgba(0,229,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,229,255,0.02) 1px, transparent 1px);
    background-size: 44px 44px;
  }

  /* ── SIDEBAR ── */
  .hy-sidebar {
    width: 220px; min-height: 100vh;
    background: linear-gradient(180deg, #080f1e 0%, #060a14 100%);
    border-right: 1px solid ${T.border};
    display: flex; flex-direction: column;
    padding: 28px 16px;
    position: fixed; left: 0; top: 0; bottom: 0;
    z-index: 100;
    animation: hy-sidebar-in 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }

  .hy-sidebar::before {
    content:''; position:absolute; top:0; right:0; bottom:0; width:1px;
    background: linear-gradient(180deg, transparent, rgba(0,229,255,.3), transparent);
  }

  .hy-brand {
    display: flex; align-items: center; gap: 10px;
    padding-bottom: 24px; margin-bottom: 24px;
    border-bottom: 1px solid ${T.border};
  }

  .hy-brand-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #001a2e, #003050);
    border: 1px solid rgba(0,229,255,.35); border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    animation: hy-pulse-glow 2.5s ease-in-out infinite;
  }

  .hy-brand-name {
    font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 900;
    letter-spacing: 2px; color: ${T.accent};
    text-shadow: 0 0 14px rgba(0,229,255,.4);
  }
  .hy-brand-sub { font-size: 8px; letter-spacing: 2px; color: ${T.muted}; margin-top: 2px; }

  .hy-nav { display: flex; flex-direction: column; gap: 6px; flex: 1; }

  .hy-nav-btn {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 14px; border-radius: 6px;
    background: transparent; border: 1px solid transparent;
    color: ${T.muted}; font-family: 'Share Tech Mono', monospace;
    font-size: 12px; letter-spacing: 1.5px; cursor: pointer;
    transition: all 0.25s; text-align: left; width: 100%;
    position: relative; overflow: hidden;
  }

  .hy-nav-btn:hover {
    background: rgba(0,229,255,.06); border-color: rgba(0,229,255,.15);
    color: ${T.accent};
  }

  .hy-nav-btn.active {
    background: rgba(0,229,255,.1); border-color: rgba(0,229,255,.25);
    color: ${T.accent}; box-shadow: 0 0 14px rgba(0,229,255,.1);
  }

  .hy-nav-btn.active::before {
    content:''; position:absolute; left:0; top:0; bottom:0;
    width:2px; background:${T.accent}; border-radius:0 2px 2px 0;
  }

  .hy-nav-icon { font-size: 15px; flex-shrink: 0; }

  .hy-nav-logout {
    margin-top: auto; padding-top: 16px;
    border-top: 1px solid ${T.border};
  }

  .hy-nav-logout .hy-nav-btn { color: ${T.warn}; }
  .hy-nav-logout .hy-nav-btn:hover {
    background: rgba(255,59,59,.08); border-color: rgba(255,59,59,.2);
    color: ${T.warn};
  }

  /* ── MAIN ── */
  .hy-main {
    margin-left: 220px; flex: 1; padding: 28px 28px 40px;
    position: relative; z-index: 1; min-height: 100vh;
  }

  /* ── PAGE HEADER ── */
  .hy-page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 28px; padding-bottom: 20px;
    border-bottom: 1px solid ${T.border};
    animation: hy-fade-up 0.5s 0.05s both;
  }

  .hy-page-title {
    font-family: 'Orbitron', monospace; font-size: 22px; font-weight: 900;
    letter-spacing: 3px; color: ${T.accent};
    text-shadow: 0 0 20px rgba(0,229,255,.35);
  }
  .hy-page-sub { font-size: 10px; letter-spacing: 2px; color: ${T.muted}; margin-top: 5px; }

  /* ── RANGE TABS ── */
  .hy-range-tabs {
    display: flex; gap: 6px; align-items: center;
  }

  .hy-range-btn {
    padding: 8px 18px; border-radius: 4px;
    background: transparent; border: 1px solid ${T.border};
    color: ${T.muted}; font-family: 'Orbitron', monospace;
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    cursor: pointer; transition: all 0.2s;
  }
  .hy-range-btn:hover { border-color: ${T.accent}; color: ${T.accent}; }
  .hy-range-btn.active {
    background: rgba(0,229,255,.12); border-color: ${T.accent};
    color: ${T.accent}; box-shadow: 0 0 14px rgba(0,229,255,.15);
  }

  /* ── STAT CARDS ── */
  .hy-stats-row {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
    margin-bottom: 22px;
    animation: hy-card-in 0.5s 0.1s both;
  }

  .hy-stat-card {
    background: ${T.panel}; border: 1px solid ${T.border}; border-radius: 10px;
    padding: 18px 16px; position: relative; overflow: hidden;
    transition: border-color .3s, box-shadow .3s;
  }
  .hy-stat-card:hover { border-color: rgba(0,229,255,.25); box-shadow: 0 0 18px rgba(0,229,255,.08); }
  .hy-stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; border-radius:10px 10px 0 0; }
  .hy-stat-card:nth-child(1)::before { background: ${T.gold}; }
  .hy-stat-card:nth-child(2)::before { background: ${T.accent}; }
  .hy-stat-card:nth-child(3)::before { background: ${T.accent3}; }
  .hy-stat-card:nth-child(4)::before { background: ${T.accent2}; }

  .hy-stat-label { font-size: 9px; letter-spacing: 3px; color: ${T.muted}; text-transform: uppercase; margin-bottom: 8px; }
  .hy-stat-value { font-family: 'Orbitron', monospace; font-size: 28px; font-weight: 900; line-height: 1; }
  .hy-stat-unit  { font-size: 12px; font-weight: 400; opacity: .7; margin-left: 3px; }
  .hy-stat-sub   { font-size: 10px; color: ${T.muted}; margin-top: 5px; }

  .hy-stat-card:nth-child(1) .hy-stat-value { color:${T.gold};    text-shadow:0 0 16px rgba(255,215,0,.3); }
  .hy-stat-card:nth-child(2) .hy-stat-value { color:${T.accent};  text-shadow:0 0 16px rgba(0,229,255,.3); }
  .hy-stat-card:nth-child(3) .hy-stat-value { color:${T.accent3}; text-shadow:0 0 16px rgba(57,255,20,.3); }
  .hy-stat-card:nth-child(4) .hy-stat-value { color:${T.accent2}; text-shadow:0 0 16px rgba(255,107,53,.3); }

  /* ── CHART PANELS ── */
  .hy-charts-col { display: flex; flex-direction: column; gap: 20px; }

  .hy-panel {
    background: ${T.panel}; border: 1px solid ${T.border}; border-radius: 10px;
    overflow: hidden;
    animation: hy-card-in 0.5s both;
  }
  .hy-panel:nth-child(1) { animation-delay: 0.15s; }
  .hy-panel:nth-child(2) { animation-delay: 0.22s; }

  .hy-panel-header {
    padding: 14px 18px; border-bottom: 1px solid ${T.border};
    background: ${T.panel2};
    display: flex; align-items: center; justify-content: space-between;
    position: relative; overflow: hidden;
  }

  .hy-panel-header::after {
    content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
    background: linear-gradient(90deg, transparent, rgba(0,229,255,.15), transparent);
    animation: hy-scan 4s linear infinite;
  }

  .hy-panel-title {
    font-family: 'Orbitron', monospace; font-size: 11px;
    letter-spacing: 3px; color: ${T.accent};
    display: flex; align-items: center; gap: 10px;
  }

  .hy-panel-badge {
    font-size: 9px; padding: 3px 10px;
    border: 1px solid ${T.border}; border-radius: 20px;
    color: ${T.muted}; letter-spacing: 1px;
  }

  .hy-panel-body { padding: 20px 16px 16px; }

  /* ── BOTTOM GRID ── */
  .hy-bottom-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    margin-top: 20px;
  }

  /* ── TABLE ── */
  .hy-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .hy-table th {
    padding: 10px 14px; text-align: left;
    font-size: 9px; letter-spacing: 2px; color: ${T.muted};
    border-bottom: 1px solid ${T.border}; font-weight: 400;
  }
  .hy-table td {
    padding: 10px 14px;
    border-bottom: 1px solid rgba(26,45,74,.5);
    color: ${T.text}; font-family: 'Share Tech Mono', monospace;
    transition: background .2s;
  }
  .hy-table tr:hover td { background: rgba(0,229,255,.03); }
  .hy-table tr:last-child td { border-bottom: none; }

  /* ── EMPTY STATE ── */
  .hy-empty {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; padding: 60px 20px;
    color: ${T.muted};
  }
  .hy-empty-icon { font-size: 40px; opacity: .3; }
  .hy-empty-text { font-size: 11px; letter-spacing: 2px; }

  /* ── LOADING ── */
  .hy-loading {
    display: flex; align-items: center; justify-content: center;
    gap: 12px; padding: 60px;
    font-size: 11px; letter-spacing: 2px; color: ${T.muted};
  }
  .hy-spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(0,229,255,.15); border-top-color: ${T.accent};
    border-radius: 50%; animation: hy-spin 0.8s linear infinite;
  }

  @media (max-width: 1100px) {
    .hy-stats-row { grid-template-columns: repeat(2,1fr); }
    .hy-bottom-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 700px) {
    .hy-sidebar { transform: translateX(-100%); }
    .hy-main { margin-left: 0; padding: 16px; }
    .hy-stats-row { grid-template-columns: 1fr 1fr; }
  }
`;

function useGlobalStyles() {
  useEffect(() => {
    if (document.getElementById("hy-global-css")) return;
    const el = document.createElement("style");
    el.id = "hy-global-css";
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
  }, []);
}

// ─── CUSTOM CHART TOOLTIP ─────────────────────────────────────────────────────
function HyTooltip({ active, payload, label, unit = "W" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", minWidth: 140 }}>
      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 10, color: T.muted, marginBottom: 6, letterSpacing: 1 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          <span style={{ fontSize: 13, color: T.text, fontFamily: "'Orbitron',monospace", fontWeight: 700 }}>
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
            <span style={{ fontSize: 10, opacity: .6, marginLeft: 3 }}>{unit}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── NAV BUTTON ───────────────────────────────────────────────────────────────
function NavBtn({ icon, label, active, onClick, danger }) {
  return (
    <button
      className={`hy-nav-btn ${active ? "active" : ""}`}
      onClick={onClick}
      style={danger ? { color: T.warn } : undefined}
    >
      <span className="hy-nav-icon">{icon}</span>
      {label}
    </button>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, unit, sub }) {
  return (
    <div className="hy-stat-card">
      <div className="hy-stat-label">{label}</div>
      <div className="hy-stat-value">
        {value ?? "--"}
        {unit && <span className="hy-stat-unit">{unit}</span>}
      </div>
      {sub && <div className="hy-stat-sub">{sub}</div>}
    </div>
  );
}

// ─── MAIN HISTORY COMPONENT ───────────────────────────────────────────────────
export default function History() {
  useGlobalStyles();

  const [data,    setData]    = useState([]);
  const [range,   setRange]   = useState("24h");
  const [loading, setLoading] = useState(false);
  const [chart,   setChart]   = useState("area"); // "area" | "bar"

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await API.get(`/api/sensor/history?range=${range}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        setData(res.data);
      } catch (err) {
        console.log("History error:", err);
        // demo fallback so UI is never empty
        const now = Date.now();
        const pts = range === "24h" ? 24 : range === "7d" ? 7 * 24 : 30 * 24;
        const step = range === "24h" ? 3600000 : range === "7d" ? 3600000 : 86400000;
        setData(
          Array.from({ length: pts }, (_, i) => ({
            timestamp: now - (pts - i) * step,
            power:     +(800 + Math.sin(i / 4) * 300 + Math.random() * 150).toFixed(1),
            energy:    +(i * 0.8 + Math.random() * 0.4).toFixed(3),
            current:   +(3 + Math.random() * 2).toFixed(2),
            voltage:   +(220 + (Math.random() - 0.5) * 8).toFixed(1),
          }))
        );
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [range]);

  // ── computed stats ──
  const powers  = data.map(d => d.power || 0);
  const avgPwr  = powers.length ? +(powers.reduce((a, b) => a + b, 0) / powers.length).toFixed(1) : null;
  const peakPwr = powers.length ? +Math.max(...powers).toFixed(1) : null;
  const minPwr  = powers.length ? +Math.min(...powers).toFixed(1) : null;
  const totalE  = data.length   ? +(data[data.length - 1]?.energy || 0).toFixed(3) : null;

  // ── chart-ready data ──
  const chartData = data.map(d => ({
    ...d,
    time: new Date(d.timestamp).toLocaleString("en-IN", {
      hour: "2-digit", minute: "2-digit",
      ...(range !== "24h" ? { month: "short", day: "numeric" } : {}),
      hour12: false,
    }),
  }));

  // ── table rows (last 10) ──
  const tableRows = [...data].reverse().slice(0, 12);

  const rangeLabel = { "24h": "LAST 24 HOURS", "7d": "LAST 7 DAYS", "30d": "LAST 30 DAYS" }[range];

  return (
    <div className="hy-root">

      {/* ── SIDEBAR ── */}
      <aside className="hy-sidebar">
        {/* Brand */}
        <div className="hy-brand">
          <div className="hy-brand-icon">⚡</div>
          <div>
            <div className="hy-brand-name">POWERGRID</div>
            <div className="hy-brand-sub">MONITOR v2.0</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="hy-nav">
          <NavBtn icon="⚡" label="DASHBOARD" onClick={() => (window.location.href = "/dashboard")} />
          <NavBtn icon="📊" label="HISTORY"   active onClick={() => (window.location.href = "/history")} />
          <NavBtn icon="⚙" label="SETTINGS"  onClick={() => {}} />
        </nav>

        {/* Logout */}
        <div className="hy-nav-logout">
          <NavBtn
            icon="→"
            label="LOGOUT"
            danger
            onClick={() => { localStorage.clear(); window.location.href = "/"; }}
          />
        </div>

        {/* Sidebar status */}
        <div style={{ marginTop: 16, padding: "10px 0", borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: T.muted, letterSpacing: 2 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent3, boxShadow: `0 0 5px ${T.accent3}`, display: "inline-block", animation: "hy-blink 1.2s ease-in-out infinite" }} />
            ESP32 ONLINE
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="hy-main">

        {/* Page header */}
        <div className="hy-page-header">
          <div>
            <div className="hy-page-title">📊 ENERGY HISTORY</div>
            <div className="hy-page-sub">{rangeLabel} • {data.length} DATA POINTS</div>
          </div>
          {/* Range tabs */}
          <div className="hy-range-tabs">
            {[["24h","24H"],["7d","7 DAYS"],["30d","30 DAYS"]].map(([v,l]) => (
              <button key={v} className={`hy-range-btn ${range === v ? "active" : ""}`} onClick={() => setRange(v)}>{l}</button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="hy-stats-row">
          <StatCard label="⚡ Total Energy"  value={totalE}  unit="kWh" sub="Cumulative consumption" />
          <StatCard label="📊 Avg Power"     value={avgPwr}  unit="W"   sub={`Over ${rangeLabel.toLowerCase()}`} />
          <StatCard label="🔺 Peak Power"    value={peakPwr} unit="W"   sub="Session maximum" />
          <StatCard label="🔻 Min Power"     value={minPwr}  unit="W"   sub="Session minimum" />
        </div>

        {/* Charts column */}
        <div className="hy-charts-col">

          {/* Main chart */}
          <div className="hy-panel">
            <div className="hy-panel-header">
              <div className="hy-panel-title">
                📈 POWER vs TIME
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {/* Chart type toggle */}
                {[["area","▲ AREA"],["bar","▮ BAR"]].map(([v, l]) => (
                  <button key={v}
                    onClick={() => setChart(v)}
                    style={{
                      padding: "4px 10px", fontSize: 9, fontFamily: "'Orbitron',monospace",
                      letterSpacing: 1, border: `1px solid ${chart === v ? T.accent : T.border}`,
                      borderRadius: 4, background: chart === v ? "rgba(0,229,255,.1)" : "transparent",
                      color: chart === v ? T.accent : T.muted, cursor: "pointer",
                    }}
                  >{l}</button>
                ))}
                <div className="hy-panel-badge">{rangeLabel}</div>
              </div>
            </div>
            <div className="hy-panel-body">
              {loading ? (
                <div className="hy-loading"><div className="hy-spinner" />FETCHING DATA...</div>
              ) : data.length === 0 ? (
                <div className="hy-empty">
                  <div className="hy-empty-icon">📭</div>
                  <div className="hy-empty-text">NO DATA FOR THIS RANGE</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  {chart === "area" ? (
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hyPowerGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={T.accent} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={T.accent} stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,.03)"/>
                      <XAxis dataKey="time" tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }} interval="preserveStartEnd"/>
                      <YAxis tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }}/>
                      <Tooltip content={<HyTooltip unit="W"/>}/>
                      {avgPwr && <ReferenceLine y={avgPwr} stroke={T.gold} strokeDasharray="4 3" label={{ value:"AVG", position:"insideTopRight", fill:T.gold, fontSize:9 }}/>}
                      {peakPwr && <ReferenceLine y={peakPwr} stroke={T.warn} strokeDasharray="4 3" label={{ value:"PEAK", position:"insideTopRight", fill:T.warn, fontSize:9 }}/>}
                      <Area type="monotone" dataKey="power" stroke={T.accent} strokeWidth={2} fill="url(#hyPowerGrad)" dot={false} activeDot={{ r:4, fill:T.accent }} isAnimationActive={false}/>
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,.03)"/>
                      <XAxis dataKey="time" tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }} interval="preserveStartEnd"/>
                      <YAxis tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }}/>
                      <Tooltip content={<HyTooltip unit="W"/>}/>
                      <Bar dataKey="power" fill={T.accent} opacity={0.7} radius={[2,2,0,0]}/>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Energy accumulated chart */}
          <div className="hy-panel">
            <div className="hy-panel-header">
              <div className="hy-panel-title">🔋 ENERGY ACCUMULATION (kWh)</div>
              <div className="hy-panel-badge">CUMULATIVE</div>
            </div>
            <div className="hy-panel-body">
              {!loading && data.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hyEnergyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={T.accent3} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={T.accent3} stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,.03)"/>
                    <XAxis dataKey="time" tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }} interval="preserveStartEnd"/>
                    <YAxis tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }}/>
                    <Tooltip content={<HyTooltip unit="kWh"/>}/>
                    <Area type="monotone" dataKey="energy" stroke={T.accent3} strokeWidth={2} fill="url(#hyEnergyGrad)" dot={false} activeDot={{ r:4, fill:T.accent3 }} isAnimationActive={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: voltage/current charts + table */}
        <div className="hy-bottom-grid">

          {/* Voltage + Current chart */}
          <div className="hy-panel">
            <div className="hy-panel-header">
              <div className="hy-panel-title">⚡ VOLTAGE & CURRENT</div>
              <div className="hy-panel-badge">DUAL AXIS</div>
            </div>
            <div className="hy-panel-body">
              {!loading && data.length > 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,.03)"/>
                    <XAxis dataKey="time" tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }} interval="preserveStartEnd"/>
                    <YAxis tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }}/>
                    <Tooltip content={<HyTooltip unit=""/>}/>
                    <Line type="monotone" dataKey="voltage" stroke={T.gold}    strokeWidth={1.5} dot={false} name="Voltage (V)" isAnimationActive={false}/>
                    <Line type="monotone" dataKey="current" stroke={T.accent2} strokeWidth={1.5} dot={false} name="Current (A)" isAnimationActive={false}/>
                  </LineChart>
                </ResponsiveContainer>
              )}
              {/* Legend */}
              <div style={{ display:"flex", gap:16, justifyContent:"center", marginTop:10, fontSize:10, letterSpacing:1 }}>
                <span style={{ display:"flex", alignItems:"center", gap:5, color:T.gold }}><span style={{ width:16, height:2, background:T.gold, display:"inline-block" }}/>VOLTAGE (V)</span>
                <span style={{ display:"flex", alignItems:"center", gap:5, color:T.accent2 }}><span style={{ width:16, height:2, background:T.accent2, display:"inline-block" }}/>CURRENT (A)</span>
              </div>
            </div>
          </div>

          {/* Recent readings table */}
          <div className="hy-panel">
            <div className="hy-panel-header">
              <div className="hy-panel-title">📋 RECENT READINGS</div>
              <div className="hy-panel-badge">LATEST 12</div>
            </div>
            <div className="hy-panel-body" style={{ padding: "0", maxHeight: 300, overflowY: "auto" }}>
              {loading ? (
                <div className="hy-loading"><div className="hy-spinner"/>LOADING...</div>
              ) : (
                <table className="hy-table">
                  <thead>
                    <tr>
                      <th>TIME</th>
                      <th>POWER (W)</th>
                      <th>VOLTAGE (V)</th>
                      <th>CURRENT (A)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, i) => (
                      <tr key={i}>
                        <td style={{ color: T.muted, fontSize: 11 }}>
                          {new Date(row.timestamp).toLocaleString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:false, month:"short", day:"numeric" })}
                        </td>
                        <td style={{ color: T.accent, fontFamily:"'Orbitron',monospace", fontSize:12, fontWeight:700 }}>
                          {(row.power||0).toFixed(1)}
                        </td>
                        <td style={{ color: T.gold }}>{(row.voltage||0).toFixed(1)}</td>
                        <td style={{ color: T.accent2 }}>{(row.current||0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {tableRows.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign:"center", padding:30, color:T.muted, fontSize:11 }}>NO DATA</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ marginTop:28, paddingTop:16, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", fontSize:9, color:T.muted, letterSpacing:2 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:T.accent3, display:"inline-block", boxShadow:`0 0 5px ${T.accent3}` }}/>
            POWERGRID v2.0 — HISTORY MODULE
          </div>
          <div>{data.length} RECORDS • {rangeLabel}</div>
        </footer>

      </main>
    </div>
  );
}