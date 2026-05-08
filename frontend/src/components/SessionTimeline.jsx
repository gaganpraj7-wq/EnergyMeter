import { useState, useEffect } from "react";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000" });

// 🎨 THEME
const T = {
  bg: "#0c1420",
  panel: "#0f1a2e",
  border: "#1a2d4a",
  accent: "#00e5ff",
  accent2: "#ff6b35",
  text: "#c8e0f0",
  muted: "#4a6a8a",
  success: "#39ff14",
};

const SessionTimeline = ({ socketId }) => {
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [daysBack, setDaysBack] = useState(7);

  useEffect(() => {
    fetchData();
  }, [socketId, daysBack]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 📊 Fetch sessions
      const sessionRes = await API.get(`/api/sensor/sessions/${socketId}?days=${daysBack}`);
      setSessions(sessionRes.data || []);

      // 📈 Fetch summary
      const summaryRes = await API.get(`/api/sensor/summary/${socketId}?days=${daysBack}`);
      setSummary(summaryRes.data || {});

      console.log("✅ Sessions loaded:", sessionRes.data);
    } catch (err) {
      console.error("❌ Error loading sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  const formatDuration = (ms) => {
    if (!ms) return "0m";
    const minutes = Math.floor(ms / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  // ===== TIMELINE RENDERING =====
  const timelineItems = sessions.slice(0, 20); // Last 20 sessions

  return (
    <div style={styles.container}>
      {/* 📊 HEADER */}
      <div style={styles.header}>
        <h2 style={styles.title}>📊 Session Timeline</h2>
        <div style={styles.controls}>
          <select
            value={daysBack}
            onChange={(e) => setDaysBack(Number(e.target.value))}
            style={styles.select}
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* 📈 SUMMARY STATS */}
      {summary && (
        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Device Type</div>
            <div style={styles.statValue}>{summary.deviceType || "—"}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Total Sessions</div>
            <div style={styles.statValue}>{summary.totalSessions || 0}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Runtime</div>
            <div style={styles.statValue}>{summary.totalRuntimeMinutes || 0}m</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Energy Used</div>
            <div style={styles.statValue}>{summary.totalEnergyKwh || 0} kWh</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Avg Session</div>
            <div style={styles.statValue}>{summary.avgSessionMinutes || 0}m</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Peak Power</div>
            <div style={styles.statValue}>{summary.peakPowerW || 0}W</div>
          </div>
        </div>
      )}

      {/* 📅 SESSIONS LIST */}
      <div style={styles.sessionsList}>
        <h3 style={styles.listTitle}>⏱️ Session History</h3>

        {loading ? (
          <div style={styles.loading}>⏳ Loading sessions...</div>
        ) : timelineItems.length === 0 ? (
          <div style={styles.empty}>No sessions recorded yet</div>
        ) : (
          <div style={styles.timelineContainer}>
            {timelineItems.map((session, idx) => (
              <div key={idx} style={styles.timelineItem}>
                {/* LEFT: TIME */}
                <div style={styles.timeCol}>
                  <div style={styles.timeDate}>{formatDate(session.startTime)}</div>
                  <div style={styles.timeStart}>{formatTime(session.startTime)}</div>
                  <div style={styles.arrow}>↓</div>
                  <div style={styles.timeEnd}>{formatTime(session.endTime)}</div>
                </div>

                {/* MIDDLE: TIMELINE */}
                <div style={styles.dotCol}>
                  <div style={styles.dot}></div>
                </div>

                {/* RIGHT: DETAILS */}
                <div style={styles.detailsCol}>
                  <div style={styles.sessionHeader}>
                    <span style={styles.device}>{session.deviceType}</span>
                    <span style={styles.duration}>
                      ⏱️ {formatDuration(session.durationMs)}
                    </span>
                  </div>
                  <div style={styles.stats}>
                    <span>⚡ {session.avgPower}W</span>
                    <span>📊 {session.peakPower}W peak</span>
                    <span>💡 {session.energyConsumed}W</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== STYLES =====
const styles = {
  container: {
    background: T.panel,
    border: `1px solid ${T.border}`,
    borderRadius: "8px",
    padding: "20px",
    marginTop: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "18px",
    fontWeight: "bold",
    color: T.accent,
    margin: 0,
  },
  controls: {
    display: "flex",
    gap: "10px",
  },
  select: {
    background: T.bg,
    border: `1px solid ${T.border}`,
    color: T.text,
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  statBox: {
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: "6px",
    padding: "12px",
    textAlign: "center",
  },
  statLabel: {
    fontSize: "11px",
    color: T.muted,
    marginBottom: "6px",
  },
  statValue: {
    fontSize: "16px",
    fontWeight: "bold",
    color: T.success,
  },
  sessionsList: {
    marginTop: "20px",
  },
  listTitle: {
    fontSize: "14px",
    color: T.accent,
    marginBottom: "15px",
    margin: "0 0 15px 0",
  },
  loading: {
    textAlign: "center",
    color: T.muted,
    padding: "20px",
  },
  empty: {
    textAlign: "center",
    color: T.muted,
    padding: "20px",
  },
  timelineContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  timelineItem: {
    display: "flex",
    gap: "12px",
    padding: "12px",
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: "6px",
    alignItems: "flex-start",
  },
  timeCol: {
    minWidth: "60px",
    textAlign: "right",
    fontSize: "11px",
  },
  timeDate: {
    color: T.muted,
    marginBottom: "4px",
  },
  timeStart: {
    color: T.accent,
    fontWeight: "bold",
  },
  arrow: {
    color: T.muted,
    fontSize: "10px",
    margin: "4px 0",
  },
  timeEnd: {
    color: T.text,
  },
  dotCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "4px",
  },
  dot: {
    width: "12px",
    height: "12px",
    background: T.accent,
    borderRadius: "50%",
    boxShadow: `0 0 8px ${T.accent}`,
  },
  detailsCol: {
    flex: 1,
  },
  sessionHeader: {
    display: "flex",
    gap: "12px",
    marginBottom: "6px",
    alignItems: "center",
  },
  device: {
    fontSize: "13px",
    fontWeight: "bold",
    color: T.text,
  },
  duration: {
    fontSize: "11px",
    color: T.success,
    background: "rgba(57, 255, 20, 0.1)",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  stats: {
    display: "flex",
    gap: "16px",
    fontSize: "11px",
    color: T.muted,
  },
};

export default SessionTimeline;
