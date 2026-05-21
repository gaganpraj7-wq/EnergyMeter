// ========== POWER QUALITY SERVICE ==========
// Monitors voltage stability, frequency, and power factor

const db = require("../config/firebase");
const { getSensorCache } = require("./cacheService");

// Normal ranges
const NORMAL_RANGES = {
  voltage: { min: 200, max: 240 }, // India 230V ±10%
  frequency: { min: 49.5, max: 50.5 }, // Hz
  powerFactor: { min: 0.8, max: 1.0 } // > 0.8 is good
};

/**
 * Analyze power quality from voltage and current readings
 */
function analyzePowerQuality(readings) {
  if (!readings || readings.length === 0) {
    return {
      voltageStatus: "NO_DATA",
      powerFactor: 0,
      powerFactorStatus: "UNKNOWN",
      frequencyStatus: "NO_DATA",
      overallQuality: "UNKNOWN",
      qualityScore: 0
    };
  }

  const voltages = readings.map(r => r.voltage || 0).filter(v => v > 0);
  const currents = readings.map(r => r.current || 0).filter(c => c > 0);
  const powers = readings.map(r => r.power || 0).filter(p => p > 0);

  if (voltages.length === 0) {
    return {
      voltageStatus: "NO_DATA",
      powerFactor: 0,
      powerFactorStatus: "UNKNOWN",
      frequencyStatus: "NO_DATA",
      overallQuality: "UNKNOWN",
      qualityScore: 0
    };
  }

  // 📊 Voltage Analysis
  const avgVoltage = voltages.reduce((a, b) => a + b, 0) / voltages.length;
  const voltageVariation = Math.max(...voltages) - Math.min(...voltages);
  const voltageDeviationPercent = ((Math.abs(avgVoltage - 230) / 230) * 100).toFixed(1);

  let voltageStatus = "✅ GOOD";
  if (avgVoltage < NORMAL_RANGES.voltage.min) voltageStatus = "🔴 LOW VOLTAGE";
  else if (avgVoltage > NORMAL_RANGES.voltage.max) voltageStatus = "🔴 HIGH VOLTAGE";
  else if (voltageVariation > 10) voltageStatus = "🟠 UNSTABLE";

  // ⚡ Power Factor Analysis
  let avgPowerFactor = 1.0;
  if (powers.length > 0 && currents.length > 0) {
    const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
    const avgCurrent = currents.reduce((a, b) => a + b, 0) / currents.length;
    const apparentPower = avgVoltage * avgCurrent;
    
    if (apparentPower > 0) {
      avgPowerFactor = (avgPower / apparentPower).toFixed(3);
    }
  }

  let powerFactorStatus = "✅ EXCELLENT";
  if (avgPowerFactor < 0.8) powerFactorStatus = "🟠 POOR";
  else if (avgPowerFactor < 0.9) powerFactorStatus = "🟡 FAIR";
  else if (avgPowerFactor < 0.95) powerFactorStatus = "🟢 GOOD";

  // 🔄 Frequency (assumed 50Hz for India - in real scenario would be measured)
  const frequencyStatus = "✅ 50Hz STABLE"; // Placeholder

  // Overall Quality Score (0-100)
  let qualityScore = 100;

  if (avgVoltage < NORMAL_RANGES.voltage.min || avgVoltage > NORMAL_RANGES.voltage.max) {
    qualityScore -= 20;
  } else if (voltageVariation > 10) {
    qualityScore -= 10;
  }

  if (avgPowerFactor < 0.8) {
    qualityScore -= 15;
  } else if (avgPowerFactor < 0.9) {
    qualityScore -= 5;
  }

  qualityScore = Math.max(0, qualityScore);

  const overallQuality = qualityScore > 85 ? "🟢 EXCELLENT" : 
                        qualityScore > 70 ? "🟡 GOOD" : 
                        qualityScore > 50 ? "🟠 FAIR" : 
                        "🔴 POOR";

  return {
    voltageStatus,
    avgVoltage: avgVoltage.toFixed(1),
    voltageVariation: voltageVariation.toFixed(1),
    voltageDeviation: `${voltageDeviationPercent}%`,
    powerFactor: Number(avgPowerFactor),
    powerFactorStatus,
    frequencyStatus,
    overallQuality,
    qualityScore: Math.round(qualityScore),
    warnings: generateWarnings(avgVoltage, avgPowerFactor)
  };
}

/**
 * Generate warning messages
 */
function generateWarnings(voltage, powerFactor) {
  const warnings = [];

  if (voltage < 200) {
    warnings.push({
      type: "LOW_VOLTAGE",
      message: "🔴 Voltage too low - appliances may not work properly",
      action: "Contact your electricity provider"
    });
  }

  if (voltage > 240) {
    warnings.push({
      type: "HIGH_VOLTAGE",
      message: "🔴 Voltage too high - risk of appliance damage",
      action: "Install a voltage stabilizer"
    });
  }

  if (powerFactor < 0.85) {
    warnings.push({
      type: "LOW_POWER_FACTOR",
      message: "🟠 Poor power factor detected - higher losses",
      action: "Use capacitors or unload reactive loads"
    });
  }

  return warnings;
}

/**
 * Get power quality analysis for socket
 */
async function getPowerQualityAnalysis(socketId, daysBack = 7) {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  try {
    const snapshot = await db
      .collection("sensorData")
      .where("socketId", "==", Number(socketId))
      .where("timestamp", ">=", since)
      .orderBy("timestamp", "desc")
      .limit(500) // Recent 500 readings
      .get();

    const readings = [];
    snapshot.forEach((doc) => {
      readings.push(doc.data());
    });

    const analysis = analyzePowerQuality(readings);
    return analysis;
  } catch (err) {
    console.warn("Firestore power quality fetch failed, using cached sensor data:", err.message);
    const cachedReadings = getSensorCache(socketId).filter(reading => new Date(reading.timestamp) >= since);
    const analysis = analyzePowerQuality(cachedReadings);
    return analysis;
  }
}

/**
 * Save power quality alert
 */
async function savePowerQualityAlert(socketId, analysis) {
  try {
    if (analysis.qualityScore < 70) {
      await db.collection("powerQualityAlerts").add({
        socketId: Number(socketId),
        qualityScore: analysis.qualityScore,
        voltageStatus: analysis.voltageStatus,
        powerFactorStatus: analysis.powerFactorStatus,
        warningCount: analysis.warnings.length,
        timestamp: new Date(),
      });

      console.log(`⚡ [SOCKET ${socketId}] Power quality alert: ${analysis.overallQuality}`);
    }
  } catch (err) {
    console.error("Error saving power quality alert:", err);
  }
}

module.exports = {
  analyzePowerQuality,
  getPowerQualityAnalysis,
  savePowerQualityAlert,
};
