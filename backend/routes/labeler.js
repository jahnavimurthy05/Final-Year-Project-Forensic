/**
 * Image labeling tool routes
 * GET  /api/labeler/images  — returns all gallery images with current sex labels
 * POST /api/labeler/label   — updates a single image's sex label in metadata.json
 */
import express from "express";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const METADATA_PATH = path.join(__dirname, "../generated_faces/kaggle/metadata.json");
const GALLERY_DIR   = path.join(__dirname, "../generated_faces/kaggle");

function loadMetadata() {
  const raw = JSON.parse(readFileSync(METADATA_PATH, "utf8"));
  return Array.isArray(raw) ? raw : (raw.faces || []);
}

function saveMetadata(items) {
  writeFileSync(METADATA_PATH, JSON.stringify(items, null, 2));
}

// GET /api/labeler/images — returns [{file, sex, dataUrl}]
router.get("/images", (req, res) => {
  try {
    const items = loadMetadata();
    const result = items.map((item) => {
      const imgPath = path.join(GALLERY_DIR, item.file);
      let dataUrl = "";
      try {
        const buf = readFileSync(imgPath);
        dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
      } catch (_) {}
      return {
        file: item.file,
        sex: item.traits?.sex || "unknown",
        dataUrl,
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/labeler/label  body: { file, sex }
router.post("/label", (req, res) => {
  try {
    const { file, sex } = req.body;
    if (!file || !["male", "female"].includes(sex)) {
      return res.status(400).json({ error: "Invalid file or sex value" });
    }
    const items = loadMetadata();
    const item = items.find((i) => i.file === file);
    if (!item) return res.status(404).json({ error: "File not found in metadata" });
    item.traits = item.traits || {};
    item.traits.sex = sex;
    saveMetadata(items);
    res.json({ ok: true, file, sex });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/labeler/export — download updated metadata.json
router.get("/export", (req, res) => {
  res.download(METADATA_PATH, "metadata.json");
});

export default router;
