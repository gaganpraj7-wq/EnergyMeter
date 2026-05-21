const express = require("express");
const router = express.Router();

const {
  addSensorData,
  getLiveData,
  getHistory,
  getAllSockets,
  getSessionHistory,
  getDeviceSummary,
  getAnomalyAnalysis,
  getWasteAnalysisEndpoint,
  getCostForecastEndpoint,
  getDigitalTwinEndpoint,
  getPowerQualityEndpoint,
  getEfficiencyScoreEndpoint,
  clearAnomalies
  ,
  resetAll
} = require("../controllers/sensorController");

/* POST: ESP32 */
router.post("/", addSensorData);

/* GET: dashboard */
router.get("/all", getAllSockets);

/* GET: live */
router.get("/live", getLiveData);

/* 🚀 DEVICE FINGERPRINTING */
router.post("/fingerprint/train", require("../controllers/sensorController").trainDeviceFingerprint);
router.post("/fingerprint/classify", require("../controllers/sensorController").classifyDeviceFingerprint);
router.get("/fingerprint/devices", require("../controllers/sensorController").getDeviceFingerprints);
router.delete("/fingerprint/clear", require("../controllers/sensorController").clearDeviceFingerprints);

/* ✅ FIXED: history per socket */
router.get("/history/:socketId", getHistory);

/* 🎯 NEW: Session history per socket */
router.get("/sessions/:socketId", getSessionHistory);

/* 📈 NEW: Device summary */
router.get("/summary/:socketId", getDeviceSummary);

/* 🚨 TIER 1 FEATURE 1: Anomaly Detection */
router.get("/anomaly/:socketId", getAnomalyAnalysis);

/* 💡 TIER 1 FEATURE 2: Energy Waste Detection */
router.get("/waste/:socketId", getWasteAnalysisEndpoint);

/* 💰 TIER 1 FEATURE 3: Cost Forecasting */
router.get("/forecast/:socketId", getCostForecastEndpoint);

/* 🌐 FEATURE 20: Digital Twin Simulation */
router.get("/digital-twin/:socketId", getDigitalTwinEndpoint);

/* ⚡ TIER 2 FEATURE 1: Power Quality */
router.get("/powerquality/:socketId", getPowerQualityEndpoint);

/* 🏆 TIER 2 FEATURE 2: Efficiency Score */
router.get("/efficiency/:socketId", getEfficiencyScoreEndpoint);

/* 🧹 CLEAR ALL ANOMALIES (TESTING) */
router.delete("/anomaly/clear/all", clearAnomalies);

/* 🔁 RESET EVERYTHING (CAUTION - DESTRUCTIVE) */
router.post("/reset-all", resetAll);

/* 🔁 RESET IN-MEMORY ANOMALY BASELINE FOR A SOCKET (NON-DESTRUCTIVE) */
router.post("/anomaly/reset/:socketId", require("../controllers/sensorController").resetBaseline);

module.exports = router;