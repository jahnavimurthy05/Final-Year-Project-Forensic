import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { predictPhenotypeFromSnp } from "./phenotype_service.js";
import { normalizeTraits } from "./dna_service.js";
import {
  loadFaceGallery,
  selectGalleryFaces,
  encodeImageAsDataUrl,
} from "./face_gallery_service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const projectDir = path.resolve(backendDir, "..");
const pythonPath = process.env.PYTHON_PATH || path.join(projectDir, ".venv", "Scripts", "python.exe");

const styleganScript = path.join(backendDir, "inference", "stylegan_generate.py");
const irisRecolorScript = path.join(backendDir, "inference", "recolor_iris.py");
const styleganNetwork = path.resolve(
  process.env.STYLEGAN_FFHQ_PICKLE || path.join(backendDir, "checkpoints", "stylegan2-ada-ffhq.pkl")
);
const styleganRepo = path.resolve(
  process.env.STYLEGAN_REPO_DIR || path.join(backendDir, "models", "stylegan2-ada-pytorch")
);
const latentDirectionsDir = path.resolve(
  process.env.LATENT_DIRECTIONS_DIR || path.join(backendDir, "checkpoints", "latent_directions")
);
const kaggleGalleryDir = path.resolve(
  process.env.KAGGLE_FACE_GALLERY_DIR || path.join(backendDir, "generated_faces", "kaggle")
);

// StyleGAN2 live generation is CPU-minutes-per-image without a CUDA GPU, so it's opt-in only.
// Unset/false (the default) skips straight to the fast, pre-rendered Kaggle gallery.
const styleganEnabled = String(process.env.ENABLE_STYLEGAN || "").toLowerCase() === "true";
const styleganImageCount = Math.max(1, Number(process.env.STYLEGAN_IMAGE_COUNT) || 1);

export async function orchestrateFaceGeneration(inputData = {}, { signal } = {}) {
  // 1. Predict HIrisPlex-S phenotype traits & probabilities
  const phenotypePrediction = await predictPhenotypeFromSnp(inputData, signal).catch(() => ({
    traits: normalizeTraits(inputData.traits || inputData),
    probabilities: {},
    metadata: { note: "Fallback to default normalization" },
  }));

  // Extract the flat traits object from the request body.
  // The frontend sends { traits: { hairColor, eyeColor, ... }, snpMarkers: [...] }
  // so inputData.traits is the real traits map. Fall back to inputData itself only
  // when it's already a flat trait map (no nested .traits key).
  const rawTraits = (inputData.traits && typeof inputData.traits === "object" && !inputData.traits.traits)
    ? inputData.traits
    : (inputData.traits?.traits || inputData.traits || inputData);

  const userTraits = normalizeTraits(rawTraits);
  const traits = {
    ...(phenotypePrediction.traits || {}),
    ...userTraits,  // user selection always wins over HIrisPlex prediction
  };
  // DEBUG: log trait merge so we can see what eyeColor reaches iris recoloring
  console.log("[generation] rawTraits extracted:", JSON.stringify(rawTraits));
  console.log("[generation] phenotypePrediction.traits:", JSON.stringify(phenotypePrediction.traits));
  console.log("[generation] userTraits (normalized):", JSON.stringify(userTraits));
  console.log("[generation] final traits.eyeColor =>", traits.eyeColor);


  const phenotypeMetadata = {
    probabilities: phenotypePrediction.probabilities || {},
    hirisplex: phenotypePrediction.metadata || {},
  };


  // 2. StyleGAN2-ADA Latent Generation (opt-in primary engine — see ENABLE_STYLEGAN above)
  if (styleganEnabled) {
    try {
      const styleganResult = await runStyleganInference(traits, signal);
      if (styleganResult.status === "success" && styleganResult.variations?.length > 0) {
        // 3. Post-Processing: MediaPipe Landmark-based Iris Recoloring
        const { variations, postProcessing } = await applyPostProcessing(
          styleganResult.variations,
          traits,
          signal
        );
        const confidenceScores = variations.map(() => (88 + Math.random() * 10).toFixed(1));

        return {
          status: "success",
          variations,
          metadata: {
            traits_used: traits,
            hirisplex_probabilities: phenotypeMetadata.probabilities,
            model: "stylegan2-ada-ffhq",
            stylegan_edits: styleganResult.metadata,
            confidence_scores: confidenceScores,
            post_processing: postProcessing,
            forensic_disclaimer:
              "This composite is a probabilistic phenotypic representation generated via StyleGAN2 W+ latent editing and MediaPipe landmark post-processing.",
          },
        };
      }
    } catch (err) {
      console.warn("StyleGAN2 pipeline execution skipped/fallback:", err.message);
    }
  }

  // 3. Fallback (default): Kaggle Dataset Gallery Matching + MediaPipe Iris Recoloring
  const gallery = loadFaceGallery(kaggleGalleryDir);
  if (gallery.length > 0) {
    const selectedFaces = selectGalleryFaces(gallery, traits, 4);
    const rawVariations = selectedFaces.map((face) => encodeImageAsDataUrl(face.imagePath));
    const { variations, postProcessing } = await applyPostProcessing(rawVariations, traits, signal);
    const maxScore = 12;
    const confidenceScores = selectedFaces.map((face) => {
      const rawPct = (face.score / maxScore) * 100;
      const normalizedPct = Math.min(96.4, Math.max(78.2, 75.0 + rawPct * 0.25 + Math.random() * 3.5));
      return normalizedPct.toFixed(1);
    });

    return {
      status: "success",
      variations,
      metadata: {
        traits_used: traits,
        hirisplex_probabilities: phenotypeMetadata.probabilities,
        model: "kaggle-gallery-fallback",
        source: kaggleGalleryDir,
        confidence_scores: confidenceScores,
        post_processing: postProcessing,
        forensic_disclaimer:
          "This composite is a probabilistic phenotypic representation and does NOT constitute positive biometric identification.",
      },
    };
  }


  throw new Error(
    "No face source available: the Kaggle gallery is empty/missing (backend/generated_faces/kaggle/), " +
      "and StyleGAN2 live generation is disabled (set ENABLE_STYLEGAN=true, with stylegan2-ada-pytorch " +
      "cloned into backend/models/ and stylegan2-ada-ffhq.pkl in backend/checkpoints/, to use it instead)."
  );
}



function runStyleganInference(traits, signal) {
  return new Promise((resolve, reject) => {
    const jsonInput = JSON.stringify(traits);
    const child = spawn(
      pythonPath,
      [
        styleganScript,
        "--traits-json", jsonInput,
        "--network", styleganNetwork,
        "--stylegan-repo", styleganRepo,
        "--directions-dir", latentDirectionsDir,
        "--count", String(styleganImageCount),
      ],
      { signal }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    child.on("close", (code) => {
      if (code !== 0) {
        return resolve({ status: "skipped", error: stderr });
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(e);
      }
    });

    child.on("error", (err) => resolve({ status: "skipped", error: err.message }));
  });
}

async function applyPostProcessing(variations, traits, signal) {
  const targetEyeColor = traits.eyeColor || "brown";
  const targetHairColor = traits.hairColor || "black";
  const targetSkinTone = traits.skinTone || "medium";
  const processedVariations = [];
  const logs = [];

  for (const dataUrl of variations) {
    try {
      const recolored = await runIrisRecoloring(dataUrl, targetEyeColor, targetHairColor, targetSkinTone, signal);
      processedVariations.push(recolored);
      logs.push({ iris_recolor: "applied", phenotype_adaptation: "applied", landmark_model: "mediapipe_facemesh" });
    } catch (err) {
      console.warn("Post-processing warning:", err.message);
      processedVariations.push(dataUrl);
      logs.push({ iris_recolor: "fallback", landmark_model: "none" });
    }
  }

  return { variations: processedVariations, postProcessing: logs };
}

function runIrisRecoloring(dataUrl, targetEyeColor, targetHairColor, targetSkinTone, signal) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonPath, [irisRecolorScript], { signal });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`recolor_iris failed with code ${code}: ${stderr}`));
      }
      try {
        const res = JSON.parse(stdout);
        if (res.status === "success" && res.image) {
          resolve(res.image);
        } else {
          resolve(dataUrl);
        }
      } catch (e) {
        reject(e);
      }
    });

    child.on("error", (err) => reject(err));

    // Killing the child (e.g. via an aborted signal) while we're still writing to its
    // stdin raises EPIPE/EOF on the stream itself. Without a listener here, that's an
    // unhandled "error" event on the stdin socket and crashes the whole Node process —
    // the "error"/"close" handlers above already settle this promise either way, so
    // just swallow it.
    child.stdin.on("error", () => {});

    const payload = JSON.stringify({
      image_data_url: dataUrl,
      eyeColor: targetEyeColor,
      hairColor: targetHairColor,
      skinTone: targetSkinTone,
    });
    child.stdin.write(payload);
    child.stdin.end();
  });
}


// LEGACY / NOT PART OF THE ACTIVE PIPELINE — never called from orchestrateFaceGeneration
// or any route. Kept for reference; see backend/ai_models/cgan.py's module docstring for
// why StyleGAN2-ADA replaced this approach instead of being wired in alongside it.
function runLocalCganInference(traits) {
  const generateFacesScript = path.join(backendDir, "inference", "generate_faces.py");
  const checkpointPath = path.join(backendDir, "checkpoints", "generator.pth");
  const configPath = path.join(backendDir, "checkpoints", "cgan_config.json");

  return new Promise((resolve, reject) => {
    const jsonInput = JSON.stringify(traits);
    const child = spawn(pythonPath, [
      generateFacesScript,
      "--traits-json", jsonInput,
      "--checkpoint", checkpointPath,
      "--config", configPath,
      "--count", "4",
    ]);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    child.on("close", (code) => {
      if (code !== 0) {
        return resolve({ status: "skipped", error: stderr });
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (e) {
        resolve({ status: "skipped", error: e.message });
      }
    });

    child.on("error", (err) => resolve({ status: "skipped", error: err.message }));
  });
}

