import express from "express";

import { generateSyntheticProfile, normalizeTraits } from "../services/dna_service.js";
import { predictPhenotypeFromSnp } from "../services/phenotype_service.js";
import { orchestrateFaceGeneration } from "../services/generation_service.js";

const router = express.Router();


router.get("/generate-synthetic-dna", async (req, res) => {
  // If the client disconnects/times out mid-request, abort() kills any in-flight
  // Python subprocess instead of leaving it to run to completion unattended.
  // NOTE: this must be res.on("close"), not req.on("close") — the request stream
  // closes as soon as it's fully read (near-instant), which is not the same as the
  // client going away. res only closes early like that on a genuine disconnect.
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const profile = await generateSyntheticProfile();
    const prediction = await predictPhenotypeFromSnp(profile, controller.signal).catch(() => ({
      traits: normalizeTraits(profile.traits || {}),
      probabilities: {},
      metadata: {},
    }));

    const enrichedProfile = {
      ...profile,
      traits: prediction.traits || normalizeTraits(profile.traits || {}),
      probabilities: prediction.probabilities,
      phenotypeMetadata: {
        ...prediction.metadata,
        engine: prediction.metadata?.engine || "hirisplex-s-mlr-validated",
        timestamp: new Date().toISOString(),
      },
    };
    const db = req.app.locals.db;

    if (db) {
      try {
        await db.collection("synthetic_dna").insertOne({
          snpMarkers: enrichedProfile.snpMarkers || [],
          timestamp: new Date(),
        });

        await db.collection("phenotype_mappings").insertOne({
          traits: enrichedProfile.traits || {},
          probabilities: enrichedProfile.probabilities || {},
          timestamp: new Date(),
        });
      } catch (dbError) {
        console.warn("generate-synthetic-dna: DB logging skipped:", dbError.message);
      }
    }

    return res.status(200).json(enrichedProfile);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/generate-face", async (req, res) => {
  // If the client disconnects/times out mid-request, abort() kills any in-flight
  // Python subprocess (StyleGAN2 generation, iris recoloring) instead of leaving it
  // to burn CPU to completion unattended.
  // NOTE: this must be res.on("close"), not req.on("close") — the request stream
  // closes as soon as it's fully read (near-instant), which is not the same as the
  // client going away. res only closes early like that on a genuine disconnect.
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const result = await orchestrateFaceGeneration(req.body, { signal: controller.signal });
    const auditTrailId = `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const enrichedResult = {
      ...result,
      auditTrailId,
      timestamp: new Date().toISOString(),
      metadata: {
        ...result.metadata,
        auditTrailId,
        landmark_detector: "MediaPipe FaceMesh (indices 468, 473)",
        hirisplex_engine: "Multinomial Logistic Regression (Walsh et al. 2017)",
      },
    };

    const db = req.app.locals.db;
    if (db && result.variations) {
      try {
        await db.collection("face_generations").insertOne({
          auditTrailId,
          traits: result.metadata?.traits_used || {},
          model: result.metadata?.model || "stylegan2-ada-ffhq",
          probabilities: result.metadata?.hirisplex_probabilities || {},
          timestamp: new Date(),
        });
      } catch (dbError) {
        console.warn("generate-face: DB logging skipped:", dbError.message);
      }
    }

    return res.status(200).json(enrichedResult);
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
});

export default router;

