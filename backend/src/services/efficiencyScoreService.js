// ========== EFFICIENCY SCORE SERVICE ==========
// Calculates efficiency scores and gamification metrics

const db = require("../config/firebase");

/**
 * Calculate efficiency score (0-100)
 */
function calculateEfficiencyScore(readings, sessions = []) {
  if (!readings || readings.length === 0) {
    return {
      score: 0,
      grade: "—",
      factors: {},
      tips: []
    };
  }

  let score = 100;
  const factors = {};

  // 1️⃣ Peak to Average Ratio (lower is better - smoother usage)
  const powers = readings.map(r => r.power || 0).filter(p => p > 0);
  if (powers.length > 0) {
    const maxPower = Math.max(...powers);
    const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
    const peakRatio = avgPower > 0 ? maxPower / avgPower : 1;

    let peakScore = 100 - (Math.min(peakRatio - 1, 5) / 5 * 30); // 30 points
    factors.peakUsage = {
      ratio: peakRatio.toFixed(2),
      score: Math.round(peakScore),
      label: peakRatio < 1.5 ? "✅ SMOOTH" : peakRatio < 2.5 ? "🟡 MODERATE SPIKES" : "🔴 SEVERE SPIKES"
    };
    score -= (100 - peakScore);
  }

  // 2️⃣ Load Factor (how consistently device is used)
  if (sessions && sessions.length > 0) {
    const avgSessionEnergy = sessions.reduce((sum, s) => sum + (s.energyConsumed || 0), 0) / sessions.length;
    const stdDev = Math.sqrt(
      sessions.reduce((sum, s) => sum + Math.pow((s.energyConsumed || 0) - avgSessionEnergy, 2), 0) / sessions.length
    );

    const variability = avgSessionEnergy > 0 ? (stdDev / avgSessionEnergy) : 0;
    let loadScore = 100 - (Math.min(variability, 1) * 20); // 20 points

    factors.consistency = {
      variability: variability.toFixed(2),
      score: Math.round(loadScore),
      label: variability < 0.3 ? "✅ CONSISTENT" : variability < 0.7 ? "🟡 VARIABLE" : "🔴 HIGHLY VARIABLE"
    };
    score -= (100 - loadScore);
  }

  // 3️⃣ Voltage Stability
  const voltages = readings.map(r => r.voltage || 0).filter(v => v > 0);
  if (voltages.length > 0) {
    const voltageVar = Math.max(...voltages) - Math.min(...voltages);
    let voltageScore = 100 - (Math.min(voltageVar, 20) / 20 * 15); // 15 points
    if (Math.min(...voltages) < 200 || Math.max(...voltages) > 240) {
      voltageScore -= 10;
    }

    factors.voltageStability = {
      variation: voltageVar.toFixed(1),
      score: Math.round(voltageScore),
      label: voltageVar < 5 ? "✅ STABLE" : voltageVar < 15 ? "🟡 MODERATE" : "🔴 UNSTABLE"
    };
    score -= (100 - voltageScore);
  }

  // 4️⃣ Off-peak Usage Bonus
  if (sessions && sessions.length > 0) {
    const offPeakSessions = sessions.filter(s => {
      const hour = new Date(s.startTime).getHours();
      return hour >= 22 || hour < 6; // 10 PM to 6 AM (typically cheaper)
    });
    const offPeakPercent = (offPeakSessions.length / sessions.length) * 100;
    const offPeakBonus = Math.min(offPeakPercent / 50 * 10, 10); // Max 10 bonus points

    factors.offPeakUsage = {
      percent: offPeakPercent.toFixed(1),
      bonus: Math.round(offPeakBonus),
      label: offPeakPercent > 30 ? "✅ GOOD TIMING" : "🟡 NEUTRAL"
    };
    score += offPeakBonus;
  }

  score = Math.max(0, Math.min(100, score));

  // Determine grade
  let grade = "—";
  if (score >= 90) grade = "🏆 A+";
  else if (score >= 80) grade = "🥇 A";
  else if (score >= 70) grade = "🥈 B";
  else if (score >= 60) grade = "🥉 C";
  else if (score >= 50) grade = "📉 D";
  else grade = "❌ F";

  // Generate tips
  const tips = generateEfficiencyTips(factors);

  return {
    score: Math.round(score),
    grade,
    factors,
    tips
  };
}

/**
 * Generate efficiency improvement tips
 */
function generateEfficiencyTips(factors) {
  const tips = [];

  if (factors.peakUsage && factors.peakUsage.score < 70) {
    tips.push({
      icon: "⚡",
      tip: "Reduce power spikes by avoiding simultaneous high-load operations",
      impact: "Save up to 5-10% on energy bills"
    });
  }

  if (factors.consistency && factors.consistency.score < 70) {
    tips.push({
      icon: "⏰",
      tip: "Establish consistent usage patterns for better efficiency",
      impact: "Improve device lifespan by 10-15%"
    });
  }

  if (factors.voltageStability && factors.voltageStability.score < 80) {
    tips.push({
      icon: "🔌",
      tip: "Voltage fluctuations detected - consider a stabilizer",
      impact: "Protect appliances from damage"
    });
  }

  if (factors.offPeakUsage && Number(factors.offPeakUsage.percent) < 20) {
    tips.push({
      icon: "🌙",
      tip: "Shift more usage to night hours (10 PM - 6 AM) for lower rates",
      impact: "Save 15-20% during off-peak hours"
    });
  }

  if (tips.length === 0) {
    tips.push({
      icon: "⭐",
      tip: "Excellent efficiency! Maintain your current usage patterns",
      impact: "You're already performing optimally"
    });
  }

  return tips;
}

/**
 * Get monthly efficiency comparison
 */
async function getMonthlyComparison(socketId, tariffPerUnit = 6.50) {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // This month's data
    const thisMonthSnapshot = await db
      .collection("sensorData")
      .where("socketId", "==", Number(socketId))
      .where("timestamp", ">=", thisMonthStart)
      .orderBy("timestamp", "asc")
      .get();

    // Last month's data
    const lastMonthSnapshot = await db
      .collection("sensorData")
      .where("socketId", "==", Number(socketId))
      .where("timestamp", ">=", lastMonthStart)
      .where("timestamp", "<=", lastMonthEnd)
      .orderBy("timestamp", "asc")
      .get();

    let thisMonthEnergy = 0;
    thisMonthSnapshot.forEach(doc => {
      thisMonthEnergy += doc.data().energy || 0;
    });

    let lastMonthEnergy = 0;
    lastMonthSnapshot.forEach(doc => {
      lastMonthEnergy += doc.data().energy || 0;
    });

    const thisMonthCost = thisMonthEnergy * tariffPerUnit;
    const lastMonthCost = lastMonthEnergy * tariffPerUnit;
    const costChange = ((thisMonthCost - lastMonthCost) / (lastMonthCost || 1) * 100).toFixed(1);

    return {
      thisMonth: {
        energy: thisMonthEnergy.toFixed(2),
        cost: thisMonthCost.toFixed(2),
        daysData: Math.ceil((now - thisMonthStart) / (1000 * 60 * 60 * 24))
      },
      lastMonth: {
        energy: lastMonthEnergy.toFixed(2),
        cost: lastMonthCost.toFixed(2)
      },
      comparison: {
        energyChange: ((thisMonthEnergy - lastMonthEnergy) / (lastMonthEnergy || 1) * 100).toFixed(1),
        costChange,
        trend: Number(costChange) > 0 ? "📈 INCREASED" : "📉 DECREASED"
      }
    };
  } catch (err) {
    console.error("Error getting monthly comparison:", err);
    return null;
  }
}

module.exports = {
  calculateEfficiencyScore,
  generateEfficiencyTips,
  getMonthlyComparison,
};
