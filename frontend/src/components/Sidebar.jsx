// src/components/Sidebar.jsx

import { T, SOCKET_PALETTE, GLOBAL_CSS } from "../theme";
import { useEffect } from "react";

// ✅ Inject global CSS once
function useGlobalStyles() {
  useEffect(() => {
    if (document.getElementById("pg-global-css")) return;
    const el = document.createElement("style");
    el.id = "pg-global-css";
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
  }, []);
}

// ✅ Main navigation
const NAV = [
  { icon: "⚡", label: "SOCKETS", path: "/sockets" },
  
  { icon: "⚙", label: "SETTINGS", path: "/settings" },
];

export default function Sidebar({ active, socketId }) {
  useGlobalStyles();

  const cur = window.location.pathname;

  return (
    <aside
      className="pg-sidein"
      style={{
        width: 220,
        minHeight: "100vh",
        background: "linear-gradient(180deg,#06101e 0%,#060a12 100%)",
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "24px 14px",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 200,
      }}
    >
      {/* Glow edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 1,
          background:
            "linear-gradient(180deg,transparent,rgba(0,229,255,.25),transparent)",
        }}
      />

      {/* ───── BRAND ───── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingBottom: 20,
          marginBottom: 20,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div
          className="pg-pulse"
          style={{
            width: 38,
            height: 38,
            background: "linear-gradient(135deg,#001a2e,#003050)",
            border: `1px solid rgba(0,229,255,.35)`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          ⚡
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Orbitron',monospace",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 2,
              color: T.accent,
            }}
          >
            POWERGRID
          </div>
          <div
            style={{
              fontSize: 8,
              letterSpacing: 2,
              color: T.muted,
              marginTop: 2,
            }}
          >
            MULTI-SOCKET v2.0
          </div>
        </div>
      </div>

      {/* ───── MAIN NAV ───── */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {NAV.map((item) => {
          const isActive = cur === item.path || active === item.label;
          return (
            <NavBtn
              key={item.path}
              icon={item.icon}
              label={item.label}
              active={isActive}
              onClick={() => (window.location.href = item.path)}
            />
          );
        })}
      </nav>

      {/* ───── SOCKET QUICK LINKS (NEW FEATURE) ───── */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            fontSize: 8,
            letterSpacing: 3,
            color: T.muted,
            marginBottom: 10,
            paddingLeft: 4,
          }}
        >
          SOCKET NODES
        </div>

        {SOCKET_PALETTE.map((s) => {
          const isActive =
            cur === `/socket/${s.id}` || socketId === s.id;

          return (
            <button
              key={s.id}
              onClick={() =>
                (window.location.href = `/socket/${s.id}`)
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                padding: "8px 10px",
                background: isActive ? s.dim : "transparent",
                border: `1px solid ${
                  isActive ? s.main : "transparent"
                }`,
                borderRadius: 6,
                cursor: "pointer",
                marginBottom: 3,
                color: isActive ? s.main : T.muted,
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 11,
                letterSpacing: 1,
                transition: "all .2s",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: s.main,
                }}
              />
              {s.icon} {s.name}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* ───── LOGOUT ───── */}
      <div
        style={{
          paddingTop: 14,
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <NavBtn
          icon="→"
          label="LOGOUT"
          danger
          onClick={() => {
            localStorage.clear();
            window.location.href = "/";
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 12,
            fontSize: 8,
            color: T.muted,
            letterSpacing: 2,
            paddingLeft: 4,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: T.accent3,
            }}
          />
          ESP32 CONNECTED
        </div>
      </div>
    </aside>
  );
}

// ───── BUTTON COMPONENT ─────
function NavBtn({ icon, label, active, onClick, danger }) {
  const color = danger ? T.warn : T.accent;
  const dimBg = danger
    ? "rgba(255,59,59,.08)"
    : "rgba(0,229,255,.08)";

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 12px",
        borderRadius: 6,
        cursor: "pointer",
        background: active ? dimBg : "transparent",
        border: `1px solid ${
          active
            ? danger
              ? "rgba(255,59,59,.25)"
              : "rgba(0,229,255,.25)"
            : "transparent"
        }`,
        color: active
          ? color
          : danger
          ? T.warn
          : T.muted,
        fontFamily: "'Share Tech Mono',monospace",
        fontSize: 11,
        letterSpacing: 1.5,
        transition: "all .22s",
        textAlign: "left",
      }}
    >
      <span>{icon}</span> {label}
    </button>
  );
}