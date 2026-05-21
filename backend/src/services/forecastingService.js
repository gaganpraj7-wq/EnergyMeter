// ========== COST FORECASTING & PREDICTION SERVICE ==========
// Predicts future energy usage using historical patterns and time-series analysis

const db = require("../config/firebase");
const { getSensorCache } = require("./cacheService");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateKey(date) {
  return normalizeDate(date).toLocaleDateString();
}

/**
 * Calculate daily energy from timestamped reading data.
 */
function calculateDailyEnergy(readings) {
  if (!readings || readings.length === 0) return {};

  const dailyData = {};

  readings.forEach(reading => {
    const date = formatDateKey(new Date(reading.timestamp));
    dailyData[date] = (dailyData[date] || 0) + (reading.energy || 0);
  });

  return dailyData;
}

function buildDailyHistory(dailyEnergy, daysBack = 30) {
  const history = [];
  const today = normalizeDate(new Date());

  for (let offset = daysBack - 1; offset >= 0; offset--) {
    const date = new Date(today.getTime() - offset * MS_PER_DAY);
    const key = formatDateKey(date);
    history.push({ date: key, energy: Number((dailyEnergy[key] || 0).toFixed(2)) });
  }

  return history;
}

function buildSeriesFromHistory(dailyHistory) {
  return dailyHistory.map(item => ({ date: item.date, energy: Number(item.energy) }));
}

function calculateTrendPercent(dailyHistory) {
  if (dailyHistory.length < 14) return 0;

  const last7 = dailyHistory.slice(-7).map(d => d.energy);
  const prev7 = dailyHistory.slice(-14, -7).map(d => d.energy);
  const lastAvg = last7.reduce((a, b) => a + b, 0) / last7.length;
  const prevAvg = prev7.reduce((a, b) => a + b, 0) / prev7.length;

  if (prevAvg === 0) return 0;
  return ((lastAvg - prevAvg) / prevAvg) * 100;
}

function buildWeeklyTrend(dailyHistory) {
  const trendPercent = calculateTrendPercent(dailyHistory);
  const lastWeek = dailyHistory.slice(-7).reduce((sum, d) => sum + d.energy, 0);

  return {
    trendPercent: Number(trendPercent.toFixed(1)),
    lastWeekEnergy: Number(lastWeek.toFixed(2)),
    direction: trendPercent > 2 ? "📈 INCREASING" : trendPercent < -2 ? "📉 DECREASING" : "➡️ STABLE"
  };
}

function buildForecastSeries(dailyHistory, forecastDays = 7) {
  if (!dailyHistory || dailyHistory.length === 0) return [];

  const values = dailyHistory.map(d => d.energy);
  const alpha = 0.4;
  const beta = 0.2;
  let level = values[0];
  let trend = values.length > 1 ? values[1] - values[0] : 0;

  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const lastDate = new Date(dailyHistory[dailyHistory.length - 1].date);
  const forecast = [];

  for (let i = 1; i <= forecastDays; i++) {
    const predicted = Math.max(0, level + trend * i);
    const date = new Date(lastDate.getTime() + i * MS_PER_DAY);
    forecast.push({ date: formatDateKey(date), predictedEnergy: Number(predicted.toFixed(2)) });
  }

  return forecast;
}

function summarizeForecast(dailyHistory, forecastSeries, tariffPerUnit = 6.50, daysToForecast = 30) {
  const energyValues = dailyHistory.map(d => d.energy).filter(v => v >= 0);
  const historyCount = energyValues.length;
  const historicalAvg = historyCount > 0 ? energyValues.reduce((a, b) => a + b, 0) / historyCount : 0;
  const forecastAvg = forecastSeries.length > 0 ? forecastSeries.reduce((a, b) => a + b.predictedEnergy, 0) / forecastSeries.length : historicalAvg;
  const predictedMonthlyEnergy = forecastAvg * daysToForecast;
  const predictedMonthlyBill = predictedMonthlyEnergy * tariffPerUnit;

  const trendPercent = calculateTrendPercent(dailyHistory);
  const trendLabel = trendPercent > 2 ? "📈 INCREASING" : trendPercent < -2 ? "📉 DECREASING" : "➡️ STABLE";

  let confidence = "MEDIUM";
  if (historyCount > 30) confidence = "HIGH";
  if (historyCount < 10) confidence = "LOW";

  return {
    predictedDailyAvg: Number(forecastAvg.toFixed(2)),
    predictedMonthlyEnergy: Number(predictedMonthlyEnergy.toFixed(2)),
    predictedMonthlyBill: Number(predictedMonthlyBill.toFixed(2)),
    confidence,
    trend: trendLabel,
    historicalAvg: Number(historicalAvg.toFixed(2)),
    trendPercent: Number(trendPercent.toFixed(1)),
    daysAnalyzed: historyCount
  };
}

async function getCostForecast(socketId, userId, tariffPerUnit = 6.50, daysBack = 30) {
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
    snapshot.forEach((doc) => {
      readings.push({
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
      });
    });

    const dailyEnergy = calculateDailyEnergy(readings);
    const dailyHistory = buildDailyHistory(dailyEnergy, daysBack);
    const forecastSeries = buildForecastSeries(dailyHistory, 7);
    const weeklyTrend = buildWeeklyTrend(dailyHistory);
    const summary = summarizeForecast(dailyHistory, forecastSeries, tariffPerUnit, 30);

    return {
      dailyHistory,
      dailyForecast: forecastSeries,
      weeklyTrend,
      ...summary
    };
  } catch (err) {
    console.warn("Firestore forecast fetch failed, using cached sensor data:", err.message);
    const cachedReadings = getSensorCache(socketId).filter(reading => new Date(reading.timestamp) >= since);

    const dailyEnergy = calculateDailyEnergy(cachedReadings);
    const dailyHistory = buildDailyHistory(dailyEnergy, daysBack);
    const forecastSeries = buildForecastSeries(dailyHistory, 7);
    const weeklyTrend = buildWeeklyTrend(dailyHistory);
    const summary = summarizeForecast(dailyHistory, forecastSeries, tariffPerUnit, 30);

    return {
      dailyHistory,
      dailyForecast: forecastSeries,
      weeklyTrend,
      ...summary
    };
  }
}

function getHourlyPattern(readings) {
  const hourlyPattern = {};

  readings.forEach(reading => {
    const hour = new Date(reading.timestamp).getHours();
    if (!hourlyPattern[hour]) {
      hourlyPattern[hour] = [];
    }
    hourlyPattern[hour].push(reading.power || 0);
  });

  const avgByHour = {};
  for (let hour = 0; hour < 24; hour++) {
    if (hourlyPattern[hour]) {
      const values = hourlyPattern[hour];
      avgByHour[hour] = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
    } else {
      avgByHour[hour] = 0;
    }
  }

  return avgByHour;
}

module.exports = {
  getCostForecast,
  getHourlyPattern,
};
