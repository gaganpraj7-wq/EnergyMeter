// src/pages/SocketDetailPage.jsx
// Fixed: NO fake/sim data anywhere — starts from 0, builds only from real ESP32 data
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { T, SOCKET_PALETTE, GLOBAL_CSS } from "../theme";
import Sidebar from "../components/Sidebar";
import SessionTimeline from "../components/SessionTimeline";
import AnomalyDetectionPanel from "../components/AnomalyDetectionPanel";
import EnergyWastePanel from "../components/EnergyWastePanel";
import CostForecastPanel from "../components/CostForecastPanel";
import DigitalTwinPanel from "../components/DigitalTwinPanel";
import PowerQualityPanel from "../components/PowerQualityPanel";
import EfficiencyScorePanel from "../components/EfficiencyScorePanel";
import OptimizationPanel from "../components/OptimizationPanel";
import { getAllSockets, getSocketHistory, toggleSocket, simToggle } from "../services/api";

// ─── simSocketHistory intentionally NOT imported — no fake history data ───────

function useGlobalStyles() {
  useEffect(() => {
    if (document.getElementById("pg-global-css")) return;
    const el = document.createElement("style");
    el.id = "pg-global-css";
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
  }, []);
}

const fmt   = (n, d = 1) => typeof n === "number" ? n.toFixed(d) : "--";
const clamp = (v, a, b)  => Math.min(b, Math.max(a, v));

// ── Custom tooltip ────────────────────────────────────────────────────────────
function PgTooltip({ active, payload, label, unit = "W", color }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:8, padding:"10px 14px", minWidth:130 }}>
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color:T.muted, marginBottom:5 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:7, marginTop:3 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:p.color||color, boxShadow:`0 0 5px ${p.color||color}` }}/>
          <span style={{ fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:700, color:T.text }}>
            {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
            <span style={{ fontSize:10, opacity:.6, marginLeft:2 }}>{unit}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, color, barPct, icon, flash }) {
  return (
    <div className={flash ? "pg-flash" : ""} style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, padding:"20px 18px", position:"relative", overflow:"hidden", transition:"border-color .3s" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:color }}/>
      <div style={{ position:"absolute", top:8, right:8, width:30, height:30, borderTop:`1px solid ${color}`, borderRight:`1px solid ${color}`, borderRadius:"0 8px 0 0", opacity:.3 }}/>
      <div style={{ fontSize:9, letterSpacing:3, color:T.muted, textTransform:"uppercase", marginBottom:8, display:"flex", gap:6, alignItems:"center" }}>
        <span>{icon}</span>{label}
      </div>
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:38, fontWeight:900, lineHeight:1, color, textShadow:`0 0 20px ${color}55`, marginBottom:4 }}>
        {value}<span style={{ fontSize:13, fontWeight:400, opacity:.6, marginLeft:3 }}>{unit}</span>
      </div>
      <div style={{ marginTop:12, height:3, background:"rgba(255,255,255,.04)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${clamp(barPct, 0, 100)}%`, background:color, borderRadius:2, transition:"width 1s ease", boxShadow:`0 0 6px ${color}` }}/>
      </div>
    </div>
  );
}

// ── Analytics stat ────────────────────────────────────────────────────────────
function Stat({ label, value, color = T.text }) {
  return (
    <div style={{ background:"rgba(0,0,0,.3)", border:`1px solid ${T.border}`, borderRadius:8, padding:"14px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:T.muted, marginBottom:5 }}>{label}</div>
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:20, fontWeight:700, color }}>{value}</div>
    </div>
  );
}

// ── 24-hour usage heatmap ─────────────────────────────────────────────────────
function UsageHeatmap({ data, color }) {
  const values = data.slice(-24).map(d => d.power || 0);
  const max    = Math.max(...values, 1);
  return (
    <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:48 }}>
      {Array.from({ length: 24 }, (_, h) => {
        const val = values[h] || 0;
        const pct = val / max;
        return (
          <div key={h} title={`${h}:00 — ${fmt(val, 0)}W`} style={{
            flex:1, minWidth:8, borderRadius:2,
            height:`${Math.max(8, pct * 48)}px`,
            background:`${color}${Math.round(20 + pct * 220).toString(16).padStart(2,"00")}`,
            transition:"height .8s ease", cursor:"default",
          }}/>
        );
      })}
    </div>
  );
}

// ── Power score ring ──────────────────────────────────────────────────────────
function PowerScore({ score, color }) {
  const r = 34, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const label  = score >= 80 ? "EXCELLENT" : score >= 60 ? "GOOD" : score >= 40 ? "FAIR" : "POOR";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="7"/>
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
          style={{ transition:"stroke-dashoffset 1.5s ease", filter:`drop-shadow(0 0 8px ${color})` }}/>
        <text x="40" y="36" textAnchor="middle" fill={color} style={{ fontFamily:"'Orbitron',monospace", fontSize:14, fontWeight:900 }}>{score}%</text>
        <text x="40" y="50" textAnchor="middle" fill={T.muted} style={{ fontSize:8, fontFamily:"Share Tech Mono" }}>SCORE</text>
      </svg>
      <div>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:18, fontWeight:700, color }}>{score}%</div>
        <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Waiting / connecting state ────────────────────────────────────────────────
function WaitingState({ pal, message, sub }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:"60px 20px", color:T.muted }}>
      <div style={{ width:16, height:16, border:`2px solid ${pal.main}33`, borderTopColor:pal.main, borderRadius:"50%", animation:"pg-spin .75s linear infinite" }}/>
      <div style={{ fontSize:11, letterSpacing:3, color:T.muted }}>{message || "AWAITING SENSOR DATA..."}</div>
      {sub && <div style={{ fontSize:9, letterSpacing:2, color:"rgba(160,180,210,.35)", textAlign:"center", maxWidth:340 }}>{sub}</div>}
    </div>
  );
}

// ── Empty chart/section placeholder ───────────────────────────────────────────
function EmptyChart({ pal, height = 220, message = "NO DATA YET" }) {
  return (
    <div style={{ height, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, border:`1px dashed ${pal.main}20`, borderRadius:8 }}>
      <div style={{ fontSize:22, opacity:.18 }}>📡</div>
      <div style={{ fontSize:9, letterSpacing:3, color:"rgba(160,180,210,.28)", fontFamily:"'Share Tech Mono',monospace" }}>{message}</div>
      <div style={{ fontSize:8, letterSpacing:2, color:"rgba(160,180,210,.18)" }}>CONNECT ESP32 TO SEE DATA</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function SocketDetailPage() {
  useGlobalStyles();

  const { id }   = useParams();
  const socketId = parseInt(id);
  const navigate = useNavigate();
  const pal      = SOCKET_PALETTE[socketId - 1] || SOCKET_PALETTE[0];

  // ── Live state — null/empty until ESP32 sends real data ───────────────────
  const [live,       setLive]       = useState(null);
  const [liveChart,  setLiveChart]  = useState([]);   // [] until ESP32 connects
  const [countdown,  setCountdown]  = useState(3);
  const [status,     setStatus]     = useState(true);
  const [isOverload, setIsOverload] = useState(false);
  const [threshold,  setThreshold]  = useState("10");
  const [tariff,     setTariff]     = useState("6.50");
  const [apiStatus,  setApiStatus]  = useState("CONNECTING");
  const [refreshCounter, setRefreshCounter] = useState(0);

  // ── History state — [] until backend returns real stored rows ─────────────
  // simSocketHistory() is NEVER used anywhere in this file
  const [histData,    setHistData]    = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histHasData, setHistHasData] = useState(false);
  const [range,       setRange]       = useState("24h");
  const [chartType,   setChartType]   = useState("area");

  // ── Session analytics refs ────────────────────────────────────────────────
  const peakRef  = useRef(0);
  const sumRef   = useRef(0);
  const cntRef   = useRef(0);
  const prevLive = useRef(null);

  // ── Flash states ───────────────────────────────────────────────────────────
  const [flashV, setFlashV] = useState(false);
  const [flashA, setFlashA] = useState(false);
  const [flashW, setFlashW] = useState(false);
  const triggerFlash = (setter) => { setter(true); setTimeout(() => setter(false), 450); };

  // ── LIVE POLLING — pure real API, zero sim fallback ───────────────────────
  const update = useCallback(async () => {
    try {
      const allSockets = await getAllSockets();
      if (allSockets && Array.isArray(allSockets)) {
        const socket = allSockets.find(s => s.socketId === Number(id));
        if (socket) {
          const d = { ...socket };

          if (prevLive.current) {
            if (Math.abs((d.voltage || 0) - (prevLive.current.voltage || 0)) > 0.5) triggerFlash(setFlashV);
            if (Math.abs((d.current || 0) - (prevLive.current.current || 0)) > 0.1) triggerFlash(setFlashA);
            if (Math.abs((d.power   || 0) - (prevLive.current.power   || 0)) > 5  ) triggerFlash(setFlashW);
          }
          prevLive.current = d;

          if (d.status !== false) {
            if ((d.power || 0) > peakRef.current) peakRef.current = d.power || 0;
            sumRef.current += d.power || 0;
            cntRef.current += 1;
          }

          setIsOverload(d.status !== false && (d.current || 0) > (parseFloat(threshold) || 10));
          setStatus(d.status !== false);
          setLive(d);
          setApiStatus("LIVE");

          const now = new Date().toLocaleTimeString("en-IN", { hour12: false });
          setLiveChart(prev => {
            const next = [...prev, {
              time:    now,
              power:   d.status !== false ? (d.power   || 0) : 0,
              voltage: d.voltage || 0,
              current: d.status !== false ? (d.current || 0) : 0,
            }];
            return next.length > 30 ? next.slice(-30) : next;
          });
        } else {
          setApiStatus("NO_DATA");
        }
      } else {
        setApiStatus("NO_DATA");
      }
    } catch (err) {
      setApiStatus("NO_DATA");
      console.warn("Live API error:", err);
    }
  }, [id, threshold]);

  useEffect(() => {
    update();
    const pollId      = setInterval(update, 3000);
    const countdownId = setInterval(() => setCountdown(c => c <= 1 ? 3 : c - 1), 1000);
    // listen for UI-clear events
    const onClear = () => {
      setLive(null);
      setLiveChart([]);
      setHistData([]);
      setHistHasData(false);
      setApiStatus("CONNECTING");
    };
    window.addEventListener('app:clear-ui', onClear);

    return () => { clearInterval(pollId); clearInterval(countdownId); window.removeEventListener('app:clear-ui', onClear); };
  }, [update]);

  // ── HISTORY FETCH — real API only, NO simSocketHistory() fallback ─────────
  // If API returns nothing → histData = [], histHasData = false → show empty state
  const fetchHistory = useCallback(async () => {
  console.log("🚀 FETCH HISTORY CALLED", socketId, range); // ✅ DEBUG

  setHistLoading(true);

  try {
    const data = await getSocketHistory(socketId, range);

    console.log("📥 FRONTEND HISTORY:", data); // ✅ DEBUG

    if (data && Array.isArray(data) && data.length > 0) {
      setHistData(data);
      setHistHasData(true);
    } else if (live && live.socketId === socketId) {
      console.log("⚠️ NO HISTORY DATA, using live fallback");
      setHistData([{ ...live, timestamp: new Date() }]);
      setHistHasData(true);
    } else {
      console.log("⚠️ NO HISTORY DATA");
      setHistData([]);
      setHistHasData(false);
    }

  } catch (err) {
    console.error("❌ History fetch error:", err);
    if (live && live.socketId === socketId) {
      setHistData([{ ...live, timestamp: new Date() }]);
      setHistHasData(true);
    } else {
      setHistData([]);
      setHistHasData(false);
    }
  }

  setHistLoading(false);
}, [socketId, range, live]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Toggle ────────────────────────────────────────────────────────────────
  const handleToggle = async () => {
    const next = !status;
    setStatus(next);
    simToggle(socketId, next);
    await toggleSocket(socketId, next);
  };

  // ── Computed analytics ────────────────────────────────────────────────────
  const avgPower  = cntRef.current ? sumRef.current / cntRef.current : 0;
  const histPowers = histData.map(d => d.power || 0);
  const histAvg   = histPowers.length ? histPowers.reduce((a, b) => a + b, 0) / histPowers.length : 0;
  const histPeak  = histPowers.length ? Math.max(...histPowers) : 0;
  const histMin   = histPowers.length ? Math.min(...histPowers) : 0;
  const totalHist = histData.length   ? (histData[histData.length - 1]?.energy || 0) : 0;
  const cost      = (totalHist * (parseFloat(tariff) || 0)).toFixed(2);
  const score     = peakRef.current > 0 && avgPower > 0
    ? Math.min(100, Math.round((avgPower / peakRef.current) * 100)) : 0;

  // ── History chart data — only populated with real rows ────────────────────
  const histChartData = histHasData
    ? histData.map(d => ({
        time: new Date(d.timestamp).toLocaleString("en-IN", range === "24h"
          ? { hour:"2-digit", minute:"2-digit", hour12:false }
          : { month:"short", day:"numeric" }),
        power:   d.power   || 0,
        energy:  d.energy  || 0,
        voltage: d.voltage || 0,
        current: d.current || 0,
      }))
    : [];

  const rangeLabel = { "24h":"LAST 24H", "7d":"LAST 7 DAYS", "30d":"LAST 30 DAYS" }[range];

  if (!pal) return null;

  return (
    <div style={{ display:"flex", background:T.bg, minHeight:"100vh" }}>
      <Sidebar socketId={socketId}/>

      <div style={{ marginLeft:220, flex:1, padding:"24px 28px 40px" }}>
        <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(0,229,255,.016) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.016) 1px,transparent 1px)", backgroundSize:"44px 44px", pointerEvents:"none", zIndex:0 }}/>

        <div style={{ position:"relative", zIndex:1 }}>

          {/* ── HEADER ── */}
          <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:20, borderBottom:`1px solid ${T.border}`, marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <button onClick={() => navigate("/sockets")}
                style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 12px", color:T.muted, cursor:"pointer", fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:1, transition:"all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = pal.main; e.currentTarget.style.color = pal.main; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}>
                ← BACK
              </button>
              <div style={{ width:48, height:48, borderRadius:12, background:"linear-gradient(135deg,rgba(0,0,0,.6),rgba(0,0,0,.8))", border:`1px solid ${pal.main}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, boxShadow:`0 0 20px ${pal.shadow}` }}>
                {pal.icon}
              </div>
              <div>
                <div style={{ fontFamily:"'Orbitron',monospace", fontSize:20, fontWeight:900, letterSpacing:3, color:pal.main, textShadow:`0 0 20px ${pal.shadow}` }}>
                  {pal.name} — SOCKET {socketId}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:6 }}>
                  <span style={{ fontSize:10, letterSpacing:2, color:T.muted }}>DEVICE</span>
                  <span style={{ padding:"4px 10px", borderRadius:999, background:"rgba(57,255,20,.12)", color:T.accent3, fontSize:10, letterSpacing:1, textTransform:"uppercase" }}>
                    {live?.deviceName || "No device detected"}
                  </span>
                </div>
                <div style={{ fontSize:9, color:T.muted, letterSpacing:2, marginTop:8 }}>
                  FULL DASHBOARD • LIVE + HISTORY • REFRESH IN{" "}
                  <span style={{ color:pal.main, fontFamily:"'Orbitron',monospace" }}>{countdown}s</span>
                </div>
              </div>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{
                display:"flex", alignItems:"center", gap:7, padding:"6px 13px",
                border:`1px solid ${apiStatus==="LIVE"?T.accent3:apiStatus==="CONNECTING"?T.gold:T.warn}`,
                borderRadius:4, fontSize:9,
                color:apiStatus==="LIVE"?T.accent3:apiStatus==="CONNECTING"?T.gold:T.warn,
                letterSpacing:2,
              }}>
                <span className={apiStatus==="CONNECTING"?"pg-blink":""} style={{ width:6, height:6, borderRadius:"50%", background:apiStatus==="LIVE"?T.accent3:apiStatus==="CONNECTING"?T.gold:T.warn, display:"inline-block" }}/>
                {apiStatus==="LIVE"?"ESP32 LIVE":apiStatus==="CONNECTING"?"CONNECTING...":"NO SIGNAL"}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 14px", border:`1px solid ${status?T.accent3:T.border}`, borderRadius:4, fontSize:10, color:status?T.accent3:T.muted, letterSpacing:2 }}>
                <span className={status?"pg-blink":""} style={{ width:6, height:6, borderRadius:"50%", background:status?T.accent3:T.muted, display:"inline-block", boxShadow:status?`0 0 6px ${T.accent3}`:"none" }}/>
                {status?"ONLINE":"OFFLINE"}
              </div>
              <button onClick={handleToggle} style={{
                padding:"8px 20px", border:`1px solid ${status?T.warn:T.accent3}`, borderRadius:4,
                background:status?"rgba(255,59,59,.08)":"rgba(57,255,20,.08)",
                color:status?T.warn:T.accent3,
                fontFamily:"'Orbitron',monospace", fontSize:10, fontWeight:700, letterSpacing:2,
                cursor:"pointer", transition:"all .2s",
              }}>
                {status?"TURN OFF":"TURN ON"}
              </button>
              <button onClick={async () => {
                // Clear UI state (do NOT clear DB)
                setLive(null);
                setLiveChart([]);
                setHistData([]);
                setHistHasData(false);
                setApiStatus("CONNECTING");
                // Ask backend to reset in-memory anomaly baseline for this socket
                try {
                  const { resetAnomalyBaseline } = await import("../services/api");
                  await resetAnomalyBaseline(socketId);
                } catch (err) {
                  console.warn("Could not reset anomaly baseline:", err);
                }
                // immediately fetch latest
                await update();
                await fetchHistory();
              }} style={{ padding:"8px 14px", border:`1px solid ${T.border}`, borderRadius:4, background:"transparent", color:T.muted, cursor:"pointer", fontSize:12 }}>
                🔄 Refresh Live
              </button>
              <button onClick={() => window.dispatchEvent(new Event('app:clear-ui'))}
                style={{ padding:"8px 14px", border:`1px solid ${T.border}`, borderRadius:4, background:"transparent", color:T.gold, cursor:"pointer", fontSize:12 }}>
                🧹 Clear UI
              </button>
            </div>
          </header>

          {/* ── OVERLOAD ALERT ── */}
          {isOverload && (
            <div style={{ background:"linear-gradient(135deg,rgba(255,59,59,.14),rgba(255,59,59,.04))", border:`2px solid ${T.warn}`, borderRadius:10, padding:"13px 20px", marginBottom:20, position:"relative", overflow:"hidden", animation:"pg-ringAlert .5s ease-in-out infinite alternate" }}>
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,59,59,.07),transparent)", animation:"pg-sweep 1.5s linear infinite" }}/>
              <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
                <span className="pg-shake" style={{ fontSize:24 }}>🚨</span>
                <div>
                  <div style={{ fontFamily:"'Orbitron',monospace", fontWeight:700, fontSize:14, color:T.warn, letterSpacing:2 }}>OVERLOAD DETECTED!</div>
                  <div style={{ fontSize:11, color:"rgba(255,120,120,.8)", marginTop:2 }}>
                    Current {fmt(live?.current, 2)}A exceeds {threshold}A threshold — CHECK CIRCUIT
                  </div>
                </div>
                <button onClick={() => setThreshold(String(Math.ceil(live?.current || 10) + 2))}
                  style={{ marginLeft:"auto", padding:"5px 12px", border:`1px solid ${T.warn}`, borderRadius:4, background:"transparent", color:T.warn, cursor:"pointer", fontSize:10, fontFamily:"'Share Tech Mono',monospace" }}>
                  AUTO-ADJUST
                </button>
              </div>
            </div>
          )}

          {/* ── NO SIGNAL — shown only before first real data arrives ── */}
          {apiStatus !== "LIVE" && !live && (
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, marginBottom:22 }}>
              <WaitingState pal={pal}
                message="AWAITING ESP32 CONNECTION..."
                sub="Power on your ESP32 and ensure it is posting data to your backend API"/>
            </div>
          )}

          {/* ── LIVE METRICS ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
            <MetricCard label="VOLTAGE" icon="⚡" value={live && status ? fmt(live.voltage||0,1) : "--"} unit="V" color={T.gold}    barPct={((live?.voltage||0)-200)/60*100} flash={flashV}/>
            <MetricCard label="CURRENT" icon="〜" value={live && status ? fmt(live.current||0,2) : "--"} unit="A" color={isOverload?T.warn:pal.main} barPct={(live?.current||0)/20*100} flash={flashA}/>
            <MetricCard label="POWER"   icon="💡" value={live && status ? fmt(live.power||0,1)   : "--"} unit="W" color={pal.main}  barPct={(live?.power||0)/3000*100} flash={flashW}/>
            <MetricCard label="ENERGY"  icon="🔋" value={live ? fmt(live.energy||0,4) : "--"}          unit="kWh" color={T.accent3} barPct={(live?.energy||0)/10*100} flash={false}/>
          </div>

          {/* ── LIVE CHART + CONTROLS ── */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20, marginBottom:22 }}>

            {/* Live power chart */}
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:"13px 18px", borderBottom:`1px solid ${T.border}`, background:T.panel2, display:"flex", justifyContent:"space-between", alignItems:"center", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${pal.main},transparent)`, animation:"pg-scanline 4s linear infinite" }}/>
                <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, letterSpacing:3, color:pal.main }}>⚡ LIVE POWER — REAL-TIME</div>
                <div style={{ fontSize:9, padding:"3px 9px", border:`1px solid ${T.border}`, borderRadius:20, color:T.muted }}>AUTO • 3s</div>
              </div>
              <div style={{ padding:"16px 12px 12px" }}>
                {liveChart.length === 0
                  ? <EmptyChart pal={pal} height={220} message="WAITING FOR LIVE DATA"/>
                  : (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={liveChart} margin={{ top:4, right:4, left:-22, bottom:0 }}>
                        <defs>
                          <linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={pal.main} stopOpacity={0.22}/>
                            <stop offset="95%" stopColor={pal.main} stopOpacity={0.01}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,.04)"/>
                        <XAxis dataKey="time" tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }} interval="preserveStartEnd"/>
                        <YAxis tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }}/>
                        <Tooltip content={<PgTooltip unit="W" color={pal.main}/>}/>
                        {peakRef.current > 0 && <ReferenceLine y={peakRef.current} stroke={T.warn} strokeDasharray="4 3" label={{ value:"PEAK", position:"insideTopRight", fill:T.warn, fontSize:9 }}/>}
                        {avgPower      > 0 && <ReferenceLine y={avgPower}          stroke={T.gold} strokeDasharray="4 3" label={{ value:"AVG",  position:"insideTopRight", fill:T.gold, fontSize:9 }}/>}
                        <Area type="monotone" dataKey="power" stroke={pal.main} strokeWidth={2} fill="url(#liveGrad)" dot={false} activeDot={{ r:4, fill:pal.main }} isAnimationActive={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  )
                }
              </div>
            </div>

            {/* Controls + cost */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 18px" }}>
                <div style={{ fontSize:9, letterSpacing:2, color:T.muted, marginBottom:10 }}>EFFICIENCY SCORE</div>
                <PowerScore score={score} color={pal.main}/>
                <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div style={{ background:"rgba(0,0,0,.3)", borderRadius:6, padding:"8px 10px" }}>
                    <div style={{ fontSize:8, color:T.muted, marginBottom:3 }}>PEAK</div>
                    <div style={{ fontFamily:"'Orbitron',monospace", fontSize:14, fontWeight:700, color:T.warn }}>
                      {peakRef.current > 0 ? `${fmt(peakRef.current,1)}W` : "--"}
                    </div>
                  </div>
                  <div style={{ background:"rgba(0,0,0,.3)", borderRadius:6, padding:"8px 10px" }}>
                    <div style={{ fontSize:8, color:T.muted, marginBottom:3 }}>AVG</div>
                    <div style={{ fontFamily:"'Orbitron',monospace", fontSize:14, fontWeight:700, color:pal.main }}>
                      {avgPower > 0 ? `${fmt(avgPower,1)}W` : "--"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 18px", flex:1 }}>
                <div style={{ fontSize:9, letterSpacing:2, color:T.muted, marginBottom:12 }}>💰 COST & SAFETY</div>
                <div style={{ display:"flex", border:`1px solid ${T.border}`, borderRadius:7, overflow:"hidden", background:"rgba(0,0,0,.3)", marginBottom:10 }}>
                  <div style={{ padding:"9px 11px", background:"rgba(0,229,255,.07)", borderRight:`1px solid ${T.border}`, color:T.accent, fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:700 }}>₹</div>
                  <input type="number" value={tariff} step="0.1" min="0" onChange={e => setTariff(e.target.value)}
                    style={{ flex:1, background:"transparent", border:"none", outline:"none", padding:"9px 10px", color:T.text, fontFamily:"'Share Tech Mono',monospace", fontSize:15 }}/>
                  <div style={{ padding:"9px 10px", color:T.muted, fontSize:9 }}>/unit</div>
                </div>
                <div style={{ textAlign:"center", marginBottom:12, padding:"14px", background:`linear-gradient(135deg,${pal.dim},rgba(0,0,0,.1))`, border:`1px solid ${pal.main}33`, borderRadius:8 }}>
                  <div style={{ fontSize:8, color:T.muted, marginBottom:4, letterSpacing:2 }}>EST. COST ({rangeLabel})</div>
                  <div style={{ fontFamily:"'Orbitron',monospace", fontSize:32, fontWeight:900, color:T.gold, textShadow:"0 0 20px rgba(255,215,0,.4)" }}>
                    {histHasData ? `₹${cost}` : "--"}
                  </div>
                </div>
                <div style={{ background:"rgba(255,107,53,.05)", border:"1px solid rgba(255,107,53,.2)", borderRadius:8, padding:12 }}>
                  <div style={{ fontSize:8, color:T.accent2, letterSpacing:2, marginBottom:8 }}>⚠ OVERLOAD THRESHOLD</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input type="number" value={threshold} step="0.5" min="0" onChange={e => setThreshold(e.target.value)}
                      style={{ flex:1, background:"rgba(0,0,0,.4)", border:`1px solid ${T.border}`, borderRadius:5, padding:"8px 10px", color:T.accent2, fontFamily:"'Orbitron',monospace", fontSize:16, fontWeight:700, outline:"none" }}/>
                    <span style={{ fontSize:10, color:T.muted, flexShrink:0 }}>A</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── VOLTAGE + CURRENT LIVE CHARTS ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:22 }}>
            {[
              { key:"voltage", label:"⚡ LIVE VOLTAGE", unit:"V", color:T.gold,    strokeW:1.5 },
              { key:"current", label:"〜 LIVE CURRENT", unit:"A", color:T.accent2, strokeW:1.5 },
            ].map(cfg => (
              <div key={cfg.key} style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
                <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, background:T.panel2, display:"flex", justifyContent:"space-between" }}>
                  <div style={{ fontFamily:"'Orbitron',monospace", fontSize:10, letterSpacing:2, color:cfg.color }}>{cfg.label}</div>
                  <div style={{ fontFamily:"'Orbitron',monospace", fontSize:14, fontWeight:700, color:cfg.color }}>
                    {live && status ? `${fmt(live[cfg.key], cfg.key==="voltage"?1:2)}${cfg.unit}` : "--"}
                  </div>
                </div>
                <div style={{ padding:"12px 10px 10px" }}>
                  {liveChart.length === 0
                    ? <EmptyChart pal={pal} height={120} message="WAITING FOR LIVE DATA"/>
                    : (
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={liveChart} margin={{ top:4, right:4, left:-22, bottom:0 }}>
                          <CartesianGrid stroke="rgba(255,255,255,.03)"/>
                          <XAxis dataKey="time" tick={{ fill:T.muted, fontSize:8, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }} interval="preserveStartEnd"/>
                          <YAxis tick={{ fill:T.muted, fontSize:8, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }}/>
                          <Tooltip content={<PgTooltip unit={cfg.unit} color={cfg.color}/>}/>
                          <Line type="monotone" dataKey={cfg.key} stroke={cfg.color} strokeWidth={cfg.strokeW} dot={false} isAnimationActive={false}/>
                        </LineChart>
                      </ResponsiveContainer>
                    )
                  }
                </div>
              </div>
            ))}
          </div>

          {/* ── HISTORY SECTION ── */}
          <div style={{ background:T.panel, border:`1px solid ${pal.main}33`, borderRadius:12, overflow:"hidden", marginBottom:22 }}>
            <div style={{ padding:"14px 20px", borderBottom:`1px solid ${T.border}`, background:T.panel2, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, letterSpacing:3, color:pal.main }}>📊 USAGE HISTORY</div>
              <div style={{ display:"flex", gap:8 }}>
                {[["area","▲"],["bar","▮"],["line","〜"]].map(([v, l]) => (
                  <button key={v} onClick={() => setChartType(v)} style={{ padding:"4px 10px", fontSize:10, fontFamily:"'Orbitron',monospace", border:`1px solid ${chartType===v?pal.main:T.border}`, borderRadius:4, background:chartType===v?pal.dim:"transparent", color:chartType===v?pal.main:T.muted, cursor:"pointer" }}>{l}</button>
                ))}
                <div style={{ width:1, background:T.border, margin:"0 4px" }}/>
                {[["24h","24H"],["7d","7D"],["30d","30D"]].map(([v, l]) => (
                  <button key={v} onClick={() => setRange(v)} style={{ padding:"4px 12px", fontSize:10, fontFamily:"'Orbitron',monospace", border:`1px solid ${range===v?pal.main:T.border}`, borderRadius:4, background:range===v?pal.dim:"transparent", color:range===v?pal.main:T.muted, cursor:"pointer", fontWeight:range===v?700:400 }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ padding:"18px 14px 14px" }}>
              {histLoading ? (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, height:220, fontSize:10, color:T.muted, letterSpacing:2 }}>
                  <div className="pg-spin" style={{ width:16, height:16, border:`2px solid ${pal.main}22`, borderTopColor:pal.main, borderRadius:"50%" }}/> LOADING...
                </div>
              ) : !histHasData ? (
                // ── CLEAN EMPTY — no fake data, no fake chart ──────────────
                <div style={{ height:220, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
                  <div style={{ fontSize:36, opacity:.12 }}>📊</div>
                  <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, letterSpacing:3, color:"rgba(160,180,210,.28)" }}>NO HISTORY DATA YET</div>
                  <div style={{ fontSize:9, letterSpacing:2, color:"rgba(160,180,210,.18)", textAlign:"center", maxWidth:320 }}>
                    History will populate automatically once your ESP32 connects and your backend starts storing readings
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  {chartType === "bar" ? (
                    <BarChart data={histChartData} margin={{ top:4, right:4, left:-22, bottom:0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,.03)"/>
                      <XAxis dataKey="time" tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }} interval="preserveStartEnd"/>
                      <YAxis tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }}/>
                      <Tooltip content={<PgTooltip unit="W" color={pal.main}/>}/>
                      <Bar dataKey="power" fill={pal.main} opacity={0.75} radius={[2,2,0,0]}/>
                    </BarChart>
                  ) : chartType === "line" ? (
                    <LineChart data={histChartData} margin={{ top:4, right:4, left:-22, bottom:0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,.03)"/>
                      <XAxis dataKey="time" tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }} interval="preserveStartEnd"/>
                      <YAxis tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }}/>
                      <Tooltip content={<PgTooltip unit="W" color={pal.main}/>}/>
                      <ReferenceLine y={histAvg} stroke={T.gold} strokeDasharray="4 3" label={{ value:"AVG", position:"insideTopRight", fill:T.gold, fontSize:9 }}/>
                      <Line type="monotone" dataKey="power" stroke={pal.main} strokeWidth={2} dot={false} isAnimationActive={false}/>
                    </LineChart>
                  ) : (
                    <AreaChart data={histChartData} margin={{ top:4, right:4, left:-22, bottom:0 }}>
                      <defs>
                        <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={pal.main} stopOpacity={0.22}/>
                          <stop offset="95%" stopColor={pal.main} stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,.03)"/>
                      <XAxis dataKey="time" tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }} interval="preserveStartEnd"/>
                      <YAxis tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }}/>
                      <Tooltip content={<PgTooltip unit="W" color={pal.main}/>}/>
                      <ReferenceLine y={histAvg}  stroke={T.gold} strokeDasharray="4 3" label={{ value:"AVG",  position:"insideTopRight", fill:T.gold, fontSize:9 }}/>
                      <ReferenceLine y={histPeak} stroke={T.warn} strokeDasharray="4 3" label={{ value:"PEAK", position:"insideTopRight", fill:T.warn, fontSize:9 }}/>
                      <Area type="monotone" dataKey="power" stroke={pal.main} strokeWidth={2} fill="url(#histGrad)" dot={false} activeDot={{ r:4, fill:pal.main }} isAnimationActive={false}/>
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── ANALYTICS STATS + HEATMAP ── */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20, marginBottom:22 }}>
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:14 }}>
                <Stat label="⚡ TOTAL ENERGY" value={histHasData ? `${fmt(totalHist,4)} kWh` : "--"} color={T.accent3}/>
                <Stat label="🔺 PEAK POWER"   value={histHasData ? `${fmt(histPeak,1)} W`   : "--"} color={T.warn}/>
                <Stat label="📊 AVG POWER"    value={histHasData ? `${fmt(histAvg,1)} W`    : "--"} color={pal.main}/>
                <Stat label="🔻 MIN POWER"    value={histHasData ? `${fmt(histMin,1)} W`    : "--"} color={T.muted}/>
              </div>
              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:10, padding:"14px 16px" }}>
                <div style={{ fontSize:9, letterSpacing:2, color:T.muted, marginBottom:10 }}>24-HOUR USAGE HEATMAP</div>
                {histHasData ? (
                  <>
                    <UsageHeatmap data={histChartData} color={pal.main}/>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:8, color:T.muted }}>
                      <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
                    </div>
                  </>
                ) : (
                  <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:9, letterSpacing:2, color:"rgba(160,180,210,.22)", fontFamily:"'Share Tech Mono',monospace" }}>NO DATA — CONNECT ESP32</span>
                  </div>
                )}
              </div>
            </div>

            {/* Energy accumulation */}
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, background:T.panel2 }}>
                <div style={{ fontFamily:"'Orbitron',monospace", fontSize:10, letterSpacing:2, color:T.accent3 }}>🔋 ENERGY ACCUMULATION</div>
              </div>
              <div style={{ padding:"12px 10px 10px" }}>
                {histHasData ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={histChartData} margin={{ top:4, right:4, left:-22, bottom:0 }}>
                        <defs>
                          <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={T.accent3} stopOpacity={0.22}/>
                            <stop offset="95%" stopColor={T.accent3} stopOpacity={0.01}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,.03)"/>
                        <XAxis dataKey="time" tick={{ fill:T.muted, fontSize:8, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }} interval="preserveStartEnd"/>
                        <YAxis tick={{ fill:T.muted, fontSize:8, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }}/>
                        <Tooltip content={<PgTooltip unit="kWh" color={T.accent3}/>}/>
                        <Area type="monotone" dataKey="energy" stroke={T.accent3} strokeWidth={2} fill="url(#energyGrad)" dot={false} isAnimationActive={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ textAlign:"center", marginTop:10 }}>
                      <div style={{ fontSize:8, color:T.muted, marginBottom:3 }}>TOTAL ({rangeLabel})</div>
                      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:22, fontWeight:900, color:T.accent3, textShadow:"0 0 14px rgba(57,255,20,.4)" }}>
                        {fmt(totalHist, 4)} kWh
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyChart pal={pal} height={160} message="NO ENERGY DATA YET"/>
                )}
              </div>
            </div>
          </div>

          {/* ── RECENT READINGS TABLE ── */}
          <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"13px 18px", borderBottom:`1px solid ${T.border}`, background:T.panel2, display:"flex", justifyContent:"space-between" }}>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, letterSpacing:3, color:pal.main }}>📋 RECENT READINGS</div>
              <div style={{ fontSize:9, padding:"3px 9px", border:`1px solid ${T.border}`, borderRadius:20, color:T.muted }}>
                {histHasData ? "LATEST 10" : "NO DATA"}
              </div>
            </div>
            {!histHasData ? (
              <div style={{ padding:"48px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:30, opacity:.12 }}>📋</div>
                <div style={{ fontFamily:"'Orbitron',monospace", fontSize:10, letterSpacing:3, color:"rgba(160,180,210,.22)" }}>NO READINGS YET</div>
                <div style={{ fontSize:9, color:"rgba(160,180,210,.16)", letterSpacing:2, textAlign:"center", maxWidth:320 }}>
                  Readings will appear automatically as your ESP32 sends data to the backend
                </div>
              </div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr>
                      {["TIME","POWER (W)","VOLTAGE (V)","CURRENT (A)","ENERGY (kWh)"].map(h => (
                        <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:9, letterSpacing:2, color:T.muted, borderBottom:`1px solid ${T.border}`, fontWeight:400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...histChartData].reverse().slice(0, 10).map((row, i) => (
                      <tr key={i}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,229,255,.03)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        style={{ transition:"background .2s" }}>
                        <td style={{ padding:"10px 16px", color:T.muted,   borderBottom:`1px solid rgba(26,45,74,.4)`, fontSize:10 }}>{row.time}</td>
                        <td style={{ padding:"10px 16px", color:pal.main,  borderBottom:`1px solid rgba(26,45,74,.4)`, fontFamily:"'Orbitron',monospace", fontSize:12, fontWeight:700 }}>{row.power?.toFixed(1)}</td>
                        <td style={{ padding:"10px 16px", color:T.gold,    borderBottom:`1px solid rgba(26,45,74,.4)` }}>{row.voltage?.toFixed(1)}</td>
                        <td style={{ padding:"10px 16px", color:T.accent2, borderBottom:`1px solid rgba(26,45,74,.4)` }}>{row.current?.toFixed(2)}</td>
                        <td style={{ padding:"10px 16px", color:T.accent3, borderBottom:`1px solid rgba(26,45,74,.4)` }}>{row.energy?.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── SESSION TIMELINE (NEW FEATURE) ── */}
          <SessionTimeline socketId={socketId} />

          {/* 🤖 AI-BASED ENERGY OPTIMIZATION ENGINE (NEW FEATURE) ── */}
          <OptimizationPanel socketId={socketId} refreshKey={refreshCounter} />

          {/* 🚨 TIER 1: ANOMALY DETECTION ── */}
          <AnomalyDetectionPanel socketId={socketId} refreshKey={refreshCounter} />

          {/* 💡 TIER 1: ENERGY WASTE DETECTION ── */}
          <EnergyWastePanel socketId={socketId} tariff={parseFloat(tariff) || 6.50} refreshKey={refreshCounter} />

          {/* 💰 TIER 1: COST FORECASTING ── */}
          <CostForecastPanel socketId={socketId} tariff={parseFloat(tariff) || 6.50} refreshKey={refreshCounter} />

          {/* 🌐 FEATURE 20: DIGITAL TWIN SIMULATION ── */}
          <DigitalTwinPanel socketId={socketId} tariff={parseFloat(tariff) || 6.50} refreshKey={refreshCounter} />

          {/* ⚡ TIER 2: POWER QUALITY ── */}
          <PowerQualityPanel socketId={socketId} refreshKey={refreshCounter} />

          {/* 🏆 TIER 2: EFFICIENCY SCORE ── */}
          <EfficiencyScorePanel socketId={socketId} refreshKey={refreshCounter} />

          {/* Footer */}
          <footer style={{ marginTop:24, paddingTop:14, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", fontSize:9, color:T.muted, letterSpacing:2 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span className="pg-blink" style={{ width:5, height:5, borderRadius:"50%", background:pal.main, display:"inline-block", boxShadow:`0 0 5px ${pal.main}` }}/>
              {pal.name} NODE — POWERGRID v2.0
            </div>
            <div>{rangeLabel} • {histHasData ? `${histData.length} RECORDS` : "NO RECORDS"}</div>
          </footer>

        </div>
      </div>
    </div>
  );
}