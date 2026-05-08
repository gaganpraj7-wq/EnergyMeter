// ========== COST FORECASTING & PREDICTION SERVICE ==========
// Predicts future energy bills using historical patterns

const db = require("../config/firebase");

/**
 * Simple exponential smoothing for forecasting
 */
function exponentialSmoothing(data, alpha = 0.3, periods = 7) {
  if (data.length < 2) return [];

  const forecast = [];
  let s = data[0];

  forecast.push(s);

  for (let i = 1; i < data.length; i++) {
    s = alpha * data[i] + (1 - alpha) * s;
    forecast.push(s);
  }

  // Project forward
  let lastValue = s;
  for (let i = 0; i < periods; i++) {
    lastValue = alpha * lastValue + (1 - alpha) * lastValue;
    forecast.push(lastValue);
  }

  return forecast;
}

/**
 * Calculate daily energy from hourly data
 */
function calculateDailyEnergy(readings) {
  if (!readings || readings.length === 0) return {};

  const dailyData = {};

  readings.forEach(reading => {
    const date = new Date(reading.timestamp).toLocaleDateString();
    if (!dailyData[date]) {
      dailyData[date] = 0;
    }
    dailyData[date] += reading.energy || 0;
  });

  return dailyData;
}

/**
 * Forecast next month's bill
 */
function forecastMonthlyBill(historicalDailyEnergy, tariffPerUnit = 6.50, daysToForecast = 30) {
  const energyValues = Object.values(historicalDailyEnergy).map(Number);

  if (energyValues.length < 5) {
    return {
      predictedDailyAvg: 0,
      predictedMonthlyEnergy: 0,
      predictedMonthlyBill: 0,
      confidence: "LOW (Not enough data)",
      trend: "Insufficient data"
    };
  }

  // Calculate average
  const avgDaily = energyValues.reduce((a, b) => a + b, 0) / energyValues.length;

  // Calculate trend (simple)
  const recent = energyValues.slice(-7);
  const older = energyValues.slice(-14, -7);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const trendPercent = ((recentAvg - olderAvg) / olderAvg * 100);

  // Adjusted forecast
  let adjustedDaily = avgDaily * (1 + trendPercent / 100);

  // Ensure at least 1.5x older average to be realistic
  if (adjustedDaily > oldAvg * 2) {
    adjustedDaily = avgDaily; // Use baseline if trend is too extreme
  }

  const predictedMonthlyEnergy = adjustedDaily * daysToForecast;
  const predictedMonthlyBill = predictedMonthlyEnergy * tariffPerUnit;

  // Confidence level
  let confidence = "MEDIUM";
  if (energyValues.length > 30) confidence = "HIGH";
  if (energyValues.length < 10) confidence = "LOW";

  const trend = trendPercent > 2 ? "📈 INCREASING" : trendPercent < -2 ? "📉 DECREASING" : "➡️ STABLE";

  return {
    predictedDailyAvg: adjustedDaily.toFixed(2),
    predictedMonthlyEnergy: predictedMonthlyEnergy.toFixed(2),
    predictedMonthlyBill: predictedMonthlyBill.toFixed(2),
    confidence,
    trend,
    historicalAvg: avgDaily.toFixed(2),
    trendPercent: trendPercent.toFixed(1),
    daysAnalyzed: energyValues.length
  };
}

/**
 * Get cost forecast for a socket
 */
async function getCostForecast(socketId, userId, tariffPerUnit = 6.50, daysBack = 30) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

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
    const forecast = forecastMonthlyBill(dailyEnergy, tariffPerUnit);

    return forecast;
  } catch (err) {
    console.error("Error forecasting:", err);
    return {
      predictedDailyAvg: 0,
      predictedMonthlyEnergy: 0,
      predictedMonthlyBill: 0,
      confidence: "ERROR",
      trend: "Unable to forecast"
    };
  }
}

/**
 * Get hourly breakdown forecast
 */
function getHourlyPattern(readings) {
  const hourlyPattern = {};

  readings.forEach(reading => {
    const hour = new Date(reading.timestamp).getHours();
    if (!hourlyPattern[hour]) {
      hourlyPattern[hour] = [];
    }
    hourlyPattern[hour].push(reading.power || 0);
  });

  // Average per hour
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
  forecastMonthlyBill,
  getCostForecast,
  getHourlyPattern,
};
