import { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

  const historyData = forecast.dailyHistory || [];
  const forecastData = forecast.dailyForecast || [];

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🔮 Predictive Energy Consumption</h3>

      <div style={styles.forecastBox}>
        <div style={styles.label}>Monthly Estimate</div>
        <div style={styles.billAmount}>₹{forecast.predictedMonthlyBill}</div>
        <div style={styles.subtext}>{forecast.predictedMonthlyEnergy} kWh estimated for next 30 days</div>
      </div>

      <div style={styles.gridContainer}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Daily Prediction</div>
          <div style={styles.cardValue}>{forecast.predictedDailyAvg} kWh</div>
          <div style={styles.cardSmall}>Historical avg {forecast.historicalAvg} kWh</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Weekly Trend</div>
          <div style={{ ...styles.cardValue, color: forecast.weeklyTrend?.trendPercent > 0 ? "#ff6b6b" : "#51cf66" }}>
            {forecast.weeklyTrend?.direction || forecast.trend}
          </div>
          <div style={styles.cardSmall}>{forecast.weeklyTrend?.trendPercent ?? forecast.trendPercent}% vs prev week</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Prediction Confidence</div>
          <div style={{ ...styles.cardValue, color:
            forecast.confidence === "HIGH" ? "#51cf66" :
            forecast.confidence === "MEDIUM" ? "#ffd700" :
            "#ff6b6b"
          }}>
            {forecast.confidence}
          </div>
          <div style={styles.cardSmall}>{forecast.daysAnalyzed} days analyzed</div>
        </div>
      </div>

      <div style={styles.chartSection}>
        <div style={styles.chartPanel}>
          <div style={styles.chartHeader}>Daily Usage History</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={historyData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, color: T.text }} />
              <Line type="monotone" dataKey="energy" stroke={T.accent} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartPanel}>
          <div style={styles.chartHeader}>Next 7 Days Forecast</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={forecastData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, color: T.text }} />
              <Line type="monotone" dataKey="predictedEnergy" stroke={T.gold} strokeWidth={3} dot={{ r: 3, fill: T.gold }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.insights}>
        <div style={styles.insightTitle}>📈 Forecast Summary</div>
        <ul style={styles.insightList}>
          <li>Estimated monthly usage: <strong>{forecast.predictedMonthlyEnergy} kWh</strong></li>
          <li>Predicted daily average: <strong>{forecast.predictedDailyAvg} kWh</strong></li>
          <li>Last week energy: <strong>{forecast.weeklyTrend?.lastWeekEnergy} kWh</strong></li>
          <li>Trend direction: <strong>{forecast.weeklyTrend?.direction}</strong></li>
          <li>Forecast confidence is <strong>{forecast.confidence}</strong></li>
        </ul>
      </div>

      <div style={styles.warning}>
        <div style={styles.warningText}>
          💡 Predictions are based on historical usage and may vary with future behavior. Use this to plan your budget and spot rising consumption.
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
  chartSection: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" },
  chartPanel: { background: T.bg, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "14px" },
  chartHeader: { marginBottom: "12px", color: T.text, fontSize: "13px", fontWeight: 700 },
  insights: { background: T.bg, border: `1px solid ${T.border}`, borderRadius: "6px", padding: "14px", marginBottom: "12px" },
  insightTitle: { fontSize: "11px", fontWeight: "bold", color: T.accent, marginBottom: "8px" },
  insightList: { margin: 0, paddingLeft: "20px", fontSize: "10px", color: T.text, lineHeight: "1.6" },
  warning: { background: "rgba(255, 215, 0, 0.05)", border: `1px dashed ${T.gold}`, borderRadius: "6px", padding: "12px" },
  warningText: { fontSize: "10px", color: T.muted, lineHeight: "1.5" }
};

export default CostForecastPanel;
