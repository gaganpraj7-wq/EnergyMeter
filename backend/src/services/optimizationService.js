// ========== AI-BASED ENERGY OPTIMIZATION ENGINE ==========
// Analyzes power usage patterns, appliance behavior, peak loads,
// and provides specific optimization suggestions

const db = require("../config/firebase");

// Device power profiles (typical power consumption in watts)
const DEVICE_PROFILES = {
  AC: { min: 1000, max: 3000, name: "Air Conditioner", priority: "HIGH" },
  HEATER: { min: 1000, max: 2000, name: "Heater", priority: "HIGH" },
  MICROWAVE: { min: 800, max: 1200, name: "Microwave", priority: "MEDIUM" },
  IRON: { min: 1000, max: 1500, name: "Iron Box", priority: "MEDIUM" },
  WASH: { min: 500, max: 2000, name: "Washing Machine", priority: "MEDIUM" },
  FRIDGE: { min: 150, max: 800, name: "Refrigerator", priority: "LOW" },
  LED: { min: 5, max: 100, name: "LED Light", priority: "LOW" },
  FAN: { min: 50, max: 300, name: "Fan", priority: "LOW" },
};

/**
 * Detect device type from power signature
 */
function detectDeviceType(avgPower) {
  for (const [key, profile] of Object.entries(DEVICE_PROFILES)) {
    if (avgPower >= profile.min && avgPower <= profile.max) {
      return { type: key, name: profile.name, priority: profile.priority };
    }
  }
  return { type: "UNKNOWN", name: "Unknown Device", priority: "MEDIUM" };
}

/**
 * Analyze peak load times and simultaneous consumption
 */
function analyzePeakLoads(multiSocketData) {
  // multiSocketData: { socketId: [readings], socketId: [readings], ... }
  
  if (!multiSocketData || Object.keys(multiSocketData).length === 0) {
    return {
      peakHours: [],
      simultaneousLoads: [],
      recommendations: []
    };
  }

  const hourlyLoad = {};
  const deviceMap = {};

  // Build hourly usage map for all sockets
  for (const [socketId, readings] of Object.entries(multiSocketData)) {
    readings.forEach(reading => {
      const date = new Date(reading.timestamp);
      const hour = date.getHours();
      const key = `${date.getDate()}-${hour}`;

      if (!hourlyLoad[key]) hourlyLoad[key] = [];
      hourlyLoad[key].push({
        socketId,
        power: reading.power || 0,
        device: detectDeviceType(reading.power || 0)
      });

      // Track devices
      if (!deviceMap[socketId]) {
        deviceMap[socketId] = detectDeviceType(reading.power || 0);
      }
    });
  }

  // Find peak hours
  const peakHours = Object.entries(hourlyLoad)
    .map(([time, data]) => ({
      time,
      totalPower: data.reduce((sum, d) => sum + d.power, 0),
      socketCount: data.length,
      devices: data
    }))
    .sort((a, b) => b.totalPower - a.totalPower)
    .slice(0, 5); // Top 5 peak hours

  // Find problematic simultaneous loads
  const simultaneousLoads = [];
  peakHours.forEach(peak => {
    if (peak.totalPower > 3000 && peak.devices.length > 1) {
      const highPowerDevices = peak.devices.filter(d => d.power > 500);
      if (highPowerDevices.length > 1) {
        simultaneousLoads.push({
          time: peak.time,
          totalPower: peak.totalPower,
          devices: highPowerDevices,
          conflict: generateConflictSuggestion(highPowerDevices)
        });
      }
    }
  });

  return {
    peakHours,
    simultaneousLoads,
    deviceMap
  };
}

/**
 * Generate specific device conflict suggestions
 */
function generateConflictSuggestion(devices) {
  const deviceNames = devices.map(d => d.device.name).sort();
  
  const conflicts = {
    "Air Conditioner,Heater": "🔥❄️ Avoid running AC and Heater simultaneously",
    "Air Conditioner,Iron Box": "⚡ Don't use Iron Box while AC is running",
    "Air Conditioner,Microwave": "🍕 Avoid Microwave during peak AC usage",
    "Heater,Iron Box": "🔥 Don't combine Heater and Iron Box usage",
    "Washing Machine,Microwave": "🌊 Schedule Washing Machine separately from Microwave",
  };

  const key = deviceNames.join(",");
  return conflicts[key] || `⚡ Stagger ${deviceNames.slice(0, 2).join(" and ")} usage`;
}

/**
 * Analyze usage patterns by time of day
 */
function analyzeTimingPatterns(multiSocketData) {
  const timePatterns = {
    morning: { hours: [5, 6, 7, 8, 9], totalUsage: 0, devices: [] },
    afternoon: { hours: [11, 12, 13, 14, 15, 16], totalUsage: 0, devices: [] },
    evening: { hours: [17, 18, 19, 20, 21], totalUsage: 0, devices: [] },
    night: { hours: [22, 23, 0, 1, 2, 3, 4], totalUsage: 0, devices: [] }
  };

  const energyByPeriod = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  for (const [socketId, readings] of Object.entries(multiSocketData)) {
    readings.forEach(reading => {
      const hour = new Date(reading.timestamp).getHours();
      const power = reading.power || 0;

      for (const [period, data] of Object.entries(timePatterns)) {
        if (data.hours.includes(hour)) {
          data.totalUsage += power;
          if (!data.devices.includes(socketId)) {
            data.devices.push(socketId);
          }
          energyByPeriod[period] += power;
        }
      }
    });
  }

  return { timePatterns, energyByPeriod };
}

/**
 * Generate comprehensive optimization suggestions
 */
function generateOptimizations(analysis, tariffPerUnit = 6.50) {
  const suggestions = [];

  const { simultaneousLoads, deviceMap, energyByPeriod } = analysis;

  // 1️⃣ Peak load suggestions
  simultaneousLoads.forEach(load => {
    const potential_savings = (load.totalPower * 0.3 * 8 * 30 * tariffPerUnit) / 1000; // Potential 30% reduction
    suggestions.push({
      priority: "HIGH",
      category: "Peak Load Balancing",
      title: load.devices.map(d => d.device.name).join(" + "),
      conflict: load.conflict,
      currentPower: `${load.totalPower}W`,
      action: `Stagger usage - run devices at different times`,
      savings: `₹${potential_savings.toFixed(0)}/month potential`,
      impact: "CRITICAL",
      timeframe: "Immediate"
    });
  });

  // 2️⃣ Usage timing recommendations
  const peakPeriod = Object.entries(energyByPeriod)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (peakPeriod && peakPeriod[1] > 10000) {
    suggestions.push({
      priority: "HIGH",
      category: "Time Shifting",
      title: `High usage during ${peakPeriod[0]}`,
      conflict: `Your peak consumption is in ${peakPeriod[0]} hours`,
      currentPower: `${peakPeriod[1].toFixed(0)}W total`,
      action: `Schedule high-power tasks outside peak hours`,
      savings: `₹${((peakPeriod[1] * 0.2 * 8 * 30 * tariffPerUnit) / 1000).toFixed(0)}/month potential`,
      impact: "HIGH",
      timeframe: "Weekly"
    });
  }

  // 3️⃣ Device-specific recommendations
  for (const [socketId, device] of Object.entries(deviceMap)) {
    if (device.priority === "HIGH") {
      suggestions.push({
        priority: "MEDIUM",
        category: "Device Optimization",
        title: device.name,
        conflict: `${device.name} is a high-power device`,
        currentPower: "Variable",
        action: `Enable scheduled operation or temperature control`,
        savings: `₹100-500/month depending on usage`,
        impact: "MEDIUM",
        timeframe: "Weekly"
      });
    }
  }

  // 4️⃣ Night usage check
  const nightUsage = energyByPeriod.night || 0;
  if (nightUsage > 1000) {
    suggestions.push({
      priority: "MEDIUM",
      category: "Night Usage",
      title: "Unusual night-time consumption",
      conflict: "Devices running during sleep hours",
      currentPower: `${nightUsage.toFixed(0)}W`,
      action: `Check for phantom loads or unnecessary usage`,
      savings: `₹50-200/month`,
      impact: "MEDIUM",
      timeframe: "Immediate"
    });
  }

  return suggestions.sort((a, b) => {
    const priorityMap = { HIGH: 1, MEDIUM: 2, LOW: 3 };
    return priorityMap[a.priority] - priorityMap[b.priority];
  });
}

/**
 * Get optimization recommendations for a socket
 */
exports.getOptimizationSuggestions = async (socketId) => {
  try {
    // Get multi-socket data (for now, just current socket)
    // In future, you might fetch all sockets to analyze patterns
    
    // Use the same collection name as the rest of the backend
    const ref = db.collection("sensorData").where("socketId", "==", Number(socketId));
    const snapshot = await ref.orderBy("timestamp", "desc").limit(1000).get();

    const readings = snapshot.docs.map(doc => doc.data());
    
    if (readings.length === 0) {
      return {
        status: "INSUFFICIENT_DATA",
        message: "Not enough data collected yet",
        suggestions: []
      };
    }

    // Analyze this socket's data
    const analysis = analyzePeakLoads({ [socketId]: readings });
    const timingAnalysis = analyzeTimingPatterns({ [socketId]: readings });

    const combined = {
      ...analysis,
      ...timingAnalysis
    };

    const suggestions = generateOptimizations(combined);

    return {
      status: "SUCCESS",
      socketId,
      analysisDate: new Date(),
      totalReadings: readings.length,
      suggestions,
      summary: {
        totalSuggestions: suggestions.length,
        criticalItems: suggestions.filter(s => s.priority === "HIGH").length,
        potentialMonthlyUse: `₹${Object.values(timingAnalysis.energyByPeriod).reduce((a, b) => a + b, 0) * 0.006 * 30}`,
      }
    };
  } catch (error) {
    console.error("Error in optimization service:", error);
    return {
      status: "ERROR",
      error: error.message,
      suggestions: []
    };
  }
};

/**
 * Analyze multiple sockets for cross-device optimization
 */
exports.getMultiSocketOptimization = async (userId) => {
  try {
    // Get all sockets for user (would need userId tracking in database)
    // For now, returns sample multi-socket analysis structure
    
    return {
      status: "SUCCESS",
      userId,
      analysisDate: new Date(),
      optimization: {
        peakConflicts: [
          {
            time: "6-9 PM",
            conflict: "AC + Microwave + Iron Box detected",
            suggestion: "Avoid simultaneous AC and heating appliances",
            potentialSavings: "₹800-1200/month"
          },
          {
            time: "12 PM",
            conflict: "Washing Machine + Microwave",
            suggestion: "Space out these appliances by 30 minutes",
            potentialSavings: "₹300-500/month"
          }
        ],
        loadBalancing: {
          current: "Unbalanced - Evening peak at 4500W",
          target: "Balanced - Distribute to 3000W per slot",
          action: "Shift 500W of usage to afternoon/morning"
        }
      }
    };
  } catch (error) {
    return {
      status: "ERROR",
      error: error.message
    };
  }
};

/**
 * Real-time warning for simultaneous high-power usage
 */
exports.checkSimultaneousLoadWarning = async (socketIds = []) => {
  try {
    const recentData = {};

    for (const socketId of socketIds) {
      const ref = db.collection("sensor_data")
        .where("socketId", "==", socketId)
        .orderBy("timestamp", "desc")
        .limit(1);
      
      const snapshot = await ref.get();
      if (!snapshot.empty) {
        recentData[socketId] = snapshot.docs[0].data();
      }
    }

    // Calculate total load
    const totalLoad = Object.values(recentData).reduce((sum, data) => sum + (data.power || 0), 0);
    const deviceCombos = Object.values(recentData).map(data => detectDeviceType(data.power || 0));

    let warning = null;
    if (totalLoad > 3000) {
      const devices = deviceCombos.map(d => d.name).sort();
      warning = {
        alert: "HIGH_SIMULTANEOUS_LOAD",
        totalPower: totalLoad,
        devices: devices.join(" + "),
        message: generateConflictSuggestion(deviceCombos.map((d, i) => ({ ...d, power: Object.values(recentData)[i].power }))),
        recommendation: "Consider deferring non-essential usage"
      };
    }

    return {
      timestamp: new Date(),
      totalLoad,
      activeDevices: socketIds.length,
      warning
    };
  } catch (error) {
    console.error("Error checking simultaneous load:", error);
    return { error: error.message };
  }
};
