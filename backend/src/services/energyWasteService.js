// ========== ENERGY WASTE DETECTION SERVICE ==========
// Detects phantom loads and unnecessary device usage

const db = require("../config/firebase");
const { getSessionCache } = require("./cacheService");

const THRESHOLDS = {
  MIN_CONTINUOUS_HOURS: 0.5,  // 30 minutes
  STANDBY_POWER: 2,            // Watts
  NIGHT_HOURS: [22, 23, 0, 1, 2, 3, 4, 5, 6], // 10 PM to 6 AM
};

/**
 * Analyze device usage to find waste
 */
function analyzeWaste(sessions, tariffPerUnit = 6.50) {
  if (!sessions || sessions.length === 0) {
    return {
      phantomLoad: 0,
      wasteCostPerMonth: 0,
      unnecessaryRuntime: 0,
      recommendations: [],
      overallWasteScore: 0
    };
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Filter sessions from last 30 days
  const recentSessions = sessions.filter(s => new Date(s.startTime) >= thirtyDaysAgo);

  if (recentSessions.length === 0) {
    return {
      phantomLoad: 0,
      wasteCostPerMonth: 0,
      unnecessaryRuntime: 0,
      recommendations: [],
      overallWasteScore: 0
    };
  }

  // 🎯 Check 1: Unusually long continuous runtime (> 8 hours)
  const unnecessaryRuntime = recentSessions
    .filter(s => s.durationMinutes > 480) // > 8 hours
    .reduce((sum, s) => sum + (s.durationMinutes - 480), 0); // Extra hours only

  // 🎯 Check 2: Night usage (typically for appliances that shouldn't be on)
  const nightSessions = recentSessions.filter(s => {
    const hour = new Date(s.startTime).getHours();
    return THRESHOLDS.NIGHT_HOURS.includes(hour);
  });

  const unusualNightUsage = nightSessions.length > 0 
    ? nightSessions.reduce((sum, s) => sum + s.energyConsumed, 0)
    : 0;

  // 🎯 Check 3: Very low power devices left on (phantom load)
  const phantomLoadSessions = recentSessions.filter(s => s.avgPower < 5); // < 5W
  const phantomLoad = phantomLoadSessions.reduce((sum, s) => sum + s.energyConsumed, 0);

  // Calculate costs
  const totalWasteEnergy = phantomLoad + (unnecessaryRuntime / 60 * 2); // Assume 2W standby
  const wasteCostPerMonth = totalWasteEnergy * tariffPerUnit;

  // Build recommendations
  const recommendations = [];

  if (phantomLoad > 0.1) {
    recommendations.push({
      type: "PHANTOM_LOAD",
      title: "🔌 Phantom Load Detected",
      description: `Device left on standby consuming ${phantomLoad.toFixed(2)} kWh/month`,
      savings: `Save ₹${(phantomLoad * tariffPerUnit).toFixed(0)}/month by turning off completely`,
      severity: "HIGH"
    });
  }

  if (unusualNightUsage > 0.05) {
    recommendations.push({
      type: "NIGHT_USAGE",
      title: "🌙 Unusual Night Usage",
      description: `Device running during night hours consuming ${unusualNightUsage.toFixed(2)} kWh`,
      savings: `Consider scheduling off-peak usage to save ₹${(unusualNightUsage * tariffPerUnit * 0.2).toFixed(0)}/month`,
      severity: "MEDIUM"
    });
  }

  if (unnecessaryRuntime > 60) {
    recommendations.push({
      type: "LONG_RUNTIME",
      title: "⏱️ Extended Runtime",
      description: `Device ran ${unnecessaryRuntime} extra hours (> 8hr sessions)`,
      savings: `Optimize usage patterns to save ₹${(unnecessaryRuntime / 60 * 2 * tariffPerUnit).toFixed(0)}/month`,
      severity: "MEDIUM"
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: "EFFICIENT",
      title: "✅ Device Usage Optimized",
      description: "This device is being used efficiently",
      savings: "No immediate savings opportunity",
      severity: "LOW"
    });
  }

  // Overall waste score (0-100)
  const overallWasteScore = Math.min(100, Math.round(
    (phantomLoad * 50) + (unusualNightUsage * 20) + ((unnecessaryRuntime / 100) * 30)
  ));

  return {
    phantomLoad: phantomLoad.toFixed(2),
    wasteCostPerMonth: wasteCostPerMonth.toFixed(2),
    unnecessaryRuntime: Math.round(unnecessaryRuntime),
    totalWastySessions: phantomLoadSessions.length,
    recommendations,
    overallWasteScore,
    wasteStatus: overallWasteScore > 70 ? "🔴 HIGH WASTE" : overallWasteScore > 40 ? "🟠 MODERATE WASTE" : "🟢 OPTIMAL"
  };
}

/**
 * Get waste analysis for a socket
 */
async function getWasteAnalysis(socketId, userId, tariffPerUnit = 6.50, daysBack = 30) {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  try {
    const snapshot = await db
      .collection("sessions")
      .where("socketId", "==", Number(socketId))
      .where("startTime", ">=", since)
      .orderBy("startTime", "desc")
      .get();

    const sessions = [];
    snapshot.forEach((doc) => {
      sessions.push(doc.data());
    });

    const analysis = analyzeWaste(sessions, tariffPerUnit);

    return analysis;
  } catch (err) {
    console.warn("Firestore waste fetch failed, using cached session data:", err.message);
    const cachedSessions = getSessionCache(socketId).filter(session => new Date(session.startTime) >= since);
    return analyzeWaste(cachedSessions, tariffPerUnit);
  }
}

/**
 * Save waste detection alert
 */
async function saveWasteAlert(socketId, analysis, deviceType) {
  try {
    if (analysis.overallWasteScore > 30) {
      await db.collection("wasteAlerts").add({
        socketId: Number(socketId),
        deviceType,
        wasteScore: analysis.overallWasteScore,
        phantomLoad: Number(analysis.phantomLoad),
        wasteCostPerMonth: Number(analysis.wasteCostPerMonth),
        topRecommendation: analysis.recommendations[0].type,
        timestamp: new Date(),
      });

      console.log(`💡 [SOCKET ${socketId}] Waste detected: ${analysis.wasteStatus}`);
    }
  } catch (err) {
    console.error("Error saving waste alert:", err);
  }
}

module.exports = {
  analyzeWaste,
  getWasteAnalysis,
  saveWasteAlert,
};
