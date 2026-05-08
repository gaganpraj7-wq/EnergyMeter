// src/components/SocketCard.jsx
import { useState, useEffect, useRef } from "react";
import { T, SOCKET_COLORS } from "../theme";

const fmt = (n, d = 1) => (typeof n === "number" ? n.toFixed(d) : "--");
const clamp = (v, mn, mx) => Math.min(mx, Math.max(mn, v));

function MiniBar({ value, max, color }) {
  return (
    <div style={{ height:3, background:"rgba(255,255,255,.05)", borderRadius:2, overflow:"hidden", marginTop:4 }}>
      <div style={{ height:"100%", width:`${clamp((value/max)*100,0,100)}%`, background:color, borderRadius:2, transition:"width .8s ease" }} />
    </div>
  );
}

export default function SocketCard({ socket, threshold, onToggle, onClick }) {
  const { socketId, label, voltage, current, power, energy, status } = socket;
  const col = SOCKET_COLORS[(socketId - 1) % 4];
  const isOverload = (current || 0) > threshold;
  const cardColor  = isOverload ? T.warn : !status ? T.muted : col.main;

  const [flash, setFlash] = useState(false);
  const prevPwr = useRef(power);
  useEffect(() => {
    if (prevPwr.current !== power) { setFlash(true); setTimeout(() => setFlash(false), 450); prevPwr.current = power; }
  }, [power]);

  return (
    <div
      onClick={() => onClick(socket)}
      style={{
        background: T.panel, border: `1px solid ${isOverload ? T.warn : T.border}`,
        borderRadius: 12, padding: "20px 18px", position: "relative", overflow: "hidden",
        cursor: "pointer",
        transition: "border-color .3s, box-shadow .3s, transform .2s",
        boxShadow: isOverload ? `0 0 20px rgba(255,59,59,.25)` : "none",
        animation: "pg-card-in .5s ease both",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = cardColor; e.currentTarget.style.boxShadow = `0 0 24px ${col.shadow}`; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isOverload ? T.warn : T.border; e.currentTarget.style.boxShadow = isOverload ? "0 0 20px rgba(255,59,59,.25)" : "none"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* Overload sweep */}
      {isOverload && (
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,59,59,.07),transparent)", animation:"pg-sweep 1.5s linear infinite", pointerEvents:"none" }} />
      )}

      {/* Top accent bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background: !status ? T.muted : isOverload ? T.warn : cardColor, borderRadius:"12px 12px 0 0", boxShadow: status && !isOverload ? `0 0 8px ${cardColor}` : "none" }} />

      {/* Corner deco */}
      <div style={{ position:"absolute", top:8, right:8, width:28, height:28, borderTop:`1px solid ${cardColor}`, borderRight:`1px solid ${cardColor}`, borderRadius:"0 8px 0 0", opacity:.3 }} />

      {/* Header row */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:900, letterSpacing:2, color: !status ? T.muted : cardColor, textShadow: status ? `0 0 10px ${cardColor}` : "none" }}>
            {label}
          </div>
          <div style={{ fontSize:9, letterSpacing:2, color:T.muted, marginTop:3 }}>SOCKET {socketId}</div>
        </div>

        {/* Toggle */}
        <div onClick={e => { e.stopPropagation(); onToggle(socketId, !status); }}
          style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"4px 0" }}>
          <span style={{ fontSize:9, letterSpacing:1, color: status ? T.accent3 : T.muted }}>{status ? "ON" : "OFF"}</span>
          <div style={{
            width:44, height:22, borderRadius:11, position:"relative",
            background: status ? "rgba(57,255,20,.2)" : "rgba(255,255,255,.06)",
            border: `1px solid ${status ? T.accent3 : T.border}`,
            transition:"all .3s",
            boxShadow: status ? `0 0 10px rgba(57,255,20,.3)` : "none",
          }}>
            <div style={{
              position:"absolute", top:3, left: status ? 23 : 3,
              width:14, height:14, borderRadius:"50%",
              background: status ? T.accent3 : T.muted,
              transition:"left .3s cubic-bezier(.34,1.56,.64,1)",
              boxShadow: status ? `0 0 6px ${T.accent3}` : "none",
            }}/>
          </div>
        </div>
      </div>

      {/* Overload badge */}
      {isOverload && (
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:"rgba(255,59,59,.1)", border:"1px solid rgba(255,59,59,.3)", borderRadius:4, marginBottom:12, fontSize:10, color:T.warn, letterSpacing:1 }}>
          <span className="pg-shake-icon" style={{ fontSize:12 }}>🚨</span> OVERLOAD DETECTED
        </div>
      )}

      {/* Power — big value */}
      <div className={flash ? "pg-flash-anim" : ""} style={{ marginBottom:16 }}>
        <div style={{ fontSize:9, letterSpacing:3, color:T.muted, marginBottom:4 }}>LIVE POWER</div>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:34, fontWeight:900, lineHeight:1, color: !status ? T.muted : isOverload ? T.warn : cardColor, textShadow: status && !isOverload ? `0 0 20px ${col.shadow}` : "none" }}>
          {status ? fmt(power, 1) : "OFF"}
          {status && <span style={{ fontSize:12, fontWeight:400, opacity:.7, marginLeft:3 }}>W</span>}
        </div>
        {status && <MiniBar value={power||0} max={3000} color={isOverload ? T.warn : cardColor}/>}
      </div>

      {/* Metrics grid */}
      {status ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { label:"VOLTAGE", value:fmt(voltage,1), unit:"V", color:T.gold },
            { label:"CURRENT", value:fmt(current,2), unit:"A", color:isOverload ? T.warn : T.accent2 },
            { label:"ENERGY",  value:fmt(energy,3),  unit:"kWh", color:T.accent3 },
          ].map(m => (
            <div key={m.label} style={{ background:"rgba(0,0,0,.25)", borderRadius:6, padding:"8px 10px", border:`1px solid rgba(255,255,255,.04)` }}>
              <div style={{ fontSize:8, letterSpacing:2, color:T.muted, marginBottom:3 }}>{m.label}</div>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:14, fontWeight:700, color:m.color }}>{m.value}<span style={{ fontSize:9, opacity:.7, marginLeft:2 }}>{m.unit}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:60, fontSize:10, letterSpacing:3, color:T.muted }}>
          SOCKET OFFLINE
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid rgba(255,255,255,.04)`, display:"flex", justifyContent:"space-between", fontSize:9, color:T.muted, letterSpacing:1 }}>
        <span>CLICK FOR DETAILS →</span>
        <span style={{ color: status ? T.accent3 : T.warn }}>{status ? "● ACTIVE" : "○ IDLE"}</span>
      </div>
    </div>
  );
}