const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '../data/deviceFingerprintData.json');
const MIN_TRAINING_SAMPLES = 5;
const FEATURE_WEIGHTS = { power: 0.6, current: 0.3, voltage: 0.1 };
const CONFIDENCE_THRESHOLD = 0.45;

let deviceModels = {};

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf8');
  }
}

function loadModels() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('⚠️ Could not load device fingerprint models:', err.message);
    return {};
  }
}

function saveModels() {
  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(deviceModels, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️ Could not save device fingerprint models:', err.message);
  }
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeSample(sample) {
  return {
    voltage: safeNumber(sample.voltage),
    current: safeNumber(sample.current),
    power: safeNumber(sample.power),
    energy: safeNumber(sample.energy || 0),
  };
}

function computeCentroid(samples) {
  const totals = samples.reduce(
    (acc, sample) => {
      acc.voltage += sample.voltage;
      acc.current += sample.current;
      acc.power += sample.power;
      acc.energy += sample.energy;
      return acc;
    },
    { voltage: 0, current: 0, power: 0, energy: 0 }
  );

  return {
    voltage: totals.voltage / samples.length,
    current: totals.current / samples.length,
    power: totals.power / samples.length,
    energy: totals.energy / samples.length,
  };
}

function computeSimilarity(sample, centroid) {
  const diffs = Object.keys(FEATURE_WEIGHTS).map((feature) => {
    const expected = Math.max(centroid[feature], 1);
    return FEATURE_WEIGHTS[feature] * Math.abs(sample[feature] - centroid[feature]) / expected;
  });
  const score = 1 - Math.min(1, diffs.reduce((sum, value) => sum + value, 0));
  return Math.max(0, score);
}

function trainDevice(deviceName, samples) {
  if (!deviceName || typeof deviceName !== 'string') {
    throw new Error('deviceName is required');
  }
  if (!Array.isArray(samples) || samples.length < MIN_TRAINING_SAMPLES) {
    throw new Error(`Need at least ${MIN_TRAINING_SAMPLES} training samples for ${deviceName}`);
  }

  const normalized = samples.map(normalizeSample);
  const centroid = computeCentroid(normalized);

  deviceModels[deviceName] = {
    deviceName,
    sampleCount: normalized.length,
    centroid,
    samples: normalized,
    trainedAt: new Date().toISOString(),
  };

  saveModels();

  return {
    deviceName,
    sampleCount: normalized.length,
    centroid,
    message: `Trained ${deviceName} with ${normalized.length} samples`,
  };
}

function classifyDevice(reading) {
  const normalized = normalizeSample(reading);
  const models = Object.values(deviceModels);

  if (!models.length) {
    return {
      deviceName: 'Unknown',
      confidence: 0,
      reason: 'No trained devices available',
      candidates: [],
    };
  }

  const candidates = models.map((model) => {
    const confidence = computeSimilarity(normalized, model.centroid);
    return {
      deviceName: model.deviceName,
      confidence,
      centroid: model.centroid,
    };
  });

  candidates.sort((a, b) => b.confidence - a.confidence);
  const best = candidates[0];
  const deviceName = best.confidence >= CONFIDENCE_THRESHOLD ? best.deviceName : 'Unknown';

  return {
    deviceName,
    confidence: best.confidence,
    bestMatch: best,
    candidates,
  };
}

function getKnownDevices() {
  return Object.values(deviceModels).map((model) => ({
    deviceName: model.deviceName,
    sampleCount: model.sampleCount,
    trainedAt: model.trainedAt,
    centroid: model.centroid,
  }));
}

function clearModels() {
  deviceModels = {};
  saveModels();
  return { message: 'All trained device fingerprint models cleared' };
}

// Initialize from disk
deviceModels = loadModels();

module.exports = {
  trainDevice,
  classifyDevice,
  getKnownDevices,
  clearModels,
};
