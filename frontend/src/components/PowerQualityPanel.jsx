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

const PowerQualityPanel = ({ socketId }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPowerQuality();
    const interval = setInterval(fetchPowerQuality, 15000);
    return () => clearInterval(interval);
  }, [socketId]);

  const fetchPowerQuality = async () => {
    try {
      const res = await API.get(`/api/sensor/powerquality/${socketId}`);
      setAnalysis(res.data);
    } catch (err) {
      console.error("Error fetching power quality:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>⏳ Loading...</div>;
  if (!analysis) return <div style={styles.loading}>No data</div>;

  const getQualityColor = (score) => {
    if (score >= 85) return T.success;
    if (score >= 70) return "#ffd700";
    if (score >= 50) return T.orange;
    return T.warn;
  };

  const CircularProgress = ({ value, color, size = 100 }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={T.border} strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>
          {value}%
        </text>
      </svg>
    );
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>⚡ Power Quality Monitoring</h3>

      <div style={styles.scoreContainer}>
        <div style={styles.circleWrapper}>
          <CircularProgress value={analysis.qualityScore} color={getQualityColor(analysis.qualityScore)} size={120} />
        </div>
        <div style={styles.scoreInfo}>
          <div style={{...styles.scoreLabel, color: getQualityColor(analysis.qualityScore)}}>
            {analysis.overallQuality}
          </div>
          <div style={styles.scoreDesc}>Overall Power Quality</div>
        </div>
      </div>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricName}>⚡ Voltage</span>
            <span style={{...styles.metricStatus, color: analysis.voltageStatus.includes("GOOD") ? T.success : T.warn}}>
              {analysis.voltageStatus}
            </span>
          </div>
          <div style={styles.metricValue}>{analysis.avgVoltage}V</div>
          <div style={styles.metricSmall}>
            Deviation: {analysis.voltageDeviation} | Variation: {analysis.voltageVariation}V
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricName}>⚡ Power Factor</span>
            <span style={{...styles.metricStatus, color: analysis.powerFactor > 0.9 ? T.success : analysis.powerFactor > 0.8 ? "#ffd700" : T.warn}}>
              {analysis.powerFactorStatus}
            </span>
          </div>
          <div style={styles.metricValue}>{(analysis.powerFactor * 100).toFixed(1)}%</div>
          <div style={styles.metricSmall}>
            {analysis.powerFactor > 0.95 ? "✅ Excellent efficiency" : analysis.powerFactor > 0.85 ? "🟢 Good efficiency" : "⚠️ Consider correction"}
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricName}>🔄 Frequency</span>
            <span style={{...styles.metricStatus, color: T.success}}>
              {analysis.frequencyStatus}
            </span>
          </div>
          <div style={styles.metricValue}>50Hz</div>
          <div style={styles.metricSmall}>Nominal frequency for India</div>
        </div>
      </div>

      {analysis.warnings && analysis.warnings.length > 0 && (
        <div style={styles.warningsBox}>
          <div style={styles.warningsTitle}>⚠️ Detected Issues:</div>
          {analysis.warnings.map((warn, i) => (
            <div key={i} style={styles.warningItem}>
              <div style={{color: T.warn, fontWeight: "bold", marginBottom: "4px"}}>
                {warn.message}
              </div>
              <div style={{color: T.muted, fontSize: "10px"}}>
                💡 {warn.action}
              </div>
            </div>
          ))}
        </div>
      )}

      {(!analysis.warnings || analysis.warnings.length === 0) && (
        <div style={{...styles.warningsBox, background: "rgba(57, 255, 20, 0.05)", borderColor: T.success}}>
          <div style={{color: T.success, fontWeight: "bold"}}>✅ All power quality parameters are within normal ranges</div>
        </div>
      )}
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
  scoreContainer: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px"
  },
  circleWrapper: { display: "flex", alignItems: "center", justifyContent: "center" },
  scoreInfo: { flex: 1 },
  scoreLabel: { fontSize: "20px", fontWeight: "bold", marginBottom: "5px" },
  scoreDesc: { fontSize: "12px", color: T.muted },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "20px"
  },
  metricCard: {
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: "6px",
    padding: "14px"
  },
  metricHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  metricName: { fontSize: "11px", fontWeight: "bold", color: T.text },
  metricStatus: { fontSize: "10px", fontWeight: "bold" },
  metricValue: { fontSize: "18px", fontWeight: "bold", color: T.accent, marginBottom: "6px" },
  metricSmall: { fontSize: "9px", color: T.muted },
  warningsBox: {
    background: "rgba(255, 59, 59, 0.05)",
    border: `1px solid ${T.warn}`,
    borderRadius: "6px",
    padding: "14px"
  },
  warningsTitle: { fontSize: "12px", fontWeight: "bold", color: T.warn, marginBottom: "10px" },
  warningItem: { marginBottom: "8px" }
};

export default PowerQualityPanel;
