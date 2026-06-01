import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";

import authRouter from "./routes/auth.js";
import dashboardRouter from "./routes/dashboard.js";
import generationRouter from "./routes/generation.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/forensic_db";

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const client = new MongoClient(mongoUri);
app.locals.db = client.db();

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api", generationRouter);

app.get("/", (req, res) => {
  res.json({ message: "Forensic Face Generation API is running." });
});

app.listen(port, () => {
  console.log(`Forensic Face Generation API is running on port ${port}.`);
});

process.on("SIGINT", async () => {
  await client.close();
  process.exit(0);
});
