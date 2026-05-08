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
  gold: "#ffd700",
  orange: "#ff9500"
};

const EfficiencyScorePanel = ({ socketId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEfficiency();
  }, [socketId]);

  const fetchEfficiency = async () => {
    try {
      const res = await API.get(`/api/sensor/efficiency/${socketId}`);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching efficiency:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>⏳ Loading...</div>;
  if (!data) return <div style={styles.loading}>No data</div>;

  const { efficiency, monthlyComparison } = data;
  const { score, grade, factors, tips } = efficiency;

  const getGradeColor = (grade) => {
    if (grade.includes("A+")) return "#51cf66";
    if (grade.includes("A") || grade.includes("B")) return T.success;
    if (grade.includes("C")) return T.gold;
    if (grade.includes("D")) return T.orange;
    return T.warn = "#ff3b3b";
  };

  const CircularScore = () => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = getGradeColor(grade);

    return (
      <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke={T.border} strokeWidth="5" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x="60" y="58" textAnchor="middle" fontSize="24" fontWeight="bold" fill={color}>
          {score}
        </text>
        <text x="60" y="75" textAnchor="middle" fontSize="12" fill={T.muted}>
          %
        </text>
      </svg>
    );
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🏆 Efficiency Score & Gamification</h3>

      <div style={styles.scoreCard}>
        <div style={styles.scoreCircle}>
          <CircularScore />
        </div>

        <div style={styles.gradeBox}>
          <div style={{...styles.gradeText, color: getGradeColor(grade)}}>
            {grade}
          </div>
          <div style={styles.gradeLabel}>Your Efficiency Grade</div>
          
          {score >= 90 && <div style={{...styles.badge, background: "rgba(81, 207, 102, 0.1)", borderColor: "#51cf66", color: "#51cf66"}}>🏆 TOP PERFORMER</div>}
          {score >= 70 && score < 90 && <div style={{...styles.badge, background: "rgba(57, 255, 20, 0.1)", borderColor: T.success, color: T.success}}>⭐ EXCELLENT</div>}
          {score >= 50 && score < 70 && <div style={{...styles.badge, background: "rgba(255, 215, 0, 0.1)", borderColor: T.gold, color: T.gold}}>📈 GOOD</div>}
          {score < 50 && <div style={{...styles.badge, background: "rgba(255, 107, 35, 0.1)", borderColor: T.orange, color: T.orange}}>⬆️ NEEDS IMPROVEMENT</div>}
        </div>
      </div>

      {monthlyComparison && (
        <div style={styles.comparisonBox}>
          <div style={styles.compTitle}>Monthly Comparison</div>
          <div style={styles.compGrid}>
            <div style={styles.compItem}>
              <div style={styles.compLabel}>This Month</div>
              <div style={{...styles.compValue, color: monthlyComparison.comparison.costChange > 0 ? T.warn : T.success}}>
                ₹{monthlyComparison.thisMonth.cost}
              </div>
              <div style={styles.compSmall}>{monthlyComparison.thisMonth.energy} kWh</div>
            </div>
            <div style={styles.compItem}>
              <div style={styles.compLabel}>vs Last Month</div>
              <div style={{...styles.compValue, color: monthlyComparison.comparison.costChange > 0 ? T.warn : T.success}}>
                {monthlyComparison.comparison.trend}
              </div>
              <div style={styles.compSmall}>{monthlyComparison.comparison.costChange > 0 ? "+" : ""}{monthlyComparison.comparison.costChange}%</div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.factorsBox}>
        <div style={styles.factorsTitle}>Performance Factors:</div>
        <div style={styles.factorsList}>
          {factors.peakUsage && (
            <div style={styles.factorItem}>
              <div style={{...styles.factorLabel, color: factors.peakUsage.score >= 70 ? T.success : T.orange}}>
                ⚡ Peak Usage Control: {factors.peakUsage.score}%
              </div>
              <div style={styles.factorDesc}>{factors.peakUsage.label} - Ratio: {factors.peakUsage.ratio}</div>
            </div>
          )}
          {factors.consistency && (
            <div style={styles.factorItem}>
              <div style={{...styles.factorLabel, color: factors.consistency.score >= 70 ? T.success : T.orange}}>
                📊 Usage Consistency: {factors.consistency.score}%
              </div>
              <div style={styles.factorDesc}>{factors.consistency.label}</div>
            </div>
          )}
          {factors.voltageStability && (
            <div style={styles.factorItem}>
              <div style={{...styles.factorLabel, color: factors.voltageStability.score >= 80 ? T.success : T.orange}}>
                🔌 Voltage Stability: {factors.voltageStability.score}%
              </div>
              <div style={styles.factorDesc}>{factors.voltageStability.label}</div>
            </div>
          )}
          {factors.offPeakUsage && (
            <div style={styles.factorItem}>
              <div style={{...styles.factorLabel, color: Number(factors.offPeakUsage.percent) > 20 ? T.success : T.orange}}>
                🌙 Off-Peak Usage Bonus: +{factors.offPeakUsage.bonus}%
              </div>
              <div style={styles.factorDesc}>{factors.offPeakUsage.label} - {factors.offPeakUsage.percent}% off-peak</div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.tipsBox}>
        <div style={styles.tipsTitle}>💡 Improvement Tips:</div>
        {tips.map((tip, i) => (
          <div key={i} style={styles.tipItem}>
            <div style={styles.tipIcon}>{tip.icon}</div>
            <div style={styles.tipContent}>
              <div style={styles.tipText}>{tip.tip}</div>
              <div style={{...styles.tipImpact, color: T.success}}>💰 {tip.impact}</div>
            </div>
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
  scoreCard: {
    display: "flex",
    alignItems: "center",
    gap: "25px",
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: "8px",
    padding: "25px",
    marginBottom: "20px"
  },
  scoreCircle: { display: "flex", alignItems: "center", justifyContent: "center" },
  gradeBox: { flex: 1 },
  gradeText: { fontSize: "28px", fontWeight: "bold", marginBottom: "5px" },
  gradeLabel: { fontSize: "12px", color: T.muted, marginBottom: "12px" },
  badge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: "20px",
    border: "1px solid",
    fontSize: "11px",
    fontWeight: "bold"
  },
  comparisonBox: {
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: "6px",
    padding: "14px",
    marginBottom: "20px"
  },
  compTitle: { fontSize: "11px", color: T.accent, fontWeight: "bold", marginBottom: "10px" },
  compGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  compItem: { background: "rgba(0,0,0,0.3)", borderRadius: "4px", padding: "10px", textAlign: "center" },
  compLabel: { fontSize: "9px", color: T.muted, marginBottom: "5px" },
  compValue: { fontSize: "16px", fontWeight: "bold", marginBottom: "3px" },
  compSmall: { fontSize: "9px", color: T.muted },
  factorsBox: {
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: "6px",
    padding: "14px",
    marginBottom: "20px"
  },
  factorsTitle: { fontSize: "11px", fontWeight: "bold", color: T.accent, marginBottom: "10px" },
  factorsList: { display: "flex", flexDirection: "column", gap: "8px" },
  factorItem: { background: "rgba(0,0,0,0.3)", borderRadius: "4px", padding: "10px" },
  factorLabel: { fontSize: "11px", fontWeight: "bold", marginBottom: "4px" },
  factorDesc: { fontSize: "9px", color: T.muted },
  tipsBox: {
    background: "rgba(57, 255, 20, 0.05)",
    border: `1px solid ${T.success}`,
    borderRadius: "6px",
    padding: "14px"
  },
  tipsTitle: { fontSize: "11px", fontWeight: "bold", color: T.success, marginBottom: "10px" },
  tipItem: { display: "flex", gap: "10px", marginBottom: "10px" },
  tipIcon: { fontSize: "20px", minWidth: "24px" },
  tipContent: { flex: 1 },
  tipText: { fontSize: "11px", color: T.text, marginBottom: "4px" },
  tipImpact: { fontSize: "10px", fontWeight: "bold" }
};

export default EfficiencyScorePanel;
