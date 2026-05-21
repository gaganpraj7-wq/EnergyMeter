const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const path = require("path");
const envPath = path.resolve(__dirname, "../.env");
const dotenvResult = require("dotenv").config({ path: envPath });
console.log("🔎 Telegram bot env path:", envPath);
console.log("🔎 Telegram bot dotenv result:", dotenvResult.error ? "failed" : "loaded");
console.log("🔎 TELEGRAM_BOT_TOKEN present:", Boolean(process.env.TELEGRAM_BOT_TOKEN));

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID ? String(process.env.TELEGRAM_CHAT_ID) : null;
const BACKEND_PORT = process.env.BACKEND_PORT || process.env.PORT || 5000;

if (!TOKEN) {
  console.warn("⚠️  Telegram bot disabled: TELEGRAM_BOT_TOKEN is not set.");
  return;
}

const bot = new TelegramBot(TOKEN, { polling: true });

const isAllowedChat = (chatId) => {
  if (!ALLOWED_CHAT_ID) return true;
  return String(chatId) === ALLOWED_CHAT_ID;
};

const formatSocket = (socket) => {
  return `Socket ${socket.socketId}: \n` +
    `• Power: ${socket.power?.toFixed(2) || 0} W\n` +
    `• Voltage: ${socket.voltage?.toFixed(2) || 0} V\n` +
    `• Current: ${socket.current?.toFixed(2) || 0} A\n` +
    `• Energy: ${socket.energy?.toFixed(4) || 0} kWh\n` +
    `• Status: ${socket.status ? "ON" : "OFF"}`;
};

const formatAllSockets = (sockets) => {
  return sockets.map(formatSocket).join("\n\n");
};

const getAllSockets = async () => {
  const url = `http://localhost:${BACKEND_PORT}/api/sensor/all`;
  const res = await axios.get(url);
  return res.data;
};

const getSocketById = async (id) => {
  const sockets = await getAllSockets();
  return sockets.find((socket) => socket.socketId === Number(id));
};

const sendUnauthorized = async (chatId) => {
  await bot.sendMessage(chatId, "🚫 Access denied. This bot is restricted to an approved chat.");
};

bot.onText(/\/start|\/help/i, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowedChat(chatId)) {
    return sendUnauthorized(chatId);
  }

  const helpText = `🔌 *Socket2095 Bot Commands*\n\n` +
    `/status - Get metrics for all sockets\n` +
    `/socket1 - Get metrics for socket 1\n` +
    `/socket2 - Get metrics for socket 2\n` +
    `/socket3 - Get metrics for socket 3\n` +
    `/socket4 - Get metrics for socket 4\n` +
    `/help - Show this help message`;

  await bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
});

bot.onText(/\/status/i, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowedChat(chatId)) {
    return sendUnauthorized(chatId);
  }

  try {
    const sockets = await getAllSockets();
    const text = `📊 *Current Socket Metrics*\n\n${formatAllSockets(sockets)}`;
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Telegram /status error:", err.response?.data || err.message);
    await bot.sendMessage(chatId, "❌ Could not fetch socket metrics. Please try again.");
  }
});

bot.onText(/\/socket\s*([1-4])/i, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAllowedChat(chatId)) {
    return sendUnauthorized(chatId);
  }

  const socketId = match ? match[1] : null;
  if (!socketId) {
    return bot.sendMessage(chatId, "⚠️ Usage: /socket1, /socket2, /socket3, or /socket4");
  }

  try {
    const socket = await getSocketById(socketId);
    if (!socket) {
      return bot.sendMessage(chatId, `⚠️ Socket ${socketId} not found.`);
    }

    const text = `📌 *Socket ${socketId} Metrics*\n\n${formatSocket(socket)}`;
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(`Telegram /socket${socketId} error:`, err.message);
    await bot.sendMessage(chatId, "❌ Could not fetch socket data. Please try again.");
  }
});

bot.on("polling_error", (err) => {
  console.error("Telegram polling error:", err.code, err.message);
});

console.log("🤖 Telegram bot started.");
