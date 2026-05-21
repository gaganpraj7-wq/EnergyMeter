// ========== SESSION TRACKING SERVICE ==========
// Tracks when devices turn ON/OFF and creates usage sessions

const db = require("../config/firebase");
const { pushSession, getSessionCache } = require("../services/cacheService");
const { classifyDevice } = require("../services/deviceFingerprintService");

// Store current session state per socket
const sessionState = {
  1: { isOn: false, startTime: null, peakPower: 0 },
  2: { isOn: false, startTime: null, peakPower: 0 },
  3: { isOn: false, startTime: null, peakPower: 0 },
  4: { isOn: false, startTime: null, peakPower: 0 },
};

// ⚡ THRESHOLDS FOR DEVICE DETECTION
const THRESHOLDS = {
  ON_THRESHOLD: 5,        // Watts - device is ON if power > 5W
  OFF_THRESHOLD: 2,       // Watts - device is OFF if power < 2W
  MIN_SESSION_TIME: 3000, // 3 seconds minimum for a valid session
};

// 🎯 DEVICE FINGERPRINTING (What device is this?)
// Detects device type based on power consumption patterns
const DEVICE_SIGNATURES = {
  LED_BULB: { min: 5, max: 15, name: "💡 LED Bulb" },
  FAN: { min: 30, max: 80, name: "🌀 Fan" },
  REFRIGERATOR: { min: 100, max: 200, name: "❄️ Refrigerator" },
  AC_UNIT: { min: 800, max: 2500, name: "❄️ AC Unit" },
  WASHING_MACHINE: { min: 500, max: 2000, name: "🧺 Washing Machine" },
  MICROWAVE: { min: 1000, max: 1500, name: "🍕 Microwave" },
  HEATER: { min: 1500, max: 3000, name: "🔥 Heater" },
};

/**
 * Detect device type based on average power consumption
 */
function detectDeviceType(avgPower) {
  for (const [key, sig] of Object.entries(DEVICE_SIGNATURES)) {
    if (avgPower >= sig.min && avgPower <= sig.max) {
      return sig.name;
    }
  }
  return "❓ Unknown Device";
}

/**
 * Check if device turned ON/OFF and create session record
 */
async function trackSession(socketId, power, voltage, current, energy) {
  const state = sessionState[socketId];
  const currentTime = new Date();

  // ===== DEVICE TURNED ON =====
  if (!state.isOn && power > THRESHOLDS.ON_THRESHOLD) {
    state.isOn = true;
    state.startTime = currentTime;
    state.peakPower = power;
    
    console.log(`⚡ [SOCKET ${socketId}] DEVICE TURNED ON at ${currentTime.toLocaleTimeString()}`);
  }

  // ===== DEVICE IS RUNNING =====
  if (state.isOn) {
    state.peakPower = Math.max(state.peakPower, power);
  }

  // ===== DEVICE TURNED OFF =====
  if (state.isOn && power < THRESHOLDS.OFF_THRESHOLD) {
    const durationMs = currentTime - state.startTime;
    
    // Only save if session lasted minimum time
    if (durationMs > THRESHOLDS.MIN_SESSION_TIME) {
      const durationMinutes = (durationMs / 1000 / 60).toFixed(2);
      const avgPower = (state.peakPower * 0.8).toFixed(2); // Approximate average
      const fingerprint = classifyDevice({ voltage, current, power, energy });
      const deviceType = fingerprint.deviceName !== 'Unknown' && fingerprint.confidence >= 0.45
        ? fingerprint.deviceName
        : detectDeviceType(avgPower);

      console.log(`⏹️ [SOCKET ${socketId}] DEVICE TURNED OFF - Duration: ${durationMinutes}min, Avg Power: ${avgPower}W, Type: ${deviceType}`);
      if (fingerprint.deviceName !== deviceType) {
        console.log(`   🔎 Fingerprint fallback used: ${fingerprint.deviceName} (${fingerprint.confidence.toFixed(2)})`);
      }

      // 💾 SAVE SESSION TO FIREBASE
      const session = {
        socketId: Number(socketId),
        deviceType,
        startTime: state.startTime,
        endTime: currentTime,
        durationMs,
        durationMinutes: Number(durationMinutes),
        peakPower: state.peakPower,
        avgPower: Number(avgPower),
        energyConsumed: (state.peakPower * durationMinutes / 60).toFixed(3), // kWh
        timestamp: new Date(),
      };

      try {
        await db.collection("sessions").add(session);
        console.log(`✅ [SOCKET ${socketId}] Session saved to Firebase`);
      } catch (err) {
        console.warn(`⚠️ Firebase session save failed, caching session locally: ${err.message}`);
      }

      pushSession(socketId, session);
    }

    // Reset session state
    state.isOn = false;
    state.startTime = null;
    state.peakPower = 0;
  }
}

/**
 * Get all sessions for a specific socket (with optional date filter)
 */
async function getSessionHistory(socketId, userId, daysBack = 7) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const snapshot = await db
      .collection("sessions")
      .where("socketId", "==", Number(socketId))
      .where("startTime", ">=", since)
      .orderBy("startTime", "desc")
      .get();

    const sessions = [];
    snapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return sessions;
  } catch (err) {
    console.warn("Firestore session fetch failed, using cached sessions:", err.message);
    const cached = getSessionCache(socketId);
    return cached.filter(s => new Date(s.startTime) >= since).sort((a,b)=>new Date(b.startTime)-new Date(a.startTime));
  }
}

/**
 * Get device summary (total runtime, total energy, average session duration)
 */
async function getDeviceSummary(socketId, userId, daysBack = 30) {
  try {
    const sessions = await getSessionHistory(socketId, userId, daysBack);

    if (sessions.length === 0) {
      return {
        deviceType: "No data",
        totalSessions: 0,
        totalRuntimeMinutes: 0,
        totalEnergyKwh: 0,
        avgSessionMinutes: 0,
        peakPowerW: 0,
      };
    }

    const totalRuntimeMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
    const totalRuntimeMinutes = (totalRuntimeMs / 1000 / 60).toFixed(2);
    const totalEnergyKwh = sessions
      .reduce((sum, s) => sum + Number(s.energyConsumed), 0)
      .toFixed(3);
    const avgSessionMinutes = (totalRuntimeMinutes / sessions.length).toFixed(2);
    const peakPowerW = Math.max(...sessions.map((s) => s.peakPower));

    return {
      deviceType: sessions[0].deviceType, // Most recent device type
      totalSessions: sessions.length,
      totalRuntimeMinutes: Number(totalRuntimeMinutes),
      totalEnergyKwh: Number(totalEnergyKwh),
      avgSessionMinutes: Number(avgSessionMinutes),
      peakPowerW: peakPowerW.toFixed(2),
    };
  } catch (err) {
    console.error("Error calculating summary:", err);
    return {};
  }
}

module.exports = {
  trackSession,
  getSessionHistory,
  getDeviceSummary,
};
