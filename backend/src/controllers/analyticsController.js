// src/controllers/analyticsController.js

const db = require("../config/firebase");

/**
 * 📊 Get Analytics Summary
 * Includes:
 * - Total energy
 * - Peak power
 * - Average consumption
 * - Peak usage time
 * - Simple prediction
 * - Anomaly detection
 */
exports.getSummary = async (req, res) => {
  try {
    const snapshot = await db.collection("sensorData").get();

    if (snapshot.empty) {
      return res.json({
        message: "No data available",
        totalEnergy: 0,
        peakPower: 0,
        average: 0
      });
    }

    let totalEnergy = 0;
    let peakPower = 0;
    let powerValues = [];
    let hourlyUsage = {};

    snapshot.forEach(doc => {
      const data = doc.data();

      const energy = data.energy || 0;
      const power = data.power || 0;
      const timestamp = data.timestamp?.toDate?.() || new Date();

      totalEnergy += energy;

      // Peak power
      if (power > peakPower) {
        peakPower = power;
      }

      powerValues.push(power);

      // Group by hour
      const hour = timestamp.getHours();
      hourlyUsage[hour] = (hourlyUsage[hour] || 0) + power;
    });

    // 📊 Average
    const average = totalEnergy / snapshot.size;

    // 🕒 Peak Usage Time
    let peakHour = null;
    let maxUsage = 0;

    for (let hour in hourlyUsage) {
      if (hourlyUsage[hour] > maxUsage) {
        maxUsage = hourlyUsage[hour];
        peakHour = hour;
      }
    }

    const peakTimeRange = peakHour !== null
      ? `${peakHour}:00 - ${parseInt(peakHour) + 1}:00`
      : "N/A";

    // 🤖 Simple Prediction (Average of last values)
    const lastValues = powerValues.slice(-10);
    const prediction =
      lastValues.reduce((a, b) => a + b, 0) / (lastValues.length || 1);

    // 🚨 Anomaly Detection
    const mean =
      powerValues.reduce((a, b) => a + b, 0) / powerValues.length;

    const variance =
      powerValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      powerValues.length;

    const stdDev = Math.sqrt(variance);

    const anomalies = powerValues.filter(
      (v) => v > mean + 2 * stdDev
    );

    // ⚡ Efficiency Score
    const efficiencyScore = Math.max(
      0,
      100 - anomalies.length * 5
    );

    // 📤 Final Response
    res.json({
      totalEnergy,
      peakPower,
      average,
      peakUsageTime: peakTimeRange,
      predictedPower: prediction,
      anomalyCount: anomalies.length,
      efficiencyScore
    });

  } catch (error) {
    console.error("Analytics Error:", error);

    res.status(500).json({
      message: "Error fetching analytics"
    });
  }
};