import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import axios from "axios";

// ─── AXIOS INSTANCE ──────────────────────────────────────────────────────────
const API = axios.create({
  baseURL: "http://localhost:5000"
});

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#060a12",
  panel: "#0c1420",
  panel2: "#0f1a2e",
  border: "#1a2d4a",
  accent: "#00e5ff",
  accent2: "#ff6b35",
  accent3: "#39ff14",
  warn: "#ff3b3b",
  gold: "#ffd700",
  text: "#c8e0f0",
  muted: "#4a6a8a",
};

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; }

  .pg-root {
    font-family: 'Share Tech Mono', monospace;
    background: ${T.bg};
    color: ${T.text};
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }
  .pg-root::before {
    content: '';
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px);
    background-size: 44px 44px;
  }
  .pg-root::after {
    content: '';
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px,
      rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px
    );
  }

  @keyframes pulse-glow {
    0%,100% { box-shadow: 0 0 15px rgba(0,229,255,0.25); }
    50%      { box-shadow: 0 0 35px rgba(0,229,255,0.6); }
  }
  @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:.15} }
  @keyframes shake   { from{transform:translateX(-3px)} to{transform:translateX(3px)} }
  @keyframes sweep   { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
  @keyframes fadeIn  { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes flash   { 0%{opacity:1} 40%{opacity:.35} 100%{opacity:1} }
  @keyframes ring-alert { 0%,100%{box-shadow:0 0 12px rgba(255,59,59,.3)} 50%{box-shadow:0 0 32px rgba(255,59,59,.75)} }

  .flash-anim  { animation: flash  .45s ease; }
  .fadein-anim { animation: fadeIn .35s ease; }
  .logo-pulse  { animation: pulse-glow 2.2s ease-in-out infinite; }
  .live-dot    { animation: blink 1s ease-in-out infinite; }
  .shake-icon  { animation: shake .3s ease-in-out infinite alternate; }

  ::-webkit-scrollbar       { width: 4px; }
  ::-webkit-scrollbar-track { background: ${T.bg}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }

  input[type=number] { -moz-appearance: textfield; }
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
`;

// ─── INJECT STYLES ────────────────────────────────────────────────────────────
function useGlobalStyles() {
  useEffect(() => {
    if (document.getElementById("pg-global-css")) return;
    const el = document.createElement("style");
    el.id = "pg-global-css";
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
  }, []);
}

// ─── STEP 2: REAL API FETCH (no mock fallback) ───────────────────────────────
async function fetchSensorData() {
  try {
    const res = await API.get("/api/sensor/live", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });
    return res.data;
  } catch (err) {
    console.log("API error:", err);
    // Return zeroed data on error — no fake random values
    return { voltage: 0, current: 0, power: 0, energy: 0 };
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n, d = 1) => typeof n === "number" ? n.toFixed(d) : "--";
const clamp = (v, mn, mx) => Math.min(mx, Math.max(mn, v));

function TrendBadge({ curr, prev }) {
  if (prev === null) return <span style={{ color: T.muted }}>—</span>;
  const d = curr - prev;
  if (Math.abs(d) < 0.01) return <span style={{ color: T.muted }}>→ stable</span>;
  return d > 0
    ? <span style={{ color: T.warn }}>↑ +{Math.abs(d).toFixed(2)}</span>
    : <span style={{ color: T.accent3 }}>↓ -{Math.abs(d).toFixed(2)}</span>;
}

// ─── METRIC CARD ─────────────────────────────────────────────────────────────
const CARD_COLORS = [T.gold, T.accent2, T.accent, T.accent3];
const CARD_SHADOWS = [
  "rgba(255,215,0,0.35)", "rgba(255,107,53,0.35)",
  "rgba(0,229,255,0.35)", "rgba(57,255,20,0.35)"
];

function MetricCard({ index, label, icon, value, unit, barPct, prevVal }) {
  const color = CARD_COLORS[index];
  const shadow = CARD_SHADOWS[index];
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 450);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div
      style={{
        background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: "22px 18px", position: "relative", overflow: "hidden",
        transition: "border-color .3s, box-shadow .3s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.boxShadow = `0 0 22px rgba(0,229,255,.2)`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, borderRadius: "12px 12px 0 0" }} />
      <div style={{ position: "absolute", top: 8, right: 8, width: 36, height: 36, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}`, borderRadius: "0 8px 0 0", opacity: .3 }} />

      <div style={{ fontSize: 10, letterSpacing: 3, color: T.muted, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{icon}</span>{label}
      </div>

      <div
        className={flash ? "flash-anim" : ""}
        style={{ fontFamily: "'Orbitron',monospace", fontSize: 36, fontWeight: 900, lineHeight: 1, marginBottom: 4, color, textShadow: `0 0 22px ${shadow}` }}
      >
        {value === null ? "--" : value}
        <span style={{ fontSize: 13, fontWeight: 400, opacity: .7, marginLeft: 3 }}>{unit}</span>
      </div>

      <div style={{ fontSize: 11, color: T.muted, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <TrendBadge curr={parseFloat(value) || 0} prev={prevVal} />
        <span>vs last</span>
      </div>

      <div style={{ marginTop: 12, height: 3, background: "rgba(255,255,255,.04)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${clamp(barPct, 0, 100)}%`, background: color, borderRadius: 2, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

// ─── ANALYTICS CARD ──────────────────────────────────────────────────────────
function AnalyticsCard({ label, value, sub, color = T.text }) {
  return (
    <div style={{
      background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12,
      padding: "18px 20px", position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 50, background: "linear-gradient(to top, rgba(0,229,255,.03), transparent)" }} />
      <div style={{ fontSize: 10, letterSpacing: 2, color: T.muted, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

// ─── EFFICIENCY RING ─────────────────────────────────────────────────────────
function EfficiencyRing({ score }) {
  const r = 30, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? T.accent3 : score >= 60 ? T.accent : score >= 40 ? T.gold : T.warn;
  const label = score >= 80 ? "EXCELLENT" : score >= 60 ? "GOOD" : score >= 40 ? "MODERATE" : "POOR";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6 }}>
      <svg width="70" height="70" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="6" />
        <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 35 35)"
          style={{ transition: "stroke-dashoffset 1.4s ease, stroke .5s", filter: `drop-shadow(0 0 7px ${color})` }}
        />
        <text x="35" y="35" textAnchor="middle" dominantBaseline="central"
          fill={color} style={{ fontFamily: "'Orbitron',monospace", fontSize: 13, fontWeight: 700 }}>
          {score}%
        </text>
      </svg>
      <div>
        <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 20, fontWeight: 700, color }}>{score}%</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

// ─── CUSTOM CHART TOOLTIP ─────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 11, color: T.accent, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: T.text }}>{payload[0]?.value?.toFixed(1)} W</div>
    </div>
  );
}

// ─── EVENT LOG ITEM ───────────────────────────────────────────────────────────
const LOG_META = {
  info:   { color: T.muted,   icon: "●" },
  warn:   { color: T.gold,    icon: "▲" },
  danger: { color: T.warn,    icon: "⚠" },
  ok:     { color: T.accent3, icon: "✔" },
};

function LogItem({ time, msg, type }) {
  const { color, icon } = LOG_META[type] || LOG_META.info;
  return (
    <div className="fadein-anim" style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "8px 10px", background: "rgba(0,0,0,.22)",
      borderRadius: 6, borderLeft: `2px solid ${color}`,
      fontSize: 11, letterSpacing: .5,
    }}>
      <span style={{ color, fontWeight: 700, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: T.muted, flexShrink: 0, fontFamily: "'Orbitron',monospace", fontSize: 10 }}>{time}</span>
      <span style={{ color: T.text }}>{msg}</span>
    </div>
  );
}

// ─── STATUS ROW ───────────────────────────────────────────────────────────────
function StatusRow({ dotColor, blink, name, desc, val, valColor }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 14px", background: "rgba(0,0,0,.2)",
      borderRadius: 8, border: `1px solid ${T.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className={blink ? "live-dot" : ""} style={{
          width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
          background: dotColor, boxShadow: `0 0 8px ${dotColor}`,
        }} />
        <div>
          <div style={{ fontSize: 12, color: T.text, letterSpacing: 1 }}>{name}</div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1, marginTop: 2 }}>{desc}</div>
        </div>
      </div>
      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 12, fontWeight: 700, color: valColor || T.accent }}>{val}</div>
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function EnergyDashboard() {
  useGlobalStyles();

  // sensor state
  const [reading, setReading] = useState({ voltage: 0, current: 0, power: 0, energy: 0 });
  const [prevReading, setPrevReading] = useState({ voltage: null, current: null, power: null });
  const [chartData, setChartData] = useState([]);

  // STEP 5: analytics state (computed inside update())
  const [analytics, setAnalytics] = useState({ totalEnergy: 0, peakPower: 0, avgPower: 0, efficiency: 0 });

  const [logs, setLogs] = useState([]);
  const [countdown, setCountdown] = useState(3);
  const [dataCount, setDataCount] = useState(0);

  // STEP 4: overload state
  const [isOverload, setIsOverload] = useState(false);
  const [overloadDetail, setOverloadDetail] = useState("");

  const [lastUpdate, setLastUpdate] = useState("—");

  // user inputs
  const [tariff, setTariff] = useState("6.50");
  const [threshold, setThreshold] = useState("10");

  // analytics refs (avoid stale closures)
  const peakPowerRef = useRef(0);
  const powerSumRef = useRef(0);
  const countRef = useRef(0);
  const totalEnergyRef = useRef(0);

  const addLog = useCallback((msg, type = "info") => {
    const time = new Date().toLocaleTimeString("en-IN", { hour12: false });
    setLogs(prev => [{ time, msg, type, id: Date.now() + Math.random() }, ...prev].slice(0, 25));
  }, []);

  // ─── STEP 4 + STEP 5: update() with real data + overload + analytics ────
  const update = useCallback(async () => {
    const data = await fetchSensorData();

    // accumulate refs
    totalEnergyRef.current = data.energy ?? totalEnergyRef.current;
    countRef.current += 1;
    powerSumRef.current += data.power || 0;
    if ((data.power || 0) > peakPowerRef.current) {
      peakPowerRef.current = data.power;
    }

    // STEP 4 — overload detection
    const thresh = parseFloat(threshold);
    if ((data.current || 0) > thresh) {
      setIsOverload(true);
      setOverloadDetail(`Current ${data.current}A > ${thresh}A`);
      addLog(`⚠ Overload! Current ${data.current}A exceeds ${thresh}A threshold`, "danger");
    } else {
      setIsOverload(false);
    }

    // STEP 5 — update analytics
    setAnalytics({
      totalEnergy: totalEnergyRef.current,
      peakPower: peakPowerRef.current,
      avgPower: powerSumRef.current / countRef.current,
      efficiency: Math.min(100, Math.round((powerSumRef.current / countRef.current) / 50 * 100)),
    });

    const time = new Date().toLocaleTimeString();
    setLastUpdate(time);
    setDataCount(c => c + 1);

    // save prev reading for trend badges
    setPrevReading({ voltage: reading.voltage, current: reading.current, power: reading.power });
    setReading(data);

    setChartData(prev => {
      const next = [...prev, { time, power: data.power || 0 }];
      return next.length > 20 ? next.slice(-20) : next;
    });
  }, [threshold, reading, addLog]);

  // 3-second auto-refresh
 useEffect(() => {
  addLog("System boot. Connecting to ESP32 API...", "info");
  const refreshId = setInterval(update, 3000);
  update();
  return () => clearInterval(refreshId);
}, [update, addLog]);

  // countdown tick
  useEffect(() => {
    const id = setInterval(() => setCountdown(c => c <= 1 ? 3 : c - 1), 1000);
    return () => clearInterval(id);
  }, []);

  // logout handler
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const tariffNum = parseFloat(tariff) || 0;
  const cost = ((analytics.totalEnergy || 0) * tariffNum).toFixed(2);

  return (
    <div className="pg-root" style={{ minHeight: "100vh" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", padding: "20px 24px" }}>

        {/* ── HEADER ── */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingBottom: 24, borderBottom: `1px solid ${T.border}`, marginBottom: 28,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="logo-pulse" style={{
              width: 48, height: 48, background: "linear-gradient(135deg,#00e5ff,#0070ff)",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>⚡</div>
            <div>
              <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 20, fontWeight: 900, letterSpacing: 3, color: T.accent, textShadow: "0 0 20px rgba(0,229,255,.5)" }}>POWERGRID</div>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginTop: 2 }}>REAL-TIME ENERGY MONITORING SYSTEM</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* VIEW HISTORY BUTTON */}

<button
  onClick={() => window.location.href = "/history"}
  style={{
    background: "transparent",
    border: "1px solid #FFD93D",   // 🟡 yellow border
    borderRadius: 4,
    padding: "7px 14px",
    fontSize: 11,
    color: "#FFD93D",              // 🟡 yellow text
    letterSpacing: 2,
    cursor: "pointer",
    fontFamily: "'Share Tech Mono',monospace",
    transition: "background .2s",
    marginRight: 10               // spacing from logout button
  }}
  onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 217, 61, 0.2)"} // yellow hover
  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
>
  VIEW HISTORY
</button>
            {/* LOGOUT BUTTON */}
            
            <button
              onClick={handleLogout}
              style={{
                background: "transparent", border: `1px solid ${T.warn}`, borderRadius: 4,
                padding: "7px 14px", fontSize: 11, color: T.warn, letterSpacing: 2,
                cursor: "pointer", fontFamily: "'Share Tech Mono',monospace",
                transition: "background .2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,59,59,.15)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              LOGOUT
            </button>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", border: `1px solid ${T.accent3}`, borderRadius: 4, fontSize: 11, color: T.accent3, letterSpacing: 2 }}>
              <div className="live-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: T.accent3, boxShadow: `0 0 8px ${T.accent3}` }} />
              LIVE
            </div>
            <div style={{ fontSize: 11, color: T.muted, letterSpacing: 1 }}>
              REFRESH IN <span style={{ color: T.accent, fontFamily: "'Orbitron',monospace", fontWeight: 700 }}>{countdown}</span>s
            </div>
          </div>
        </header>

        {/* ── OVERLOAD ALERT ── */}
        {isOverload && (
          <div style={{
            background: "linear-gradient(135deg,rgba(255,59,59,.15),rgba(255,59,59,.05))",
            border: `2px solid ${T.warn}`, borderRadius: 8, padding: "14px 22px",
            marginBottom: 22, position: "relative", overflow: "hidden",
            animation: "ring-alert .5s ease-in-out infinite alternate",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,59,59,.1),transparent)", animation: "sweep 1.5s linear infinite" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
              <span className="shake-icon" style={{ fontSize: 26 }}>🚨</span>
              <div>
                <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 16, color: T.warn, letterSpacing: 2 }}>OVERLOAD DETECTED!</div>
                <div style={{ fontSize: 12, color: "rgba(255,120,120,.85)", marginTop: 3, letterSpacing: 1 }}>{overloadDetail} — CHECK CIRCUIT IMMEDIATELY</div>
              </div>
            </div>
          </div>
        )}

        {/* ── METRIC CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 22 }}>
          <MetricCard index={0} label="Voltage" icon="⚡" value={fmt(reading.voltage, 1)} unit="V" barPct={((reading.voltage || 220) - 200) / 60 * 100} prevVal={prevReading.voltage} />
          <MetricCard index={1} label="Current" icon="〜" value={fmt(reading.current, 2)} unit="A" barPct={(reading.current || 0) / 20 * 100} prevVal={prevReading.current} />
          <MetricCard index={2} label="Power"   icon="💡" value={fmt(reading.power, 1)}   unit="W" barPct={(reading.power || 0) / 5000 * 100} prevVal={prevReading.power} />
          <MetricCard index={3} label="Energy"  icon="🔋" value={fmt(reading.energy, 4)}  unit="kWh" barPct={(reading.energy || 0) / 10 * 100} prevVal={null} />
        </div>

        {/* ── CHART + COST ── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 22 }}>

          {/* Chart */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, background: T.panel2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 11, letterSpacing: 3, color: T.accent, display: "flex", alignItems: "center", gap: 10 }}>
                📈 POWER vs TIME
              </div>
              <div style={{ fontSize: 10, padding: "3px 10px", border: `1px solid ${T.border}`, borderRadius: 20, color: T.muted, letterSpacing: 1 }}>AUTO-UPDATE • 3s</div>
            </div>
            <div style={{ padding: "20px 16px 16px" }}>
              <ResponsiveContainer width="100%" height={290}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={T.accent} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={T.accent} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,.04)" />
                  <XAxis dataKey="time" tick={{ fill: T.muted, fontSize: 10, fontFamily: "Share Tech Mono" }} tickLine={false} axisLine={{ stroke: T.border }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: T.muted, fontSize: 10, fontFamily: "Share Tech Mono" }} tickLine={false} axisLine={{ stroke: T.border }} />
                  <Tooltip content={<ChartTooltip />} />
                  {peakPowerRef.current > 0 && (
                    <ReferenceLine y={peakPowerRef.current} stroke={T.warn} strokeDasharray="4 3"
                      label={{ value: "PEAK", position: "insideTopRight", fill: T.warn, fontSize: 10 }} />
                  )}
                  <Area type="monotone" dataKey="power" stroke={T.accent} strokeWidth={2} fill="url(#powerGrad)" dot={false} activeDot={{ r: 4, fill: T.accent }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost + Threshold */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, background: T.panel2 }}>
              <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 11, letterSpacing: 3, color: T.accent }}>💰 COST & SAFETY</div>
            </div>
            <div style={{ padding: 20 }}>

              {/* Tariff input */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: T.muted, textTransform: "uppercase", marginBottom: 8 }}>Electricity Tariff</div>
                <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", background: "rgba(0,0,0,.3)" }}>
                  <div style={{ padding: "11px 13px", background: "rgba(0,229,255,.08)", borderRight: `1px solid ${T.border}`, color: T.accent, fontFamily: "'Orbitron',monospace", fontSize: 15, fontWeight: 700 }}>₹</div>
                  <input
                    type="number" value={tariff} step="0.1" min="0"
                    onChange={e => setTariff(e.target.value)}
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "11px 12px", color: T.text, fontFamily: "'Share Tech Mono',monospace", fontSize: 16, fontWeight: 700 }}
                  />
                  <div style={{ padding: "11px 13px", color: T.muted, fontSize: 11, letterSpacing: 1 }}>/ unit</div>
                </div>
              </div>

              {/* Cost display */}
              <div style={{
                background: "linear-gradient(135deg,rgba(0,229,255,.05),rgba(0,229,255,.02))",
                border: "1px solid rgba(0,229,255,.2)", borderRadius: 10,
                padding: "18px 16px", textAlign: "center", marginBottom: 16,
              }}>
                <div style={{ fontSize: 10, letterSpacing: 3, color: T.muted, textTransform: "uppercase", marginBottom: 6 }}>Total Cost</div>
                <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 40, fontWeight: 900, color: T.gold, textShadow: "0 0 28px rgba(255,215,0,.4)" }}>
                  ₹{cost}
                </div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 6, letterSpacing: 1 }}>
                  {fmt(analytics.totalEnergy, 4)} kWh × <span style={{ color: T.accent }}>₹{tariffNum.toFixed(2)}</span>
                </div>
              </div>

              {/* Threshold */}
              <div style={{ background: "rgba(255,107,53,.05)", border: "1px solid rgba(255,107,53,.2)", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: T.accent2, textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>⚠ Overload Threshold</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="number" value={threshold} step="0.5" min="0"
                    onChange={e => {
                      setThreshold(e.target.value);
                      addLog(`Threshold updated to ${e.target.value}A`, "warn");
                    }}
                    style={{
                      flex: 1, background: "rgba(0,0,0,.4)", border: `1px solid ${T.border}`,
                      borderRadius: 6, padding: "10px 12px", color: T.accent2,
                      fontFamily: "'Orbitron',monospace", fontSize: 18, fontWeight: 700, outline: "none",
                    }}
                  />
                  <span style={{ color: T.muted, fontSize: 12, letterSpacing: 1, flexShrink: 0 }}>AMPS MAX</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── ANALYTICS CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 22 }}>
          <AnalyticsCard label="🔋 Total Energy" value={`${fmt(analytics.totalEnergy, 4)} kWh`} sub="Since session start" color={T.text} />
          <AnalyticsCard label="⚡ Peak Power"   value={`${fmt(analytics.peakPower, 1)} W`}    sub="Session maximum"    color={T.warn} />
          <AnalyticsCard label="📊 Avg Usage"    value={`${fmt(analytics.avgPower, 1)} W`}     sub="Rolling average"   color={T.accent} />
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: T.muted, textTransform: "uppercase", marginBottom: 4 }}>✅ Efficiency</div>
            <EfficiencyRing score={analytics.efficiency} />
          </div>
        </div>

        {/* ── STATUS + LOG ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, background: T.panel2 }}>
              <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 11, letterSpacing: 3, color: T.accent }}>🖥 SYSTEM STATUS</div>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <StatusRow dotColor={T.accent3} blink   name="SENSOR MODULE"    desc="ESP32 / API Connected"  val="ACTIVE"   />
              <StatusRow dotColor={T.accent}         name="DATA STREAM"     desc="Real-time JWT feed"     val="NOMINAL"  />
              <StatusRow dotColor={isOverload ? T.warn : T.gold} blink={isOverload} name="OVERLOAD GUARD" desc="Threshold monitor" val={isOverload ? "TRIGGERED" : "STANDBY"} valColor={isOverload ? T.warn : undefined} />
              <StatusRow dotColor={T.accent3}        name="ANALYTICS ENGINE" desc="Processing pipeline" val="RUNNING" />
            </div>
          </div>

          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, background: T.panel2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 11, letterSpacing: 3, color: T.accent }}>📋 EVENT LOG</div>
              <div style={{ fontSize: 10, padding: "3px 10px", border: `1px solid ${T.border}`, borderRadius: 20, color: T.muted }}>{logs.length} EVENTS</div>
            </div>
            <div style={{ padding: "14px 16px", maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
              {logs.map(l => <LogItem key={l.id} {...l} />)}
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer style={{ marginTop: 26, paddingTop: 18, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: T.muted, letterSpacing: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent3, boxShadow: `0 0 6px ${T.accent3}` }} />
            POWERGRID MONITOR v2.0 — ESP32 READY
          </div>
          <div>DATA POINTS: <span style={{ color: T.accent, fontFamily: "'Orbitron',monospace" }}>{dataCount}</span></div>
          <div>LAST UPDATE: {lastUpdate}</div>
        </footer>

      </div>
    </div>
  );
}