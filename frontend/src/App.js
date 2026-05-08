// src/App.js

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import EnergyDashboard from "./pages/EnergyDashboard"; // keep old

import MultiSocketDashboard from "./pages/MultiSocketDashboard";
import SocketDetailPage from "./pages/SocketDetailPage"; // 🔥 NEW
import SettingsPage from "./pages/SettingsPage";

// Auth Wrapper (KEEP YOUR EXISTING ONE)
import ProtectedRoute from "./ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ───────── PUBLIC ROUTES ───────── */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ───────── PROTECTED ROUTES ───────── */}

        {/* 🔥 MAIN HUB (after login) */}
        <Route
          path="/sockets"
          element={
            <ProtectedRoute>
              <MultiSocketDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🔥 INDIVIDUAL SOCKET DASHBOARD */}
        <Route
          path="/socket/:id"
          element={
            <ProtectedRoute>
              <SocketDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
  path="/settings"
  element={
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  }
/>

        {/* ⚡ OLD DASHBOARD (KEEP BUT REDIRECT) */}
        <Route
          path="/dashboard"
          element={<Navigate to="/sockets" replace />}
        />

        

        {/* OPTIONAL old single dashboard */}
        <Route
          path="/energy"
          element={
            <ProtectedRoute>
              <EnergyDashboard />
            </ProtectedRoute>
          }
        />

        {/* ───────── FALLBACK ───────── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;