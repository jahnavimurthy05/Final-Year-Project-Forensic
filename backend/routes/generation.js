import express from "express";
import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { generateSyntheticProfile } from "../services/dna_service.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const projectDir = path.resolve(backendDir, "..");
const defaultPython =
  process.env.PYTHON_PATH || path.join(projectDir, ".venv", "Scripts", "python.exe");
const inferenceScript = path.join(backendDir, "inference", "generate_faces.py");
const generatorCheckpoint = path.join(backendDir, "checkpoints", "generator.pth");

router.get("/generate-synthetic-dna", async (req, res) => {
  try {
    const profile = await generateSyntheticProfile();
    const db = req.app.locals.db;

    if (db) {
      await db.collection("synthetic_dna").insertOne({
        snpMarkers: profile.snpMarkers || [],
        timestamp: new Date(),
      });

      await db.collection("phenotype_mappings").insertOne({
        traits: profile.traits || {},
        timestamp: new Date(),
      });
    }

    return res.status(200).json(profile);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/generate-face", async (req, res) => {
  const data = req.body || {};
  const traits = data.traits || {};

  if (!existsSync(generatorCheckpoint)) {
    return res.status(503).json({
      error: "Local CGAN generator checkpoint not found. Train the model first.",
      checkpoint: generatorCheckpoint,
    });
  }

  try {
    const result = await runLocalInference(traits);
    if (result.error) {
      return res.status(500).json(result);
    }

    const variations = result.variations || [];
    const confidenceScores = Array.from({ length: variations.length }, () => 0.0);

    const db = req.app.locals.db;
    if (db) {
      await db.collection("generations").insertOne({
        traits,
        variations,
        confidence_score: confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length,
        timestamp: new Date(),
      });
    }

    return res.status(200).json({
      status: "success",
      variations,
      metadata: {
        traits_used: traits,
        model: result.metadata?.model || "celeba-cgan",
        condition_dim: result.metadata?.condition_dim,
        confidence_scores: confidenceScores,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

function runLocalInference(traits) {
  return new Promise((resolve, reject) => {
    const child = spawn(defaultPython, [
      inferenceScript,
      "--traits-json",
      JSON.stringify(traits),
      "--count",
      "4",
    ]);

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Local CGAN inference timed out."));
    }, 120000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      try {
        const parsed = JSON.parse(stdout.trim());
        if (code !== 0 && !parsed.error) {
          parsed.error = stderr || `Local CGAN inference failed with exit code ${code}.`;
        }
        resolve(parsed);
      } catch {
        reject(new Error(stderr || stdout || `Local CGAN inference failed with exit code ${code}.`));
      }
    });
  });
}

export default router;
