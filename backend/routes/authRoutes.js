import express from "express";
import jwt from "jsonwebtoken";
// import User from '../models/userModel.js';
import { protect } from "../middlewares/auth.js";
import { store, saveStore } from "../dataStore.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

const router = express.Router();

const isSecureRequest = (req) => {
  return process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
};

// --- Helper function to generate JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

router.get("/me", protect, async (req, res) => {
  try {
    // req.user is set by the protect middleware
    res.json({ 
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role || 'user'
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// --- Signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = store.users.find(u => u.email === email);
    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = { _id: crypto.randomUUID(), name, email, password: hashedPassword, role: 'user' };
    store.users.push(user);
    saveStore();

    const token = generateToken(user._id);

    const isSecure = isSecureRequest(req);
    // Set token in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = store.users.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);

    const isSecure = isSecureRequest(req);
    // Set token in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Logout
router.post("/logout", (req, res) => {
  const isSecure = isSecureRequest(req);
  res.clearCookie("token", {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? "none" : "lax",
  });
  res.json({ message: "Logged out successfully" });
});

export default router;
