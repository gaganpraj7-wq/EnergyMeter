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
  gold: "#ffd700"
};

const CostForecastPanel = ({ socketId, tariff = 6.50 }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecast();
  }, [socketId, tariff]);

  const fetchForecast = async () => {
    try {
      const res = await API.get(`/api/sensor/forecast/${socketId}?tariff=${tariff}`);
      setForecast(res.data);
    } catch (err) {
      console.error("Error fetching forecast:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>⏳ Loading...</div>;
  if (!forecast) return <div style={styles.loading}>No forecast data</div>;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>💰 Cost Prediction & Bill Forecast</h3>

      <div style={styles.forecastBox}>
        <div style={styles.label}>Next Month's Predicted Bill</div>
        <div style={styles.billAmount}>
          ₹{forecast.predictedMonthlyBill}
        </div>
        <div style={styles.subtext}>
          {forecast.predictedMonthlyEnergy} kWh × ₹{tariff}
        </div>
      </div>

      <div style={styles.gridContainer}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Daily Average</div>
          <div style={styles.cardValue}>{forecast.predictedDailyAvg} kWh</div>
          <div style={styles.cardSmall}>vs Historical: {forecast.historicalAvg}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Trend</div>
          <div style={{...styles.cardValue, color: forecast.trendPercent > 0 ? "#ff6b6b" : "#51cf66"}}>
            {forecast.trend}
          </div>
          <div style={styles.cardSmall}>{forecast.trendPercent > 0 ? "+" : ""}{forecast.trendPercent}% change</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Confidence</div>
          <div style={{...styles.cardValue, color: 
            forecast.confidence === "HIGH" ? "#51cf66" : 
            forecast.confidence === "MEDIUM" ? "#ffd700" : 
            "#ff6b6b"
          }}>
            {forecast.confidence}
          </div>
          <div style={styles.cardSmall}>{forecast.daysAnalyzed} days analyzed</div>
        </div>
      </div>

      <div style={styles.insights}>
        <div style={styles.insightTitle}>📊 Insights:</div>
        <ul style={styles.insightList}>
          <li>Based on {forecast.daysAnalyzed} days of historical data</li>
          <li>Monthly trend is {forecast.trendPercent > 2 ? "📈 INCREASING" : forecast.trendPercent < -2 ? "📉 DECREASING" : "➡️ STABLE"}</li>
          <li>Forecasting confidence is {forecast.confidence.toLowerCase()}</li>
          {forecast.trendPercent > 5 && <li style={{color: "#ff6b6b"}}>⚠️ Usage increasing - consider efficiency improvements</li>}
          {forecast.trendPercent < -5 && <li style={{color: "#51cf66"}}>✅ Usage decreasing - good job!</li>}
        </ul>
      </div>

      <div style={styles.warning}>
        <div style={styles.warningText}>
          💡 This prediction helps you budget for electricity costs. Actual bills may vary based on tariff changes and usage patterns.
        </div>
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
  forecastBox: {
    background: `linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(0, 229, 255, 0.1))`,
    border: `1px solid ${T.gold}`,
    borderRadius: "8px",
    padding: "25px",
    textAlign: "center",
    marginBottom: "20px"
  },
  label: { fontSize: "12px", color: T.muted, marginBottom: "10px" },
  billAmount: { fontSize: "48px", fontWeight: "bold", color: T.gold, textShadow: `0 0 20px ${T.gold}55`, marginBottom: "5px" },
  subtext: { fontSize: "11px", color: T.muted },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "20px"
  },
  card: {
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: "6px",
    padding: "14px",
    textAlign: "center"
  },
  cardLabel: { fontSize: "10px", color: T.muted, marginBottom: "6px" },
  cardValue: { fontSize: "18px", fontWeight: "bold", color: T.accent, marginBottom: "4px" },
  cardSmall: { fontSize: "9px", color: T.muted },
  insights: { background: T.bg, border: `1px solid ${T.border}`, borderRadius: "6px", padding: "14px", marginBottom: "12px" },
  insightTitle: { fontSize: "11px", fontWeight: "bold", color: T.accent, marginBottom: "8px" },
  insightList: { margin: 0, paddingLeft: "20px", fontSize: "10px", color: T.text, lineHeight: "1.6" },
  warning: { background: "rgba(255, 215, 0, 0.05)", border: `1px dashed ${T.gold}`, borderRadius: "6px", padding: "12px" },
  warningText: { fontSize: "10px", color: T.muted, lineHeight: "1.5" }
};

export default CostForecastPanel;
