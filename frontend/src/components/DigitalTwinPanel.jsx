import { useState, useEffect } from "react";
import { API } from "../services/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import "../styles/DigitalTwinPanel.css";

const DigitalTwinPanel = ({ socketId, tariff = 6.50, refreshKey }) => {
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState("baseline");

  useEffect(() => {
    setSimulation(null);
    setLoading(true);
    fetchSimulation();
  }, [socketId, tariff, refreshKey]);

  const fetchSimulation = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/api/sensor/digital-twin/${socketId}?tariff=${tariff}`);
      setSimulation(res.data);
      setSelectedScenario("baseline");
    } catch (err) {
      console.error("Error fetching digital twin simulation:", err);
      setSimulation(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="digital-twin-panel loading">⏳ Generating digital twin simulation...</div>;
  }

  if (!simulation || !simulation.scenarios?.length) {
    return <div className="digital-twin-panel empty">No digital twin data available yet.</div>;
  }

  const scenario = simulation.scenarios.find((item) => item.key === selectedScenario) || simulation.scenarios[0];

  const scenarioSeries = scenario.series ?? [];
  const historical = simulation.historical ?? [];
  const comparisonSeries = historical.slice(-7).map((item) => ({ date: item.date, energy: item.energy }));

  return (
    <div className="digital-twin-panel">
      <div className="dt-header">
        <div>
          <h3>🧠 Digital Twin Simulation</h3>
          <p>Virtual representation of future consumption under different load scenarios.</p>
        </div>
        <strong>{simulation.trendPercent >= 0 ? `Trend +${simulation.trendPercent}%` : `Trend ${simulation.trendPercent}%`}</strong>
      </div>

      <div className="dt-scenarios">
        {simulation.scenarios.map((item) => (
          <button
            key={item.key}
            className={item.key === selectedScenario ? "selected" : ""}
            onClick={() => setSelectedScenario(item.key)}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="dt-summary-grid">
        <div className="dt-card">
          <span>Scenario</span>
          <strong>{scenario.name}</strong>
          <p>{scenario.description}</p>
        </div>
        <div className="dt-card">
          <span>Daily Avg Estimate</span>
          <strong>{scenario.predictedDailyAvg} kWh</strong>
          <p>Predicted average daily consumption.</p>
        </div>
        <div className="dt-card">
          <span>Monthly Estimate</span>
          <strong>{scenario.predictedMonthlyEnergy} kWh</strong>
          <p>{scenario.changePercent >= 0 ? `+${scenario.changePercent}% vs baseline` : `${scenario.changePercent}% vs baseline`}</p>
        </div>
        <div className="dt-card">
          <span>Cost Forecast</span>
          <strong>₹{scenario.predictedMonthlyBill}</strong>
          <p>Based on tariff ₹{tariff} / kWh.</p>
        </div>
      </div>

      <div className="dt-chart-block">
        <div className="dt-chart-header">Future Consumption</div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={scenarioSeries} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#aad4ff", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#aad4ff", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#0f1a2e", border: "1px solid #1a2d4a", color: "#fff" }} />
            <Line type="monotone" dataKey="energy" stroke={scenario.color} strokeWidth={3} dot={{ r: 3, fill: scenario.color }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="dt-chart-block">
        <div className="dt-chart-header">Recent Historical Usage</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={comparisonSeries} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#aad4ff", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#aad4ff", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#0f1a2e", border: "1px solid #1a2d4a", color: "#fff" }} />
            <Line type="monotone" dataKey="energy" stroke="#00e5ff" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DigitalTwinPanel;
