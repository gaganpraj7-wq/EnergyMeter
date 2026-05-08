const db = require("../config/firebase");
const { trackSession, getSessionHistory, getDeviceSummary } = require("../services/sessionService");
const { detectAnomaly, saveAnomaly, getAnomalyHistory, getAnomalyStats } = require("../services/anomalyDetectionService");
const { analyzeWaste, getWasteAnalysis, saveWasteAlert } = require("../services/energyWasteService");
const { getCostForecast } = require("../services/forecastingService");
const { getPowerQualityAnalysis, savePowerQualityAlert } = require("../services/powerQualityService");
const { calculateEfficiencyScore, getMonthlyComparison } = require("../services/efficiencyScoreService");

const THRESHOLD = 5;

// 🔥 GLOBAL REAL-TIME STORAGE
let latestData = {
  1: null,
  2: null,
  3: null,
  4: null,
};

// 📥 Save sensor data (ESP32)
exports.addSensorData = async (req, res) => {
  try {
    const { socketId = 1, voltage, current, power, energy } = req.body;

    const userId = req.user?.id || "defaultUser";

    let status = "normal";

    if (current > THRESHOLD) {
      status = "overload";
      console.log("⚠ Overload:", current);
    }

    // 🔥 STORE REAL-TIME DATA
latestData[socketId] = {
  socketId: Number(socketId),
  label: `SOCKET ${socketId}`,
  voltage: Number(voltage),
  current: Number(current),
  power: Number(power),
  energy: Number(energy),
  status: true,
};

console.log("⚡ Live Stored:", latestData[socketId]);

// ✅ DEBUG HERE 👇
console.log("🔥 FIREBASE SAVE:", {
  socketId,
  voltage,
  current,
  power,
  energy
});

// ✅ Save to Firebase
await db.collection("sensorData").add({
  userId,
  socketId: Number(socketId),     // ✅ FIX
  voltage: Number(voltage),       // ✅ FIX
  current: Number(current),       // ✅ FIX
  power: Number(power),           // ✅ FIX
  energy: Number(energy),         // ✅ FIX
  status,
  timestamp: new Date(),
});

// 🎯 TRACK SESSIONS (NEW FEATURE)
await trackSession(socketId, power, voltage, current, energy);

// 🚨 ANOMALY DETECTION (TIER 1)
const anomalyDetection = detectAnomaly(socketId, power, voltage, current);
if (anomalyDetection.isAnomaly) {
  await saveAnomaly(socketId, anomalyDetection, "Device");
}

    res.json({ success: true });

  } catch (err) {
    console.error("Add Sensor Error:", err);
    res.status(500).send("Error saving data");
  }
};


// 📊 GET ALL SOCKETS (MAIN DASHBOARD)
exports.getAllSockets = (req, res) => {
  const sockets = [];

  for (let i = 1; i <= 4; i++) {
    if (i === 1 && latestData[1]) {
      sockets.push(latestData[1]); // ✅ REAL
    } else {
      sockets.push({
        socketId: i,
        label: `SOCKET ${i}`,
        voltage: 0,
        current: 0,
        power: 0,
        energy: 0,
        status: false,
      });
    }
  }

  res.json(sockets);
};


// ⚡ GET LIVE DATA (DETAIL PAGE — FIXED 🔥)
exports.getLiveData = (req, res) => {
  const id = parseInt(req.query.socket);

  if (latestData[id]) {
    return res.json(latestData[id]); // ✅ REAL-TIME
  }

  return res.json({
    socketId: id,
    voltage: 0,
    current: 0,
    power: 0,
    energy: 0,
    status: false,
  });
};


exports.getHistory = async (req, res) => {
  try {
    const socketId = Number(req.params.socketId);

    console.log("📊 Query socketId:", socketId, typeof socketId);

    const userId = "defaultUser";
    const range = req.query.range || "24h";

    let hours = 24;
    if (range === "7d") hours = 24 * 7;
    if (range === "30d") hours = 24 * 30;

    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const snapshot = await db
      .collection("sensorData")
      .where("userId", "==", userId)
      .where("socketId", "==", socketId) // 🔥 MUST MATCH TYPE
      .where("timestamp", ">=", startTime)
      .orderBy("timestamp", "asc")
      .get();

    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        ...d,
        timestamp: d.timestamp?.toDate?.() || d.timestamp
      };
    });

    console.log("📊 History fetched:", data.length);

    res.json(data);

  } catch (err) {
    console.error("History Error:", err);
    res.status(500).send("Error fetching history");
  }
};

// 🎯 GET SESSION HISTORY (NEW FEATURE)
exports.getSessionHistory = async (req, res) => {
  try {
    const socketId = Number(req.params.socketId);
    const daysBack = Number(req.query.days) || 7;
    const userId = req.user?.id || "defaultUser";

    const sessions = await getSessionHistory(socketId, userId, daysBack);

    console.log(`📊 Sessions fetched for Socket ${socketId}:`, sessions.length);
    res.json(sessions);

  } catch (err) {
    console.error("Session History Error:", err);
    res.status(500).send("Error fetching sessions");
  }
};

// 📈 GET DEVICE SUMMARY (NEW FEATURE)
exports.getDeviceSummary = async (req, res) => {
  try {
    const socketId = Number(req.params.socketId);
    const daysBack = Number(req.query.days) || 30;
    const userId = req.user?.id || "defaultUser";

    const summary = await getDeviceSummary(socketId, userId, daysBack);

    console.log(`📈 Device summary for Socket ${socketId}:`, summary);
    res.json(summary);

  } catch (err) {
    console.error("Device Summary Error:", err);
    res.status(500).send("Error fetching summary");
  }
};

// 🚨 GET ANOMALY DETECTION (TIER 1 - FEATURE 1)
exports.getAnomalyAnalysis = async (req, res) => {
  try {
    const socketId = Number(req.params.socketId);
    const stats = await getAnomalyStats(socketId);
    const history = await getAnomalyHistory(socketId);

    res.json({
      stats,
      recentAnomalies: history.slice(0, 10)
    });
  } catch (err) {
    console.error("Anomaly Analysis Error:", err);
    res.status(500).send("Error fetching anomaly analysis");
  }
};

// 💡 GET ENERGY WASTE ANALYSIS (TIER 1 - FEATURE 2)
exports.getWasteAnalysisEndpoint = async (req, res) => {
  try {
    const socketId = Number(req.params.socketId);
    const tariff = Number(req.query.tariff) || 6.50;
    const userId = req.user?.id || "defaultUser";

    const analysis = await getWasteAnalysis(socketId, userId, tariff);

    res.json(analysis);
  } catch (err) {
    console.error("Waste Analysis Error:", err);
    res.status(500).send("Error fetching waste analysis");
  }
};

// 💰 GET COST FORECASTING (TIER 1 - FEATURE 3)
exports.getCostForecastEndpoint = async (req, res) => {
  try {
    const socketId = Number(req.params.socketId);
    const tariff = Number(req.query.tariff) || 6.50;
    const userId = req.user?.id || "defaultUser";

    const forecast = await getCostForecast(socketId, userId, tariff);

    res.json(forecast);
  } catch (err) {
    console.error("Cost Forecast Error:", err);
    res.status(500).send("Error forecasting cost");
  }
};

// ⚡ GET POWER QUALITY ANALYSIS (TIER 2 - FEATURE 1)
exports.getPowerQualityEndpoint = async (req, res) => {
  try {
    const socketId = Number(req.params.socketId);

    const analysis = await getPowerQualityAnalysis(socketId);

    res.json(analysis);
  } catch (err) {
    console.error("Power Quality Error:", err);
    res.status(500).send("Error fetching power quality");
  }
};

// 🏆 GET EFFICIENCY SCORE (TIER 2 - FEATURE 2)
exports.getEfficiencyScoreEndpoint = async (req, res) => {
  try {
    const socketId = Number(req.params.socketId);

    // Get recent readings
    const snapshot = await db
      .collection("sensorData")
      .where("socketId", "==", Number(socketId))
      .orderBy("timestamp", "desc")
      .limit(200)
      .get();

    const readings = [];
    snapshot.forEach(doc => {
      readings.push(doc.data());
    });

    // Get sessions
    const sessionsSnapshot = await db
      .collection("sessions")
      .where("socketId", "==", Number(socketId))
      .orderBy("startTime", "desc")
      .limit(50)
      .get();

    const sessions = [];
    sessionsSnapshot.forEach(doc => {
      sessions.push(doc.data());
    });

    // Calculate efficiency
    const efficiencyData = calculateEfficiencyScore(readings, sessions);

    // Get monthly comparison
    const monthlyComparison = await getMonthlyComparison(socketId);

    res.json({
      efficiency: efficiencyData,
      monthlyComparison
    });
  } catch (err) {
    console.error("Efficiency Score Error:", err);
    res.status(500).send("Error calculating efficiency score");
  }
};