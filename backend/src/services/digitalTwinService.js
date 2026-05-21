const db = require("../config/firebase");
const { getSensorCache } = require("./cacheService");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateKey(date) {
  return normalizeDate(date).toLocaleDateString();
}

function calculateDailyEnergy(readings) {
  const dailyEnergy = {};

  readings.forEach(reading => {
    const dateKey = formatDateKey(new Date(reading.timestamp));
    dailyEnergy[dateKey] = (dailyEnergy[dateKey] || 0) + (reading.energy || 0);
  });

  return dailyEnergy;
}

function buildDailyHistory(dailyEnergy, daysBack = 30) {
  const history = [];
  const today = normalizeDate(new Date());

  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - i * MS_PER_DAY);
    const key = formatDateKey(date);
    history.push({ date: key, energy: Number((dailyEnergy[key] || 0).toFixed(2)) });
  }

  return history;
}

function average(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function calculateTrendPercent(dailyHistory) {
  if (dailyHistory.length < 14) return 0;
  const last7 = dailyHistory.slice(-7).map(d => d.energy);
  const prev7 = dailyHistory.slice(-14, -7).map(d => d.energy);
  const lastAvg = average(last7);
  const prevAvg = average(prev7);
  if (!prevAvg) return 0;
  return ((lastAvg - prevAvg) / prevAvg) * 100;
}

function createForecastSeries(dailyHistory, days = 7) {
  const values = dailyHistory.map(d => d.energy);
  if (!values.length) return [];

  const alpha = 0.4;
  const beta = 0.2;
  let level = values[0];
  let trend = values.length > 1 ? values[1] - values[0] : 0;

  for (let i = 1; i < values.length; i++) {
    const previousLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - previousLevel) + (1 - beta) * trend;
  }

  const lastDate = new Date(dailyHistory[dailyHistory.length - 1].date);
  const forecast = [];

  for (let i = 1; i <= days; i++) {
    const predictedEnergy = Math.max(0, level + trend * i);
    const date = new Date(lastDate.getTime() + i * MS_PER_DAY);
    forecast.push({ date: formatDateKey(date), energy: Number(predictedEnergy.toFixed(2)) });
  }

  return forecast;
}

function buildScenarioForecast(baseForecast, multiplier) {
  return baseForecast.map(point => ({
    date: point.date,
    energy: Number((point.energy * multiplier).toFixed(2))
  }));
}

function buildScenarioSummary(name, description, forecastSeries, tariffPerUnit) {
  const length = forecastSeries.length;
  const monthlyEnergy = Number(forecastSeries.reduce((sum, item) => sum + item.energy, 0).toFixed(2));
  const predictedDailyAvg = length ? Number((monthlyEnergy / length).toFixed(2)) : 0;
  const predictedMonthlyEnergy = length ? Number((monthlyEnergy * 30 / length).toFixed(2)) : 0;
  const predictedMonthlyBill = length ? Number(((monthlyEnergy * 30 / length) * tariffPerUnit).toFixed(2)) : 0;
  return {
    name,
    description,
    predictedDailyAvg,
    predictedMonthlyEnergy,
    predictedMonthlyBill,
    changePercent: 0
  };
}

function attachChangePercent(baselineSummary, scenarioSummary) {
  if (!baselineSummary || !baselineSummary.predictedMonthlyEnergy) {
    scenarioSummary.changePercent = 0;
    return scenarioSummary;
  }
  scenarioSummary.changePercent = Number(
    (((scenarioSummary.predictedMonthlyEnergy - baselineSummary.predictedMonthlyEnergy) / baselineSummary.predictedMonthlyEnergy) * 100).toFixed(1)
  );
  return scenarioSummary;
}

async function getDigitalTwin(socketId, userId, tariffPerUnit = 6.50, daysBack = 30) {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  try {
    const snapshot = await db
      .collection("sensorData")
      .where("socketId", "==", Number(socketId))
      .where("timestamp", ">=", since)
      .orderBy("timestamp", "asc")
      .get();

    const readings = [];
    snapshot.forEach(doc => {
      readings.push({
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
      });
    });

    const dailyEnergy = calculateDailyEnergy(readings);
    const dailyHistory = buildDailyHistory(dailyEnergy, daysBack);
    const trendPercent = Number(calculateTrendPercent(dailyHistory).toFixed(1));
    const baselineForecast = createForecastSeries(dailyHistory, 7);

    const scenarios = [
      {
        key: "baseline",
        ...buildScenarioSummary(
          "Baseline",
          "Current usage trend continues without change.",
          baselineForecast,
          tariffPerUnit
        ),
        series: baselineForecast,
        color: "#00e5ff"
      },
      {
        key: "highLoad",
        ...attachChangePercent(
          buildScenarioSummary(
            "Baseline",
            "Current usage trend continues without change.",
            baselineForecast,
            tariffPerUnit
          ),
          buildScenarioSummary(
            "High Load",
            "Simulates a 20% increase in consumption due to additional appliances.",
            buildScenarioForecast(baselineForecast, 1.2),
            tariffPerUnit
          )
        ),
        series: buildScenarioForecast(baselineForecast, 1.2),
        color: "#ff6b6b"
      },
      {
        key: "efficient",
        ...attachChangePercent(
          buildScenarioSummary(
            "Baseline",
            "Current usage trend continues without change.",
            baselineForecast,
            tariffPerUnit
          ),
          buildScenarioSummary(
            "Energy Efficient",
            "Simulates a 20% reduction in load after optimization measures.",
            buildScenarioForecast(baselineForecast, 0.8),
            tariffPerUnit
          )
        ),
        series: buildScenarioForecast(baselineForecast, 0.8),
        color: "#51cf66"
      }
    ];

    return {
      socketId: Number(socketId),
      tariffPerUnit,
      daysBack,
      historical: dailyHistory,
      trendPercent,
      scenarios,
      createdAt: new Date()
    };
  } catch (err) {
    console.warn("Firestore digital twin fetch failed, using cached sensor data:", err.message);
    const cachedReadings = getSensorCache(socketId).filter(reading => new Date(reading.timestamp) >= since);

    const dailyEnergy = calculateDailyEnergy(cachedReadings);
    const dailyHistory = buildDailyHistory(dailyEnergy, daysBack);
    const trendPercent = Number(calculateTrendPercent(dailyHistory).toFixed(1));
    const baselineForecast = createForecastSeries(dailyHistory, 7);

    const scenarios = [
      {
        key: "baseline",
        ...buildScenarioSummary(
          "Baseline",
          "Current usage trend continues without change.",
          baselineForecast,
          tariffPerUnit
        ),
        series: baselineForecast,
        color: "#00e5ff"
      },
      {
        key: "highLoad",
        ...attachChangePercent(
          buildScenarioSummary(
            "Baseline",
            "Current usage trend continues without change.",
            baselineForecast,
            tariffPerUnit
          ),
          buildScenarioSummary(
            "High Load",
            "Simulates a 20% increase in consumption due to additional appliances.",
            buildScenarioForecast(baselineForecast, 1.2),
            tariffPerUnit
          )
        ),
        series: buildScenarioForecast(baselineForecast, 1.2),
        color: "#ff6b6b"
      },
      {
        key: "efficient",
        ...attachChangePercent(
          buildScenarioSummary(
            "Baseline",
            "Current usage trend continues without change.",
            baselineForecast,
            tariffPerUnit
          ),
          buildScenarioSummary(
            "Energy Efficient",
            "Simulates a 20% reduction in load after optimization measures.",
            buildScenarioForecast(baselineForecast, 0.8),
            tariffPerUnit
          )
        ),
        series: buildScenarioForecast(baselineForecast, 0.8),
        color: "#51cf66"
      }
    ];

    return {
      socketId: Number(socketId),
      tariffPerUnit,
      daysBack,
      historical: dailyHistory,
      trendPercent,
      scenarios,
      createdAt: new Date(),
      warning: "Using cached sensor data due to Firebase read failure"
    };
  }
}

module.exports = {
  getDigitalTwin
};
