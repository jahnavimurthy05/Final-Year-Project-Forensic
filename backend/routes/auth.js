/**
 * auth.js — Register / Login routes
 *
 * Storage strategy (in priority order):
 *   1. MongoDB (if req.app.locals.db is available)
 *   2. Local JSON file store (users.json next to app.js) — works without any DB
 *
 * This means the app works out of the box even without MongoDB running.
 */

import express from "express";
import jwt from "jsonwebtoken";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { checkPasswordHash, generatePasswordHash } from "../services/password_service.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, "..", "users.json");
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey_forensic_app";

// ── Local JSON file helpers ───────────────────────────────────────────────────
function readLocalUsers() {
  try {
    if (!existsSync(USERS_FILE)) return [];
    return JSON.parse(readFileSync(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeLocalUsers(users) {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const db = req.app.locals.db;

    // ── Path 1: MongoDB ───────────────────────────────────────────────────────
    if (db) {
      try {
        const existing = await db.collection("users").findOne({ email });
        if (existing) {
          return res.status(400).json({ error: "An account with that email already exists." });
        }
        await db.collection("users").insertOne({
          username: username || email.split("@")[0],
          email,
          password_hash: await generatePasswordHash(password),
          created_at: new Date(),
        });
        return res.status(201).json({ message: "Account created successfully." });
      } catch (dbErr) {
        console.warn("[auth] MongoDB register failed, falling back to local store:", dbErr.message);
      }
    }

    // ── Path 2: Local JSON file ───────────────────────────────────────────────
    const users = readLocalUsers();
    if (users.find((u) => u.email === email)) {
      return res.status(400).json({ error: "An account with that email already exists." });
    }
    users.push({
      id: Date.now().toString(),
      username: username || email.split("@")[0],
      email,
      password_hash: await generatePasswordHash(password),
      created_at: new Date().toISOString(),
    });
    writeLocalUsers(users);
    return res.status(201).json({ message: "Account created successfully." });

  } catch (err) {
    console.error("[auth] register error:", err.message);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const db = req.app.locals.db;
    let user = null;

    // ── Path 1: MongoDB ───────────────────────────────────────────────────────
    if (db) {
      try {
        user = await db.collection("users").findOne({ email });
      } catch (dbErr) {
        console.warn("[auth] MongoDB login failed, falling back to local store:", dbErr.message);
      }
    }

    // ── Path 2: Local JSON file ───────────────────────────────────────────────
    if (!user) {
      const users = readLocalUsers();
      user = users.find((u) => u.email === email) || null;
    }

    if (!user) {
      return res.status(401).json({ error: "No account found with that email." });
    }

    const passwordOk = await checkPasswordHash(user.password_hash, password);
    if (!passwordOk) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    const token = jwt.sign(
      { user_id: user._id?.toString() || user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      token,
      user: { email: user.email, username: user.username },
    });

  } catch (err) {
    console.error("[auth] login error:", err.message);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
});

export default router;
