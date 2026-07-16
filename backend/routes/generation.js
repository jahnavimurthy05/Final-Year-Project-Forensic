import express from "express";
import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { generateSyntheticProfile, normalizeTraits } from "../services/dna_service.js";
import {
  encodeImageAsDataUrl,
  loadFaceGallery,
  selectGalleryFaces,
} from "../services/face_gallery_service.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const projectDir = path.resolve(backendDir, "..");
const defaultPython =
  process.env.PYTHON_PATH || path.join(projectDir, ".venv", "Scripts", "python.exe");
const inferenceScript = path.join(backendDir, "inference", "generate_faces.py");
const phenotypeScript = path.join(backendDir, "inference", "predict_traits.py");
const styleganScript = path.join(backendDir, "inference", "stylegan_generate.py");
const irisRecolorScript = path.join(backendDir, "inference", "recolor_iris.py");
const generatorCheckpoint = path.join(backendDir, "checkpoints", "generator_celeba_v1.pth");
const generatorConfig = path.join(backendDir, "checkpoints", "cgan_config.json");
const styleganNetwork = path.resolve(
  process.env.STYLEGAN_FFHQ_PICKLE || path.join(backendDir, "checkpoints", "stylegan2-ada-ffhq.pkl"),
);
const styleganRepo = path.resolve(
  process.env.STYLEGAN_REPO_DIR || path.join(backendDir, "models", "stylegan2-ada-pytorch"),
);
const latentDirectionsDir = path.resolve(
  process.env.LATENT_DIRECTIONS_DIR || path.join(backendDir, "checkpoints", "latent_directions"),
);
const kaggleGalleryDir = path.resolve(
  process.env.KAGGLE_FACE_GALLERY_DIR || path.join(backendDir, "generated_faces", "kaggle"),
);

router.get("/generate-synthetic-dna", async (req, res) => {
  try {
    const profile = await generateSyntheticProfile();
    const prediction = await predictTraits(profile);
    const enrichedProfile = {
      ...profile,
      traits: prediction.traits || normalizeTraits(profile.traits || {}),
      probabilities: prediction.probabilities,
      phenotypeMetadata: prediction.metadata,
    };
    const db = req.app.locals.db;

    if (db) {
      await db.collection("synthetic_dna").insertOne({
        snpMarkers: enrichedProfile.snpMarkers || [],
        timestamp: new Date(),
      });

      await db.collection("phenotype_mappings").insertOne({
        traits: enrichedProfile.traits || {},
        probabilities: enrichedProfile.probabilities || {},
        timestamp: new Date(),
      });
    }

    return res.status(200).json(enrichedProfile);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/generate-face", async (req, res) => {
  const data = req.body || {};
  const prediction = await predictTraits(data);
  const traits = prediction.traits || normalizeTraits(data.traits || {});
  const phenotypeMetadata = {
    probabilities: prediction.probabilities || {},
    predictor: prediction.metadata || {},
  };

  try {
    const result = await runStyleganInference(traits);
    if (result.status === "success") {
      const { variations, postProcessing } = await applyPostProcessing(result.variations || [], traits);
      const confidenceScores = Array.from({ length: variations.length }, () => 0.0);
      await saveGeneration(req, traits, variations, confidenceScores, "stylegan2-ada-ffhq");

      return res.status(200).json({
        status: "success",
        variations,
        metadata: {
          traits_used: traits,
          phenotype: phenotypeMetadata,
          model: "stylegan2-ada-ffhq",
          stylegan: result.metadata,
          confidence_scores: confidenceScores,
          post_processing: postProcessing,
        },
      });
    }
  } catch {
    // Fall through to gallery/CGAN when StyleGAN assets are not configured locally.
  }

  const gallery = loadFaceGallery(kaggleGalleryDir);
  if (gallery.length > 0) {
    try {
      const selectedFaces = selectGalleryFaces(gallery, traits, 4);
      const rawVariations = selectedFaces.map((face) => encodeImageAsDataUrl(face.imagePath));
      const { variations, postProcessing } = await applyPostProcessing(rawVariations, traits);
      const confidenceScores = selectedFaces.map((face) => face.score);
      await saveGeneration(req, traits, variations, confidenceScores, "kaggle-gallery");

      return res.status(200).json({
        status: "success",
        variations,
        metadata: {
          traits_used: traits,
          phenotype: phenotypeMetadata,
          model: "kaggle-gallery",
          source: kaggleGalleryDir,
          confidence_scores: confidenceScores,
          matched_files: selectedFaces.map((face) => face.file),
          post_processing: postProcessing,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (!existsSync(generatorCheckpoint)) {
    return res.status(503).json({
      error:
        "No Kaggle face gallery found and local CGAN generator checkpoint not found. Add Kaggle outputs or train the model first.",
      gallery: kaggleGalleryDir,
      checkpoint: generatorCheckpoint,
    });
  }

  try {
    const result = await runLocalInference(traits);
    if (result.error) {
      return res.status(500).json(result);
    }

    const { variations, postProcessing } = await applyPostProcessing(result.variations || [], traits);
    const confidenceScores = Array.from({ length: variations.length }, () => 0.0);
    await saveGeneration(req, traits, variations, confidenceScores, result.metadata?.model || "celeba-cgan");

    return res.status(200).json({
      status: "success",
      variations,
      metadata: {
        traits_used: traits,
        phenotype: phenotypeMetadata,
        model: result.metadata?.model || "celeba-cgan",
        condition_dim: result.metadata?.condition_dim,
        confidence_scores: confidenceScores,
        post_processing: postProcessing,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

async function saveGeneration(req, traits, variations, confidenceScores, model) {
  const db = req.app.locals.db;
  if (!db) {
    return;
  }

  await db.collection("generations").insertOne({
    traits,
    variations,
    model,
    confidence_score:
      confidenceScores.length > 0
        ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
        : 0,
    timestamp: new Date(),
  });
}

async function applyPostProcessing(variations, traits) {
  const eyeColor = traits.eyeColor || traits.eye_color;
  if (!eyeColor || variations.length === 0 || !existsSync(irisRecolorScript)) {
    return { variations, postProcessing: [] };
  }

  try {
    const result = await runIrisRecolor(variations, eyeColor);
    if (result.status === "success" && Array.isArray(result.variations)) {
      return {
        variations: result.variations,
        postProcessing: [{ type: "iris-recolor", eyeColor, metadata: result.metadata || {} }],
      };
    }
  } catch {
    // Keep original images when optional post-processing fails.
  }

  return { variations, postProcessing: [] };
}

function runIrisRecolor(variations, eyeColor) {
  return new Promise((resolve, reject) => {
    const child = spawn(defaultPython, [irisRecolorScript]);
    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Iris recoloring timed out."));
    }, 30000);

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
          parsed.error = stderr || `Iris recoloring failed with exit code ${code}.`;
        }
        resolve(parsed);
      } catch {
        reject(new Error(stderr || stdout || `Iris recoloring failed with exit code ${code}.`));
      }
    });

    child.stdin.write(JSON.stringify({ variations, eyeColor }));
    child.stdin.end();
  });
}

function runLocalInference(traits) {
  return new Promise((resolve, reject) => {
    const child = spawn(defaultPython, [
      inferenceScript,
      "--traits-json",
      JSON.stringify(traits),
      "--checkpoint",
      generatorCheckpoint,
      "--config",
      generatorConfig,
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

async function predictTraits(profile) {
  if (!existsSync(phenotypeScript)) {
    return {
      traits: normalizeTraits(profile.traits || profile || {}),
      probabilities: {},
      metadata: { model: "manual-traits-only" },
    };
  }

  try {
    const result = await runPhenotypePrediction(profile);
    if (result.status === "success") {
      return result;
    }
  } catch {
    // Fall back to caller-provided traits when the optional Python predictor fails.
  }

  return {
    traits: normalizeTraits(profile.traits || profile || {}),
    probabilities: {},
    metadata: { model: "manual-traits-fallback" },
  };
}

function runStyleganInference(traits) {
  return new Promise((resolve, reject) => {
    const child = spawn(defaultPython, [
      styleganScript,
      "--traits-json",
      JSON.stringify(traits),
      "--network",
      styleganNetwork,
      "--stylegan-repo",
      styleganRepo,
      "--directions-dir",
      latentDirectionsDir,
      "--count",
      "4",
    ]);

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("StyleGAN2 inference timed out."));
    }, 180000);

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
          parsed.error = stderr || `StyleGAN2 inference failed with exit code ${code}.`;
        }
        resolve(parsed);
      } catch {
        reject(new Error(stderr || stdout || `StyleGAN2 inference failed with exit code ${code}.`));
      }
    });
  });
}

function runPhenotypePrediction(profile) {
  return new Promise((resolve, reject) => {
    const child = spawn(defaultPython, [
      phenotypeScript,
      "--profile-json",
      JSON.stringify(profile || {}),
    ]);
    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Phenotype prediction timed out."));
    }, 30000);

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
          parsed.error = stderr || `Phenotype prediction failed with exit code ${code}.`;
        }
        resolve(parsed);
      } catch {
        reject(new Error(stderr || stdout || `Phenotype prediction failed with exit code ${code}.`));
      }
    });
  });
}
}

export default router;
