const MAX_SENSOR_CACHE = 300;
const MAX_SESSION_CACHE = 100;
const MAX_ANOMALY_CACHE = 100;

const recentSensorData = {
  1: [],
  2: [],
  3: [],
  4: []
};

const recentSessions = {
  1: [],
  2: [],
  3: [],
  4: []
};

const recentAnomalies = {
  1: [],
  2: [],
  3: [],
  4: []
};

function pushSensorData(socketId, reading) {
  const id = Number(socketId);
  if (!recentSensorData[id]) return;
  recentSensorData[id].push({
    ...reading,
    timestamp: reading.timestamp instanceof Date ? reading.timestamp : new Date(reading.timestamp)
  });
  if (recentSensorData[id].length > MAX_SENSOR_CACHE) {
    recentSensorData[id].shift();
  }
}

function getSensorCache(socketId) {
  const id = Number(socketId);
  return recentSensorData[id] ? [...recentSensorData[id]] : [];
}

function pushSession(socketId, session) {
  const id = Number(socketId);
  if (!recentSessions[id]) return;
  recentSessions[id].push({
    ...session,
    startTime: session.startTime instanceof Date ? session.startTime : new Date(session.startTime),
    endTime: session.endTime instanceof Date ? session.endTime : new Date(session.endTime),
    timestamp: session.timestamp instanceof Date ? session.timestamp : new Date(session.timestamp),
  });
  if (recentSessions[id].length > MAX_SESSION_CACHE) {
    recentSessions[id].shift();
  }
}

function getSessionCache(socketId) {
  const id = Number(socketId);
  return recentSessions[id] ? [...recentSessions[id]] : [];
}

function pushAnomaly(socketId, anomaly) {
  const id = Number(socketId);
  if (!recentAnomalies[id]) return;
  recentAnomalies[id].push({
    ...anomaly,
    timestamp: anomaly.timestamp instanceof Date ? anomaly.timestamp : new Date(anomaly.timestamp)
  });
  if (recentAnomalies[id].length > MAX_ANOMALY_CACHE) {
    recentAnomalies[id].shift();
  }
}

function getAnomalyCache(socketId) {
  const id = Number(socketId);
  return recentAnomalies[id] ? [...recentAnomalies[id]] : [];
}

module.exports = {
  pushSensorData,
  getSensorCache,
  pushSession,
  getSessionCache,
  pushAnomaly,
  getAnomalyCache,
  // Clear all in-memory caches (used for UI 'reset to initial' operations)
  clearAllCaches: () => {
    Object.keys(recentSensorData).forEach(k => recentSensorData[k] = []);
    Object.keys(recentSessions).forEach(k => recentSessions[k] = []);
    Object.keys(recentAnomalies).forEach(k => recentAnomalies[k] = []);
    console.log('🧹 In-memory caches cleared');
  }
};
