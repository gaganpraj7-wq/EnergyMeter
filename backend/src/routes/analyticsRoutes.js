// src/routes/analyticsRoutes.js

const express = require("express");
const router = express.Router();

const { 
  getSummary, 
  getOptimizationSuggestions,
  checkSimultaneousLoad,
  getMultiSocketOptimization
} = require("../controllers/analyticsController");

const authMiddleware = require("../middleware/authMiddleware");


/**
 * @route   GET /api/analytics/summary
 * @desc    Get analytics summary (energy, peak, average)
 * @access  Admin only
 */
router.get(
  "/summary",
  authMiddleware,
  
  getSummary
);

/**
 * @route   GET /api/analytics/optimization/:socketId
 * @desc    Get AI-based energy optimization suggestions
 * @access  Private
 */
router.get(
  "/optimization/:socketId",
  authMiddleware,
  getOptimizationSuggestions
);

/**
 * @route   POST /api/analytics/simultaneous-load
 * @desc    Check for simultaneous high-power usage warning
 * @access  Private
 * @body    { socketIds: [1, 2, 3] }
 */
router.post(
  "/simultaneous-load",
  authMiddleware,
  checkSimultaneousLoad
);

/**
 * @route   GET /api/analytics/multi-socket-optimization
 * @desc    Get cross-device optimization recommendations
 * @access  Private
 */
router.get(
  "/multi-socket-optimization",
  authMiddleware,
  getMultiSocketOptimization
);

module.exports = router;