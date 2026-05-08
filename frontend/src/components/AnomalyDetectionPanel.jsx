import { useState, useEffect } from "react";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000" });

const T = {
  bg: "#0c1420",
  panel: "#0f1a2e",
  border: "#1a2d4a",
  accent: "#00e5ff",
  text: "#c8e0f0",
  muted: "#4a6a8a",
  success: "#39ff14",
  warn: "#ff3b3b",
  orange: "#ff9500"
};

const AnomalyDetectionPanel = ({ socketId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnomalyData();
    const interval = setInterval(fetchAnomalyData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [socketId]);

  const fetchAnomalyData = async () => {
    try {
      const res = await API.get(`/api/sensor/anomaly/${socketId}`);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching anomalies:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>⏳ Loading...</div>;

  const { stats, recentAnomalies } = data;

  const getSeverityColor = (severity) => {
    if (severity === 3) return T.warn;
    if (severity === 2) return T.orange;
    return "#ffd700";
  };

  const getSeverityLabel = (severity) => {
    if (severity === 3) return "🔴 CRITICAL";
    if (severity === 2) return "🟠 WARNING";
    return "🟡 NOTICE";
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🚨 Anomaly Detection (Self-Learning)</h3>

      <div style={styles.statsGrid}>
        <div style={{ ...styles.statBox, borderColor: T.warn }}>
          <div style={styles.statLabel}>Risk Level</div>
          <div style={{...styles.statValue, color: stats.riskScore > 70 ? T.warn : stats.riskScore > 40 ? T.orange : T.success}}>
            {stats.riskScore}%
          </div>
          <div style={styles.statSmall}>{stats.status}</div>
        </div>

        <div style={styles.statBox}>
          <div style={styles.statLabel}>Critical Spikes</div>
          <div style={{...styles.statValue, color: T.warn}}>{stats.criticalCount}</div>
        </div>

        <div style={styles.statBox}>
          <div style={styles.statLabel}>Warnings</div>
          <div style={{...styles.statValue, color: T.orange}}>{stats.warningCount}</div>
        </div>

        <div style={styles.statBox}>
          <div style={styles.statLabel}>Total Anomalies</div>
          <div style={{...styles.statValue, color: T.accent}}>{stats.totalAnomalies}</div>
        </div>
      </div>

      <div style={styles.anomaliesList}>
        <div style={styles.listTitle}>Recent Anomalies:</div>
        {recentAnomalies.length === 0 ? (
          <div style={styles.empty}>✅ No anomalies detected - device behaving normally</div>
        ) : (
          recentAnomalies.slice(0, 5).map((anom, i) => (
            <div key={i} style={{...styles.anomalyItem, borderLeft: `3px solid ${getSeverityColor(anom.severity)}`}}>
              <div style={styles.anomalyHeader}>
                <span>{getSeverityLabel(anom.severity)}</span>
                <span style={styles.anomalyZ}>Z-Score: {anom.zScore}</span>
              </div>
              <div style={styles.anomalyText}>{anom.reason}</div>
              <div style={styles.anomalySmall}>Normal Range: {anom.normalRange}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: T.panel,
    border: `1px solid ${T.border}`,
    borderRadius: "8px",
    padding: "20px",
    marginTop: "20px"
  },
  title: { color: T.accent, fontSize: "16px", margin: "0 0 15px 0" },
  loading: { textAlign: "center", color: T.muted, padding: "20px" },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "10px",
    marginBottom: "20px"
  },
  statBox: {
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: "6px",
    padding: "12px",
    textAlign: "center"
  },
  statLabel: { fontSize: "10px", color: T.muted, marginBottom: "5px" },
  statValue: { fontSize: "18px", fontWeight: "bold", color: T.accent },
  statSmall: { fontSize: "9px", color: T.muted, marginTop: "3px" },
  anomaliesList: { marginTop: "15px" },
  listTitle: { fontSize: "12px", color: T.accent, marginBottom: "10px", fontWeight: "bold" },
  empty: { textAlign: "center", color: T.muted, padding: "15px", fontSize: "12px" },
  anomalyItem: {
    background: T.bg,
    padding: "10px",
    marginBottom: "8px",
    borderRadius: "4px"
  },
  anomalyHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    fontWeight: "bold",
    color: T.text,
    marginBottom: "4px"
  },
  anomalyZ: { fontSize: "10px", color: T.muted },
  anomalyText: { fontSize: "11px", color: T.text, marginBottom: "4px" },
  anomalySmall: { fontSize: "9px", color: T.muted }
};

export default AnomalyDetectionPanel;
