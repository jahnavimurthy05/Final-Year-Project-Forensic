import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";

const DEFAULT_TRAIT_WEIGHTS = {
  sex: 3,
  gender: 3,
  hairColor: 3,
  eyeColor: 3,
  skinTone: 2,
  skinColor: 2,
  ageRange: 1,
  noseStructure: 1,
  noseShape: 1,
  lipStructure: 1,
  lipShape: 1,
  cheekboneStructure: 1,
  cheekboneShape: 1,
  eyebrowDistance: 1,
};

export function loadFaceGallery(galleryDir) {
  if (!galleryDir || !existsSync(galleryDir)) {
    return [];
  }

  const metadataPath = path.join(galleryDir, "metadata.json");
  if (!existsSync(metadataPath)) {
    return [];
  }

  const rawItems = JSON.parse(readFileSync(metadataPath, "utf-8"));
  const items = Array.isArray(rawItems) ? rawItems : rawItems.faces || [];

  return items
    .map((item) => {
      const file = item.file || item.image || item.filename;
      if (!file) {
        return null;
      }

      const imagePath = path.resolve(galleryDir, file);
      if (!imagePath.startsWith(path.resolve(galleryDir)) || !existsSync(imagePath)) {
        return null;
      }

      return {
        ...item,
        file,
        imagePath,
        traits: item.traits || item,
      };
    })
    .filter(Boolean);
}

export function selectGalleryFaces(gallery, requestedTraits, count = 4) {
  return gallery
    .map((face) => ({
      ...face,
      score: scoreTraits(face.traits || {}, requestedTraits || {}),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

export function encodeImageAsDataUrl(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  const image = readFileSync(imagePath);
  return `data:${mimeType};base64,${image.toString("base64")}`;
}

function scoreTraits(candidateTraits, requestedTraits) {
  let score = 0;

  for (const [key, requestedValue] of Object.entries(requestedTraits)) {
    const weight = DEFAULT_TRAIT_WEIGHTS[key] || 1;
    const candidateValue = candidateTraits[key];
    if (candidateValue === undefined || requestedValue === undefined || requestedValue === "") {
      continue;
    }

    if (normalize(candidateValue) === normalize(requestedValue)) {
      score += weight;
    }
  }

  return score;
}

function normalize(value) {
  return String(value).trim().toLowerCase().replace(/[_-]+/g, " ");
}
