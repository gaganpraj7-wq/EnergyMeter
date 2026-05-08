// src/routes/analyticsRoutes.js

const express = require("express");
const router = express.Router();

const { getSummary } = require("../controllers/analyticsController");

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

module.exports = router;