// ========== ANOMALY DETECTION SERVICE ==========
// Detects unusual power spikes and learns device behavior patterns

const db = require("../config/firebase");

// Store learning data in memory per socket
const learningData = {
  1: { readings: [], baseline: null, threshold: 1.5 },
  2: { readings: [], baseline: null, threshold: 1.5 },
  3: { readings: [], baseline: null, threshold: 1.5 },
  4: { readings: [], baseline: null, threshold: 1.5 },
};

/**
 * Calculate statistical baseline and variance
 */
function calculateBaseline(readings) {
  if (readings.length < 5) return null;

  const recentReadings = readings.slice(-100); // Last 100 readings
  const powers = recentReadings.map(r => r.power);
  
  const mean = powers.reduce((a, b) => a + b, 0) / powers.length;
  const variance = powers.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / powers.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev, variance };
}

/**
 * Detect anomalies using statistical methods
 */
function detectAnomaly(socketId, power, voltage, current) {
  const state = learningData[socketId];
  
  // Store reading
  state.readings.push({ power, voltage, current, timestamp: new Date() });
  
  // Keep only last 200 readings to avoid memory issues
  if (state.readings.length > 200) {
    state.readings.shift();
  }

  // Update baseline every 20 readings
  if (state.readings.length % 20 === 0) {
    state.baseline = calculateBaseline(state.readings);
  }

  // Not enough data to detect anomalies yet
  if (!state.baseline) {
    return { isAnomaly: false, severity: 0, reason: null };
  }

  const { mean, stdDev } = state.baseline;
  const zScore = Math.abs((power - mean) / (stdDev || 1)); // Z-score

  // Thresholds for anomaly
  const MILD_THRESHOLD = 1.5;      // 1.5 std dev
  const MODERATE_THRESHOLD = 2.5;  // 2.5 std dev
  const SEVERE_THRESHOLD = 3.5;    // 3.5 std dev

  let severity = 0;
  let reason = null;

  if (zScore > SEVERE_THRESHOLD) {
    severity = 3; // 🔴 CRITICAL
    reason = `CRITICAL SPIKE: Power ${power}W is ${(zScore * 100 / 3.5).toFixed(0)}% above normal`;
  } else if (zScore > MODERATE_THRESHOLD) {
    severity = 2; // 🟠 WARNING
    reason = `HIGH SPIKE: Power ${power}W exceeds typical range (normal: ${mean.toFixed(0)}W)`;
  } else if (zScore > MILD_THRESHOLD) {
    severity = 1; // 🟡 NOTICE
    reason = `Unusual power: ${power}W (slightly above normal ${mean.toFixed(0)}W)`;
  }

  return {
    isAnomaly: severity > 0,
    severity, // 0=none, 1=notice, 2=warning, 3=critical
    reason,
    zScore: zScore.toFixed(2),
    baseline: mean.toFixed(2),
    normalRange: `${(mean - stdDev).toFixed(0)}-${(mean + stdDev).toFixed(0)}W`
  };
}

/**
 * Save anomaly to Firebase for historical tracking
 */
async function saveAnomaly(socketId, detection, deviceType) {
  if (!detection.isAnomaly) return;

  try {
    await db.collection("anomalies").add({
      socketId: Number(socketId),
      deviceType,
      severity: detection.severity,
      reason: detection.reason,
      zScore: Number(detection.zScore),
      baseline: Number(detection.baseline),
      normalRange: detection.normalRange,
      timestamp: new Date(),
    });

    console.log(`🚨 [SOCKET ${socketId}] Anomaly detected: ${detection.reason}`);
  } catch (err) {
    console.error("Error saving anomaly:", err);
  }
}

/**
 * Get anomaly history for a socket
 */
async function getAnomalyHistory(socketId, daysBack = 7) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const snapshot = await db
      .collection("anomalies")
      .where("socketId", "==", Number(socketId))
      .where("timestamp", ">=", since)
      .orderBy("timestamp", "desc")
      .get();

    const anomalies = [];
    snapshot.forEach((doc) => {
      anomalies.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return anomalies;
  } catch (err) {
    console.error("Error fetching anomalies:", err);
    return [];
  }
}

/**
 * Get anomaly statistics
 */
async function getAnomalyStats(socketId, daysBack = 30) {
  try {
    const anomalies = await getAnomalyHistory(socketId, daysBack);

    if (anomalies.length === 0) {
      return {
        totalAnomalies: 0,
        criticalCount: 0,
        warningCount: 0,
        noticeCount: 0,
        riskScore: 0,
        status: "HEALTHY"
      };
    }

    const criticalCount = anomalies.filter(a => a.severity === 3).length;
    const warningCount = anomalies.filter(a => a.severity === 2).length;
    const noticeCount = anomalies.filter(a => a.severity === 1).length;

    // Risk score: 0-100
    const riskScore = Math.min(100, (criticalCount * 30 + warningCount * 15 + noticeCount * 5));

    let status = "HEALTHY";
    if (riskScore > 70) status = "🔴 CRITICAL";
    else if (riskScore > 40) status = "🟠 WARNING";
    else if (riskScore > 10) status = "🟡 CAUTION";

    return {
      totalAnomalies: anomalies.length,
      criticalCount,
      warningCount,
      noticeCount,
      riskScore: Math.round(riskScore),
      status,
    };
  } catch (err) {
    console.error("Error calculating stats:", err);
    return {};
  }
}

module.exports = {
  detectAnomaly,
  saveAnomaly,
  getAnomalyHistory,
  getAnomalyStats,
};
