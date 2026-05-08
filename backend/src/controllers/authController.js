// src/controllers/authController.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/firebase");


// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("📝 REGISTER ATTEMPT:", email);

    // ✅ 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // ✅ 2. Check if user already exists
    const existingUser = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    console.log("🔍 USER EXISTS:", !existingUser.empty ? "YES" : "NO");

    if (!existingUser.empty) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    // ✅ 3. Hash password
    const hash = await bcrypt.hash(password, 10);

    // ✅ 4. Save user (ONLY CUSTOMER ✅)
    const userRef = await db.collection("users").add({
      email,
      password: hash,
      role: "customer",   // ✅ FIXED
      createdAt: new Date()
    });

    console.log("✅ USER REGISTERED:", email, "ID:", userRef.id);

    // ✅ 5. Response
    res.status(201).json({
      message: "User registered successfully",
      userId: userRef.id
    });

  } catch (error) {
    console.error("❌ REGISTER ERROR:", error);
    res.status(500).json({
      message: "Server error during registration"
    });
  }
};


// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 LOGIN ATTEMPT:", email);

    // ✅ 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // ✅ 2. Find user
    const snapshot = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    console.log("📝 USERS FOUND:", snapshot.empty ? "NONE" : snapshot.docs.length);

    if (snapshot.empty) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    console.log("👤 USER DATA:", user.email);

    // ✅ 3. Compare password
    const match = await bcrypt.compare(password, user.password);

    console.log("🔑 PASSWORD MATCH:", match);

    if (!match) {
      return res.status(401).json({
        message: "Invalid password"
      });
    }

    // ✅ 4. Generate JWT (IMPORTANT FIX 🔥)
    const token = jwt.sign(
      {
        id: userDoc.id   // ✅ THIS IS CRITICAL
      },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "1d" }
    );

    console.log("✅ LOGIN SUCCESS:", email);

    // ✅ 5. Send response
    res.json({
      message: "Login successful",
      token,
      user: {
        id: userDoc.id,
        email: user.email
      }
    });
    

  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    res.status(500).json({
      message: "Server error during login"
    });
  }
};