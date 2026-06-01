import express from "express";
import jwt from "jsonwebtoken";

import { checkPasswordHash, generatePasswordHash } from "../services/password_service.js";

const router = express.Router();

function getDb(req) {
  return req.app.locals.db;
}

router.post("/register", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.email || !data.password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = getDb(req);
    if (!db) {
      return res.status(500).json({ error: "Database not configured" });
    }

    const existingUser = await db.collection("users").findOne({ email: data.email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const userDoc = {
      username: data.username,
      email: data.email,
      password_hash: await generatePasswordHash(data.password),
      created_at: new Date(),
    };

    await db.collection("users").insertOne(userDoc);

    return res.status(201).json({
      message: "User registered successfully",
      user: { email: data.email },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.email || !data.password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const db = getDb(req);
    if (!db) {
      return res.status(500).json({ error: "Database not configured" });
    }

    const user = await db.collection("users").findOne({ email: data.email });
    if (!user || !(await checkPasswordHash(user.password_hash, data.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { user_id: user._id.toString() },
      process.env.JWT_SECRET || "supersecretjwtkey_forensic_app",
      { expiresIn: "24h" },
    );

    return res.status(200).json({
      token,
      user: {
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
