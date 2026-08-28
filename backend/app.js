import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import { fileURLToPath } from "url";
import path from "path";

import authRouter from "./routes/auth.js";
import dashboardRouter from "./routes/dashboard.js";
import generationRouter from "./routes/generation.js";
import labelerRouter from "./routes/labeler.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 5000);
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/forensic_db";

app.use(cors());
app.use(express.json({ limit: "10mb" }));
// Serve static files (labeler.html etc.) from /public
app.use(express.static(path.join(__dirname, "public")));


const client = new MongoClient(mongoUri);
app.locals.db = client.db();

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api", generationRouter);
app.use("/api/labeler", labelerRouter);


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
