// src/components/SocketModal.jsx

import { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

import { T, SOCKET_COLORS } from "../theme";
import { getSocketLive, simulateSocketsData } from "../services/api";

const fmt = (n, d = 1) => (typeof n === "number" ? n.toFixed(d) : "--");

// ───────── Tooltip ─────────
function ModalTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div style={{
      background: T.panel,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      padding: "10px 14px"
    }}>
      <div style={{
        fontFamily: "'Orbitron',monospace",
        fontSize: 10,
        color: T.accent,
        marginBottom: 4
      }}>
        {label}
      </div>

      <div style={{ fontSize: 13, color: T.text }}>
        {payload[0]?.value?.toFixed(1)} W
      </div>
    </div>
  );
}

// ───────── MAIN COMPONENT ─────────
export default function SocketModal({ socket, threshold, onClose, onToggle }) {
  const col = SOCKET_COLORS[(socket.socketId - 1) % 4];

  const [live, setLive] = useState(socket);
  const [chartData, setChartData] = useState([]);
  const [countdown, setCountdown] = useState(3);

  const peakRef = useRef(0);
  const sumRef = useRef(0);
  const cntRef = useRef(0);

  const isOverload = (live.current || 0) > threshold;

  // ───────── LIVE DATA POLLING ─────────
  useEffect(() => {
    let isMounted = true;

    const tick = async () => {
      try {
        const data = await getSocketLive(socket.socketId);

        const resolved =
          data || simulateSocketsData()[socket.socketId - 1];

        // preserve toggle status
        resolved.status =
          live.status !== undefined ? live.status : socket.status;

        if (!isMounted) return;

        // stats
        if ((resolved.power || 0) > peakRef.current) {
          peakRef.current = resolved.power;
        }

        sumRef.current += resolved.power || 0;
        cntRef.current += 1;

        setLive(resolved);

        const now = new Date().toLocaleTimeString("en-IN", {
          hour12: false
        });

        setChartData(prev => {
          const next = [...prev, { time: now, power: resolved.power || 0 }];
          return next.length > 25 ? next.slice(-25) : next;
        });

      } catch (err) {
        console.error("Socket live error:", err);
      }
    };

    tick();

    const interval = setInterval(tick, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.socketId]);

  // ───────── COUNTDOWN TIMER ─────────
  useEffect(() => {
    const cd = setInterval(() => {
      setCountdown(c => (c <= 1 ? 3 : c - 1));
    }, 1000);

    return () => clearInterval(cd);
  }, []);

  const avgPower =
    cntRef.current ? sumRef.current / cntRef.current : 0;

  // ───────── UI ─────────
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,15,.85)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 860,
          background: T.panel,
          border: `1px solid ${isOverload ? T.warn : col.main}`,
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: `0 0 60px ${
            isOverload ? "rgba(255,59,59,.2)" : col.shadow
          }, 0 20px 60px rgba(0,0,0,.6)`,
          maxHeight: "90vh",
          overflowY: "auto"
        }}
      >
        {/* HEADER */}
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${T.border}`,
          background: T.panel2,
          display: "flex",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{
              fontFamily: "'Orbitron',monospace",
              fontSize: 18,
              color: col.main
            }}>
              {live.label}
            </div>

            <div style={{ fontSize: 10, color: T.muted }}>
              REFRESH {countdown}s
            </div>
          </div>

          <button onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 20 }}>

          {/* ALERT */}
          {isOverload && (
            <div style={{
              color: T.warn,
              marginBottom: 10
            }}>
              ⚠ OVERLOAD DETECTED
            </div>
          )}

          {/* METRICS */}
          <div style={{ marginBottom: 20 }}>
            Power: {fmt(live.power)} W <br />
            Voltage: {fmt(live.voltage)} V <br />
            Current: {fmt(live.current)} A <br />
            Energy: {fmt(live.energy)} kWh
          </div>

          {/* CHART */}
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip content={<ModalTooltip />} />

              {peakRef.current > 0 && (
                <ReferenceLine y={peakRef.current} stroke={T.warn} />
              )}

              {avgPower > 0 && (
                <ReferenceLine y={avgPower} stroke={T.gold} />
              )}

              <Area
                type="monotone"
                dataKey="power"
                stroke={col.main}
                fill={col.main}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}