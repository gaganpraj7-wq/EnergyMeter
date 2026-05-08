const express = require("express");
const cors = require("cors");
require("dotenv").config();

// 🔥 IMPORTS
const axios = require("axios");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// 📡 ROUTES
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/sensor", require("./routes/sensorRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));

/* =========================================================
   🔌 ESP32 SERIAL CONNECTION (FIXED & SAFE)
========================================================= */

// ⚠️ Change COM port if needed
const port = new SerialPort({
  path: "COM17",
  baudRate: 115200,
  autoOpen: false
});

// ✅ Open port safely
port.open((err) => {
  if (err) {
    console.error("❌ Failed to open port:", err.message);
    return;
  }
  console.log("✅ Serial Port Opened");
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

// 🛑 Prevent too many DB writes
let lastSent = 0;

/* =========================================================
   📥 READ ESP32 SERIAL DATA
========================================================= */

parser.on("data", async (line) => {
  try {
    console.log("RAW:", line); // 🔥 DEBUG

    const now = Date.now();
    if (now - lastSent < 3000) return; // ⏱ throttle
    lastSent = now;

    const parts = line.trim().split(",");

    // ❌ Ignore invalid lines (non-CSV)
    if (parts.length !== 4) {
      console.log("⚠ Skipped (invalid format):", line);
      return;
    }

    const [voltage, current, power, energy] = parts.map(Number);

    // ❌ Ignore NaN values
    if ([voltage, current, power, energy].some(isNaN)) {
      console.log("⚠ Skipped (NaN detected):", parts);
      return;
    }

    const payload = {
      socketId: 1, // 🔥 IMPORTANT
      voltage,
      current,
      power,
      energy
    };

    console.log("📡 CLEAN DATA:", payload);

    // ✅ Send to backend controller
    await axios.post("http://localhost:5000/api/sensor", payload);

  } catch (err) {
    console.error("❌ Serial Processing Error:", err.message);
  }
});

// 🔥 Prevent crash if port fails
port.on("error", (err) => {
  console.error("❌ Serial Port Error:", err.message);
});

/* =========================================================
   🚀 START SERVER
========================================================= */

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});