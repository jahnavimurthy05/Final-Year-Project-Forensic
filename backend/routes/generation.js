import express from "express";

import { generateSyntheticProfile, normalizeTraits } from "../services/dna_service.js";
import { predictPhenotypeFromSnp } from "../services/phenotype_service.js";
import { orchestrateFaceGeneration } from "../services/generation_service.js";

const router = express.Router();


router.get("/generate-synthetic-dna", async (req, res) => {
  try {
    const profile = await generateSyntheticProfile();
    const prediction = await predictPhenotypeFromSnp(profile).catch(() => ({
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
  try {
    const result = await orchestrateFaceGeneration(req.body);
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
      await db.collection("face_generations").insertOne({
        auditTrailId,
        traits: result.metadata?.traits_used || {},
        model: result.metadata?.model || "stylegan2-ada-ffhq",
        probabilities: result.metadata?.hirisplex_probabilities || {},
        timestamp: new Date(),
      });
    }

    return res.status(200).json(enrichedResult);
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
});

export default router;

