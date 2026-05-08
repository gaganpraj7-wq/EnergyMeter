// src/theme.js — PowerGrid shared design system
export const T = {
  bg:      "#060a12",
  panel:   "#0c1420",
  panel2:  "#0f1a2e",
  border:  "#1a2d4a",
  accent:  "#00e5ff",
  accent2: "#ff6b35",
  accent3: "#39ff14",
  warn:    "#ff3b3b",
  gold:    "#ffd700",
  text:    "#c8e0f0",
  muted:   "#4a6a8a",
};

// Each socket gets a unique color identity
export const SOCKET_PALETTE = [
  { id: 1, main: "#00e5ff", shadow: "rgba(0,229,255,.4)",  dim: "rgba(0,229,255,.08)",  name: "ALPHA",  icon: "🔌" },
  { id: 2, main: "#39ff14", shadow: "rgba(57,255,20,.4)",  dim: "rgba(57,255,20,.08)",  name: "BETA",   icon: "⚡" },
  { id: 3, main: "#ffd700", shadow: "rgba(255,215,0,.4)",  dim: "rgba(255,215,0,.08)",  name: "GAMMA",  icon: "💡" },
  { id: 4, main: "#ff6b35", shadow: "rgba(255,107,53,.4)", dim: "rgba(255,107,53,.08)", name: "DELTA",  icon: "🔋" },
];

export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { background: #060a12; overflow-x: hidden; font-family: 'Share Tech Mono', monospace; }

  ::-webkit-scrollbar       { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #060a12; }
  ::-webkit-scrollbar-thumb { background: #1a2d4a; border-radius: 4px; }

  @keyframes pg-pulse      { 0%,100%{box-shadow:0 0 15px rgba(0,229,255,.25)} 50%{box-shadow:0 0 35px rgba(0,229,255,.6)} }
  @keyframes pg-blink      { 0%,100%{opacity:1} 50%{opacity:.12} }
  @keyframes pg-shake      { from{transform:translateX(-3px)} to{transform:translateX(3px)} }
  @keyframes pg-sweep      { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
  @keyframes pg-fadeUp     { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pg-flash      { 0%{opacity:1} 40%{opacity:.3} 100%{opacity:1} }
  @keyframes pg-alert      { 0%,100%{box-shadow:0 0 12px rgba(255,59,59,.3)} 50%{box-shadow:0 0 32px rgba(255,59,59,.8)} }
  @keyframes pg-spin       { to{transform:rotate(360deg)} }
  @keyframes pg-cardIn     { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes pg-sideIn     { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes pg-scanline   { 0%{transform:translateX(-100%);opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{transform:translateX(200%);opacity:0} }
  @keyframes pg-ringAlert  { 0%,100%{box-shadow:0 0 14px rgba(255,59,59,.3)} 50%{box-shadow:0 0 36px rgba(255,59,59,.9)} }
  @keyframes pg-float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes pg-powerOn    { 0%{opacity:0;transform:scaleY(0)} 60%{transform:scaleY(1.05)} 100%{opacity:1;transform:scaleY(1)} }
  @keyframes pg-glitch     { 0%,100%{clip-path:none} 20%{clip-path:polygon(0 15%,100% 15%,100% 30%,0 30%)} 40%{clip-path:polygon(0 60%,100% 60%,100% 75%,0 75%)} 60%{clip-path:polygon(0 40%,100% 40%,100% 55%,0 55%)} }
  @keyframes pg-socketPulse{ 0%{box-shadow:0 0 0 0 rgba(57,255,20,.5)} 70%{box-shadow:0 0 0 12px rgba(57,255,20,0)} 100%{box-shadow:0 0 0 0 rgba(57,255,20,0)} }
  @keyframes pg-waveform   { 0%,100%{height:4px} 50%{height:20px} }
  @keyframes pg-progressFill { from{width:0} to{width:var(--w)} }

  .pg-flash    { animation: pg-flash .45s ease; }
  .pg-fadein   { animation: pg-fadeUp .4s ease; }
  .pg-blink    { animation: pg-blink 1.1s ease-in-out infinite; }
  .pg-shake    { animation: pg-shake .3s ease-in-out infinite alternate; }
  .pg-pulse    { animation: pg-pulse 2.2s ease-in-out infinite; }
  .pg-spin     { animation: pg-spin .75s linear infinite; }
  .pg-float    { animation: pg-float 3s ease-in-out infinite; }
  .pg-cardin   { animation: pg-cardIn .5s cubic-bezier(.22,1,.36,1) both; }
  .pg-sidein   { animation: pg-sideIn .5s cubic-bezier(.22,1,.36,1) both; }

  input[type=number]                            { -moz-appearance:textfield; }
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
`;