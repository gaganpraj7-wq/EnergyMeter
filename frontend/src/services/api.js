// src/services/api.js

import axios from "axios";

// ✅ Base URL (supports .env)
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ✅ Axios instance
export const API = axios.create({
  baseURL: BASE_URL,
});

// ✅ Auth header
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});


// ═════════════════════════════════════════════
// 🔐 AUTH
// ═════════════════════════════════════════════
export const login = (email, password) =>
  API.post("/api/auth/login", { email, password });

export const register = (email, password) =>
  API.post("/api/auth/register", { email, password });


// ═════════════════════════════════════════════
// 🔹 OLD SYSTEM (Single Dashboard)
// ═════════════════════════════════════════════
export async function getSensorData() {
  try {
    const res = await fetch(`${BASE_URL}/api/sensor`);

    if (!res.ok) {
      throw new Error(`Sensor fetch failed: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching sensor data:", error);
    throw error;
  }
}


// ═════════════════════════════════════════════
// 🔌 MULTI-SOCKET SYSTEM
// ═════════════════════════════════════════════

export async function getAllSocketsData() {
  try {
    const res = await API.get("/api/sensor/all"); // ❌ NO AUTH HEADER
    return res.data;
  } catch (error) {
    console.error("Error fetching all sockets:", error);
    return null;
  }
}

// ✅ Single socket live (detail page)
export async function getSocketLive(socketId) {
  try {
    const res = await API.get(`/api/sensor/live?socket=${socketId}`, {
      headers: authHeader(),
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching socket live:", error);
    return null;
  }
}

// ✅ Toggle socket
export async function toggleSocket(socketId, state) {
  try {
    const res = await API.post(
      "/api/socket/control",
      { socketId, state },
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    console.error("Error toggling socket:", error);
    return null;
  }
}


// ═════════════════════════════════════════════
// 📊 HISTORY + ANALYTICS
// ═════════════════════════════════════════════

// ✅ General history (works everywhere)
export async function getHistory(socketId, range) {
  try {
    const query = socketId
      ? `?socket=${socketId}&range=${range}`
      : `?range=${range}`;

    const res = await API.get(`/api/sensor/history${query}`, {
      headers: authHeader(),
    });

    return res.data;
  } catch (error) {
    console.error("Error fetching history:", error);
    return null;
  }
}

export const getSocketHistory = async (socketId, range) => {
  try {
    const res = await API.get(`/api/sensor/history/${socketId}?range=${range}`, {
      headers: authHeader(),
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching socket history:", error);
    return null;
  }
};

// ✅ Analytics
export async function getAnalytics() {
  try {
    const res = await API.get("/api/analytics", {
      headers: authHeader(),
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return null;
  }
}


// ═════════════════════════════════════════════
// ⚡ SIMULATION (Fallback if backend fails)
// ═════════════════════════════════════════════

// Internal state
const _socketState = {
  1: { status: true,  baseLoad: 850  },
  2: { status: true,  baseLoad: 1200 },
  3: { status: false, baseLoad: 400  },
  4: { status: true,  baseLoad: 2100 },
};

const _energy = { 1: 0.01, 2: 0.03, 3: 0, 4: 0.05 };


// ✅ Simulate all sockets (hub)
export function simulateSocketsData(prev = []) {
  return [1, 2, 3, 4].map(id => {
    const st = _socketState[id];

    const current = st.status
      ? +(3.5 + Math.sin(Date.now() / 7000 + id) * 2 + Math.random()).toFixed(2)
      : 0;

    const voltage = +(220 + (Math.random() - 0.5) * 8).toFixed(1);
    const power   = st.status ? +(voltage * current).toFixed(1) : 0;

    _energy[id] = +(_energy[id] + power / 3600000).toFixed(6);

    return {
      socketId: id,
      label: `SOCKET ${id}`,
      voltage,
      current,
      power,
      energy: _energy[id],
      status: st.status,
    };
  });
}


// ✅ Simulate history (detail page)
export function simulateHistoryData(range, socketId = 1) {
  const pts =
    range === "24h" ? 48 :
    range === "7d"  ? 84 :
    90;

  const step =
    range === "24h" ? 1800000 :
    range === "7d"  ? 7200000 :
    86400000 / 3;

  const base = { 1:850, 2:1200, 3:400, 4:2100 }[socketId] || 800;

  let energy = 0;

  return Array.from({ length: pts }, (_, i) => {
    const power = Math.max(
      0,
      +(base + Math.sin(i / 6) * 300 + (Math.random() - 0.5) * 200).toFixed(1)
    );

    energy = +(energy + (power * (step / 1000)) / 3600000).toFixed(4);

    const voltage = +(220 + (Math.random() - 0.5) * 8).toFixed(1);
    const current = +(power / voltage).toFixed(2);

    return {
      timestamp: Date.now() - (pts - i) * step,
      power,
      energy,
      voltage,
      current,
    };
  });
}


// ✅ Toggle simulation
export function simulateToggle(socketId, state) {
  _socketState[socketId].status = state;
  if (!state) _energy[socketId] = 0;
}


export const getAllSockets = getAllSocketsData;
export const simAllSockets = simulateSocketsData;
export const simSocketHistory = simulateHistoryData;
export const simToggle = simulateToggle;