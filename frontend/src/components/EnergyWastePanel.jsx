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

const EnergyWastePanel = ({ socketId, tariff = 6.50 }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWasteAnalysis();
  }, [socketId, tariff]);

  const fetchWasteAnalysis = async () => {
    try {
      const res = await API.get(`/api/sensor/waste/${socketId}?tariff=${tariff}`);
      setAnalysis(res.data);
    } catch (err) {
      console.error("Error fetching waste analysis:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>⏳ Loading...</div>;
  if (!analysis) return <div style={styles.loading}>No data</div>;

  const getWasteColor = (score) => {
    if (score > 70) return T.warn;
    if (score > 40) return T.orange;
    return T.success;
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>💡 Energy Waste Detection</h3>

      <div style={styles.scoreBox}>
        <div style={styles.scoreLabel}>Waste Score</div>
        <div style={{...styles.scoreValue, color: getWasteColor(analysis.overallWasteScore)}}>
          {analysis.overallWasteScore}%
        </div>
        <div style={{...styles.scoreStatus, color: getWasteColor(analysis.overallWasteScore)}}>
          {analysis.wasteStatus}
        </div>
      </div>

      <div style={styles.metricsGrid}>
        <div style={styles.metric}>
          <div style={styles.metricLabel}>💨 Phantom Load</div>
          <div style={{...styles.metricValue, color: T.success}}>
            {analysis.phantomLoad} kWh/mo
          </div>
          <div style={styles.metricCost}>
            ₹{(analysis.phantomLoad * tariff).toFixed(0)}/month
          </div>
        </div>

        <div style={styles.metric}>
          <div style={styles.metricLabel}>⏱️ Long Runtime</div>
          <div style={{...styles.metricValue, color: T.accent}}>
            {analysis.unnecessaryRuntime} hrs
          </div>
        </div>

        <div style={styles.metric}>
          <div style={styles.metricLabel}>📉 Potential Savings</div>
          <div style={{...styles.metricValue, color: T.warn}}>
            ₹{analysis.wasteCostPerMonth}/mo
          </div>
        </div>
      </div>

      <div style={styles.recommendations}>
        <div style={styles.recTitle}>Recommendations:</div>
        {analysis.recommendations.map((rec, i) => (
          <div key={i} style={{...styles.recItem, borderLeft: `3px solid ${rec.severity === "HIGH" ? T.warn : rec.severity === "MEDIUM" ? T.orange : "#444"}`}}>
            <div style={styles.recHeader}>{rec.title}</div>
            <div style={styles.recDesc}>{rec.description}</div>
            <div style={{...styles.recSavings, color: T.success}}>💰 {rec.savings}</div>
          </div>
        ))}
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
  scoreBox: {
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: "6px",
    padding: "20px",
    textAlign: "center",
    marginBottom: "15px"
  },
  scoreLabel: { fontSize: "11px", color: T.muted, marginBottom: "8px" },
  scoreValue: { fontSize: "36px", fontWeight: "bold", margin: "0 0 5px 0" },
  scoreStatus: { fontSize: "14px", fontWeight: "bold" },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "15px"
  },
  metric: {
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: "6px",
    padding: "12px",
    textAlign: "center"
  },
  metricLabel: { fontSize: "10px", color: T.muted, marginBottom: "5px" },
  metricValue: { fontSize: "16px", fontWeight: "bold", marginBottom: "3px" },
  metricCost: { fontSize: "9px", color: T.orange },
  recommendations: { marginTop: "15px" },
  recTitle: { fontSize: "12px", color: T.accent, fontWeight: "bold", marginBottom: "10px" },
  recItem: {
    background: T.bg,
    padding: "12px",
    marginBottom: "8px",
    borderRadius: "4px"
  },
  recHeader: { fontSize: "12px", fontWeight: "bold", color: T.text, marginBottom: "4px" },
  recDesc: { fontSize: "11px", color: T.muted, marginBottom: "6px" },
  recSavings: { fontSize: "11px", fontWeight: "bold" }
};

export default EnergyWastePanel;
