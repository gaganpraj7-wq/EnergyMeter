const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

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
const PORT = process.env.PORT || 5000;

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/sensor", require("./routes/sensorRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));

/* =========================================================
   🔌 ESP32 SERIAL CONNECTION (OPTIONAL & NON-BLOCKING)
========================================================= */

// Initialize serial connection asynchronously (non-blocking)
(async () => {
  try {
    const port = new SerialPort({
      path: "COM17",
      baudRate: 115200,
      autoOpen: false
    });

    port.open((err) => {
      if (err) {
        console.warn("⚠️  Serial port COM17 not available:", err.message);
        console.log("   → Server will run without ESP32 streaming");
        return;
      }
      console.log("✅ Serial Port Opened");

      const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));
      let lastSent = 0;

      parser.on("data", async (line) => {
        try {
          const now = Date.now();
          if (now - lastSent < 3000) return;
          lastSent = now;

          const parts = line.trim().split(",");
          if (parts.length !== 4) return;

          const [voltage, current, power, energy] = parts.map(Number);
          if ([voltage, current, power, energy].some(isNaN)) return;

          const payload = { socketId: 1, voltage, current, power, energy };
          await axios.post(`http://localhost:${PORT}/api/sensor`, payload);
        } catch (err) {
          console.error("❌ Serial error:", err.message);
        }
      });
    });
  } catch (err) {
    console.warn("⚠️  Serial port initialization skipped:", err.message);
  }
})();

/* =========================================================
   🚀 START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  // Start Telegram bot after the backend is live
  require("./telegramBot");
});