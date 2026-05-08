// src/pages/MultiSocketDashboard.jsx
// MAIN HUB — Login → this page → click socket → SocketDetailPage
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { T, SOCKET_PALETTE, GLOBAL_CSS } from "../theme";
import Sidebar from "../components/Sidebar";
import { getAllSockets, simAllSockets, toggleSocket, simToggle } from "../services/api";

function useGlobalStyles() {
  useEffect(() => {
    if (document.getElementById("pg-global-css")) return;
    const el = document.createElement("style");
    el.id = "pg-global-css"; el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
  }, []);
}

const fmt = (n, d = 1) => typeof n === "number" ? n.toFixed(d) : "--";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ── Waveform bars (visual decoration on active sockets) ─────────────────────
function Waveform({ color, active }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2, height:20 }}>
      {Array.from({length:8}).map((_,i) => (
        <div key={i} style={{
          width:3, borderRadius:2,
          background: active ? color : "rgba(255,255,255,.1)",
          height: active ? `${20 + Math.sin(i*0.9)*14}px` : "4px",
          animation: active ? `pg-waveform ${0.6 + i*0.1}s ease-in-out infinite alternate` : "none",
          animationDelay: `${i*0.07}s`,
          transition:"height .4s ease",
        }}/>
      ))}
    </div>
  );
}

// ── Circular power gauge ─────────────────────────────────────────────────────
function PowerGauge({ power, maxPower = 3000, color, active }) {
  const r = 36, circ = 2 * Math.PI * r;
  const pct = active ? clamp(power / maxPower, 0, 1) : 0;
  const offset = circ - pct * circ;
  return (
    <svg width="86" height="86" viewBox="0 0 86 86">
      <circle cx="43" cy="43" r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="7"/>
      <circle cx="43" cy="43" r={r} fill="none" stroke={active ? color : T.border} strokeWidth="7"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 43 43)"
        style={{ transition:"stroke-dashoffset 1.2s ease, stroke .4s", filter: active ? `drop-shadow(0 0 6px ${color})` : "none" }}/>
      <text x="43" y="38" textAnchor="middle" fill={active ? color : T.muted}
        style={{ fontFamily:"'Orbitron',monospace", fontSize:12, fontWeight:900 }}>
        {active ? fmt(power, 0) : "--"}
      </text>
      <text x="43" y="52" textAnchor="middle" fill={T.muted}
        style={{ fontSize:9, fontFamily:"Share Tech Mono" }}>
        {active ? "W" : "OFF"}
      </text>
    </svg>
  );
}

// ── Socket Card ───────────────────────────────────────────────────────────────
function SocketCard({ socket, onToggle, onClick, delay = 0 }) {
  const { socketId, voltage, current, power, energy, status } = socket;
  const pal = SOCKET_PALETTE[socketId - 1];
  const isOverload = status && current > 10;
  const cardColor  = isOverload ? T.warn : !status ? T.border : pal.main;

  const [flashing, setFlashing] = useState(false);
  const prevPow = useRef(power);
  useEffect(() => {
    if (Math.abs((power||0) - (prevPow.current||0)) > 5) {
      setFlashing(true); setTimeout(() => setFlashing(false), 450);
    }
    prevPow.current = power;
  }, [power]);

  return (
    <div
      className={flashing ? "pg-flash" : ""}
      style={{
        background: `linear-gradient(160deg, ${T.panel} 0%, rgba(6,10,18,.95) 100%)`,
        border: `1px solid ${isOverload ? T.warn : status ? pal.main+"44" : T.border}`,
        borderRadius: 16, padding: "22px 20px",
        position: "relative", overflow: "hidden",
        cursor: "pointer",
        transition: "transform .2s, box-shadow .3s, border-color .3s",
        boxShadow: status ? `0 0 30px ${pal.shadow}33, 0 4px 24px rgba(0,0,0,.4)` : "0 4px 24px rgba(0,0,0,.3)",
        animation: `pg-cardIn .5s ${delay}s cubic-bezier(.22,1,.36,1) both`,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 0 40px ${pal.shadow}55, 0 12px 40px rgba(0,0,0,.5)`; }}
      onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=status?`0 0 30px ${pal.shadow}33, 0 4px 24px rgba(0,0,0,.4)`:"0 4px 24px rgba(0,0,0,.3)"; }}
      onClick={() => onClick(socketId)}
    >
      {/* Animated corner accent */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:status?`linear-gradient(90deg,transparent,${pal.main},transparent)`:`transparent`, animation:"pg-scanline 4s linear infinite" }}/>
      <div style={{ position:"absolute", top:10, right:10, width:32, height:32, borderTop:`1px solid ${cardColor}`, borderRight:`1px solid ${cardColor}`, borderRadius:"0 8px 0 0", opacity:.35 }}/>
      {/* Overload sweep */}
      {isOverload && <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,59,59,.06),transparent)", animation:"pg-sweep 1.5s linear infinite", pointerEvents:"none" }}/>}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:20 }}>{pal.icon}</span>
            <div>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:15, fontWeight:900, letterSpacing:2, color:status?pal.main:T.muted, textShadow:status?`0 0 12px ${pal.main}`:"none" }}>
                {pal.name}
              </div>
              <div style={{ fontSize:9, letterSpacing:2, color:T.muted }}>NODE {socketId} • {status?"ACTIVE":"OFFLINE"}</div>
            </div>
          </div>
        </div>
        {/* Toggle switch */}
        <div onClick={e => { e.stopPropagation(); onToggle(socketId, !status); }}
          style={{ cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ width:46, height:24, borderRadius:12, position:"relative", background:status?"rgba(57,255,20,.15)":"rgba(255,255,255,.05)", border:`1px solid ${status?T.accent3:T.border}`, transition:"all .3s", boxShadow:status?`0 0 10px rgba(57,255,20,.3)`:"none" }}>
            <div style={{ position:"absolute", top:4, left:status?26:4, width:14, height:14, borderRadius:"50%", background:status?T.accent3:T.muted, transition:"left .3s cubic-bezier(.34,1.56,.64,1)", boxShadow:status?`0 0 7px ${T.accent3}`:"none" }}/>
          </div>
          <span style={{ fontSize:8, letterSpacing:1, color:status?T.accent3:T.muted }}>{status?"ON":"OFF"}</span>
        </div>
      </div>

      {/* Power gauge + waveform */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <PowerGauge power={power} color={isOverload?T.warn:pal.main} active={status}/>
        <div style={{ flex:1, paddingLeft:16 }}>
          <Waveform color={isOverload?T.warn:pal.main} active={status}/>
          <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:6 }}>
            {[
              { label:"VOLT",    value:status?`${fmt(voltage,1)}V`:"--",    color:T.gold    },
              { label:"AMP",     value:status?`${fmt(current,2)}A`:"--",    color:isOverload?T.warn:pal.main },
              { label:"ENERGY",  value:status?`${fmt(energy,4)} kWh`:"--", color:T.accent3 },
            ].map(m => (
              <div key={m.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:9, letterSpacing:2, color:T.muted }}>{m.label}</span>
                <span style={{ fontFamily:"'Orbitron',monospace", fontSize:11, fontWeight:700, color:m.color }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overload pill */}
      {isOverload && (
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:"rgba(255,59,59,.12)", border:"1px solid rgba(255,59,59,.35)", borderRadius:4, marginBottom:10, fontSize:10, color:T.warn, letterSpacing:1 }}>
          <span className="pg-shake" style={{ fontSize:11 }}>🚨</span> OVERLOAD — {fmt(current,2)}A
        </div>
      )}

      {/* Status bar */}
      <div style={{ height:3, background:"rgba(255,255,255,.04)", borderRadius:2, overflow:"hidden", marginTop:6 }}>
        <div style={{ height:"100%", width:`${clamp((power||0)/3000*100,0,100)}%`, background:isOverload?T.warn:pal.main, borderRadius:2, transition:"width 1s ease", boxShadow:`0 0 6px ${pal.main}` }}/>
      </div>

      {/* Navigate hint */}
      <div style={{ marginTop:10, display:"flex", justifyContent:"space-between", fontSize:9, color:T.muted, letterSpacing:1 }}>
        <span style={{ color:pal.main, opacity:.7 }}>TAP TO OPEN DASHBOARD →</span>
        <span>{status?"● LIVE":"○ IDLE"}</span>
      </div>
    </div>
  );
}

// ── Summary stat cards ────────────────────────────────────────────────────────
function SummaryCard({ label, value, unit, color, icon, delay = 0 }) {
  return (
    <div className="pg-cardin" style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 18px", position:"relative", overflow:"hidden", animationDelay:`${delay}s` }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:color }}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:9, letterSpacing:3, color:T.muted, marginBottom:6 }}>{label}</div>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:26, fontWeight:900, color, textShadow:`0 0 16px ${color}60` }}>
            {value}<span style={{ fontSize:12, fontWeight:400, opacity:.7, marginLeft:3 }}>{unit}</span>
          </div>
        </div>
        <span style={{ fontSize:24, opacity:.4 }}>{icon}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function MultiSocketDashboard() {
  useGlobalStyles();
  const navigate = useNavigate();

  const [sockets,    setSockets]    = useState([]);
  const [trendData,  setTrendData]  = useState([]);
  const [countdown,  setCountdown]  = useState(3);
  const [dataCount,  setDataCount]  = useState(0);
  const [lastUpdate, setLastUpdate] = useState("—");
  const [apiLive,    setApiLive]    = useState(false);
  const [anyOverload,setAnyOverload]= useState(false);
  const socketsRef = useRef([]);

  const handleToggle = useCallback(async (socketId, state) => {
    setSockets(prev => prev.map(s => s.socketId === socketId ? { ...s, status: state } : s));
    socketsRef.current = socketsRef.current.map(s => s.socketId === socketId ? { ...s, status: state } : s);
    simToggle(socketId, state);
    await toggleSocket(socketId, state);
  }, []);

  const update = useCallback(async () => {
    const apiData = await getAllSockets();
    let data;
    if (apiData && Array.isArray(apiData)) {
      data = apiData.map((s) => ({
  ...s,
  status: s.status ?? true
}));
      setApiLive(true);
    } else {
      data = simAllSockets().map((s, i) => ({ ...s, status: socketsRef.current[i]?.status ?? s.status }));
      setApiLive(false);
    }
    socketsRef.current = data;
    setSockets(data);

    const overloaded = data.filter(s => s.status && s.current > 10);
    setAnyOverload(overloaded.length > 0);

    const now = new Date().toLocaleTimeString("en-IN", { hour12: false });
    setTrendData(prev => {
      const pt = { time: now };
      data.forEach(s => { pt[`s${s.socketId}`] = s.status ? s.power || 0 : 0; });
      const next = [...prev, pt];
      return next.length > 20 ? next.slice(-20) : next;
    });
    setDataCount(c => c + 1);
    setLastUpdate(now);
  }, []);

  useEffect(() => {
    update();
    const id = setInterval(update, 3000);
    return () => clearInterval(id);
  }, [update]);

  useEffect(() => {
    const id = setInterval(() => setCountdown(c => c <= 1 ? 3 : c - 1), 1000);
    return () => clearInterval(id);
  }, []);

  const activeSockets  = sockets.filter(s => s.status);
  const totalPower     = activeSockets.reduce((a, s) => a + (s.power || 0), 0);
  const totalEnergy    = sockets.reduce((a, s) => a + (s.energy || 0), 0);
  const peakSocket     = activeSockets.reduce((p, s) => (s.power || 0) > (p.power || 0) ? s : p, {});

  return (
    <div style={{ display:"flex", background:T.bg, minHeight:"100vh" }}>
      <Sidebar active="SOCKETS"/>

      <div style={{ marginLeft:220, flex:1, padding:"24px 28px 40px", position:"relative" }}>
        {/* Grid bg */}
        <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(0,229,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.018) 1px,transparent 1px)", backgroundSize:"44px 44px", pointerEvents:"none", zIndex:0 }}/>
        <div style={{ position:"relative", zIndex:1 }}>

          {/* ── HEADER ── */}
          <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:20, borderBottom:`1px solid ${T.border}`, marginBottom:24 }}>
            <div>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:22, fontWeight:900, letterSpacing:3, color:T.accent, textShadow:"0 0 22px rgba(0,229,255,.4)" }}>
                SOCKET COMMAND CENTER
              </div>
              <div style={{ fontSize:9, color:T.muted, letterSpacing:2, marginTop:5 }}>
                {activeSockets.length}/4 NODES ACTIVE • CLICK ANY SOCKET TO OPEN DASHBOARD
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 14px", border:`1px solid ${apiLive?T.accent3:T.gold}`, borderRadius:4, fontSize:10, color:apiLive?T.accent3:T.gold, letterSpacing:2 }}>
                <span className="pg-blink" style={{ width:6, height:6, borderRadius:"50%", background:apiLive?T.accent3:T.gold, display:"inline-block", boxShadow:`0 0 7px ${apiLive?T.accent3:T.gold}` }}/>
                {apiLive?"ESP32 LIVE":"SIMULATED"}
              </div>
              <div style={{ fontSize:10, color:T.muted }}>
                REFRESH <span style={{ color:T.accent, fontFamily:"'Orbitron',monospace", fontWeight:700 }}>{countdown}</span>s
              </div>
            </div>
          </header>

          {/* ── GLOBAL OVERLOAD ── */}
          {anyOverload && (
            <div style={{ background:"linear-gradient(135deg,rgba(255,59,59,.14),rgba(255,59,59,.04))", border:`2px solid ${T.warn}`, borderRadius:10, padding:"13px 20px", marginBottom:20, position:"relative", overflow:"hidden", animation:"pg-ringAlert .5s ease-in-out infinite alternate" }}>
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,59,59,.07),transparent)", animation:"pg-sweep 1.5s linear infinite" }}/>
              <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
                <span className="pg-shake" style={{ fontSize:24 }}>🚨</span>
                <div>
                  <div style={{ fontFamily:"'Orbitron',monospace", fontWeight:700, fontSize:14, color:T.warn, letterSpacing:2 }}>OVERLOAD DETECTED!</div>
                  <div style={{ fontSize:11, color:"rgba(255,120,120,.8)", marginTop:2 }}>One or more sockets exceed threshold — click the socket for details</div>
                </div>
              </div>
            </div>
          )}

          {/* ── SUMMARY ROW ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
            <SummaryCard label="TOTAL POWER"    value={fmt(totalPower,1)}  unit="W"   color={T.accent}  icon="⚡" delay={0}/>
            <SummaryCard label="TOTAL ENERGY"   value={fmt(totalEnergy,3)} unit="kWh" color={T.accent3} icon="🔋" delay={0.06}/>
            <SummaryCard label="ACTIVE SOCKETS" value={activeSockets.length} unit="/4" color={T.gold}   icon="🔌" delay={0.12}/>
            <SummaryCard label="PEAK NODE"      value={peakSocket.socketId ? `S${peakSocket.socketId}` : "--"} unit="" color={T.warn} icon="🔺" delay={0.18}/>
          </div>

          {/* ── SOCKET CARDS 2×2 ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:18, marginBottom:24 }}>
            {(sockets.length ? sockets : SOCKET_PALETTE.map(p => ({ socketId:p.id, label:`SOCKET ${p.id}`, voltage:0, current:0, power:0, energy:0, status:false }))).map((s, i) => (
              <SocketCard key={s.socketId} socket={s} delay={i * 0.08}
                onToggle={handleToggle}
                onClick={(id) => navigate(`/socket/${id}`)}
              />
            ))}
          </div>

          {/* ── COMBINED TREND ── */}
          <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"13px 18px", borderBottom:`1px solid ${T.border}`, background:T.panel2, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, letterSpacing:3, color:T.accent }}>📈 ALL NODES — REAL-TIME POWER</div>
              <div style={{ display:"flex", gap:14 }}>
                {SOCKET_PALETTE.map(p => (
                  <span key={p.id} style={{ display:"flex", alignItems:"center", gap:4, fontSize:9, color:p.main, letterSpacing:1 }}>
                    <span style={{ width:12, height:2, background:p.main, display:"inline-block", borderRadius:1 }}/>{p.name}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ padding:"16px 12px 12px" }}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top:4, right:4, left:-22, bottom:0 }}>
                  <defs>
                    {SOCKET_PALETTE.map(p => (
                      <linearGradient key={p.id} id={`tg${p.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={p.main} stopOpacity={0.18}/>
                        <stop offset="95%" stopColor={p.main} stopOpacity={0.01}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,.03)"/>
                  <XAxis dataKey="time" tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }} interval="preserveStartEnd"/>
                  <YAxis tick={{ fill:T.muted, fontSize:9, fontFamily:"Share Tech Mono" }} tickLine={false} axisLine={{ stroke:T.border }}/>
                  <Tooltip contentStyle={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }} labelStyle={{ color:T.accent, fontFamily:"Orbitron" }}/>
                  {SOCKET_PALETTE.map(p => (
                    <Area key={p.id} type="monotone" dataKey={`s${p.id}`} name={p.name}
                      stroke={p.main} strokeWidth={1.5} fill={`url(#tg${p.id})`}
                      dot={false} activeDot={{ r:3, fill:p.main }} isAnimationActive={false}/>
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Footer */}
          <footer style={{ marginTop:22, paddingTop:14, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", fontSize:9, color:T.muted, letterSpacing:2 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span className="pg-blink" style={{ width:5,height:5,borderRadius:"50%",background:T.accent3,display:"inline-block",boxShadow:`0 0 5px ${T.accent3}` }}/>
              POWERGRID v2.0 — MULTI-NODE SYSTEM
            </div>
            <div>READS: <span style={{ color:T.accent, fontFamily:"'Orbitron',monospace" }}>{dataCount}</span></div>
            <div>UPDATED: {lastUpdate}</div>
          </footer>
        </div>
      </div>
    </div>
  );
}