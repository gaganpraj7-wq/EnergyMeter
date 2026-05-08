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
  getPowerQualityEndpoint,
  getEfficiencyScoreEndpoint
} = require("../controllers/sensorController");

/* POST: ESP32 */
router.post("/", addSensorData);

/* GET: dashboard */
router.get("/all", getAllSockets);

/* GET: live */
router.get("/live", getLiveData);

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

/* ⚡ TIER 2 FEATURE 1: Power Quality */
router.get("/powerquality/:socketId", getPowerQualityEndpoint);

/* 🏆 TIER 2 FEATURE 2: Efficiency Score */
router.get("/efficiency/:socketId", getEfficiencyScoreEndpoint);

module.exports = router;