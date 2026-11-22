import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";

const DEFAULT_TRAIT_WEIGHTS = {
  sex: 10,      // primary filter — always dominates other traits
  gender: 10,
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

const galleryCache = new Map();

export function loadFaceGallery(galleryDir) {
  if (!galleryDir || !existsSync(galleryDir)) {
    return [];
  }

  const resolvedDir = path.resolve(galleryDir);
  if (galleryCache.has(resolvedDir)) {
    return galleryCache.get(resolvedDir);
  }

  const metadataPath = path.join(resolvedDir, "metadata.json");
  if (!existsSync(metadataPath)) {
    return [];
  }

  const rawItems = JSON.parse(readFileSync(metadataPath, "utf-8"));
  const items = Array.isArray(rawItems) ? rawItems : rawItems.faces || [];

  const result = items
    .map((item) => {
      const file = item.file || item.image || item.filename;
      if (!file) {
        return null;
      }

      const imagePath = path.resolve(resolvedDir, file);
      if (!imagePath.startsWith(resolvedDir) || !existsSync(imagePath)) {
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

  galleryCache.set(resolvedDir, result);
  return result;
}

export function selectGalleryFaces(gallery, requestedTraits, count = 4) {
  const requestedSex = (requestedTraits?.sex || '').trim().toLowerCase();

  // Hard pre-filter by sex — sex must match exactly before any scoring.
  let candidates = gallery;
  if (requestedSex) {
    const bySex = gallery.filter(
      (f) => (f.traits?.sex || '').trim().toLowerCase() === requestedSex
    );
    if (bySex.length >= count) {
      candidates = bySex;
    }
  }

  const traitsWithoutSex = { ...requestedTraits };
  delete traitsWithoutSex.sex;

  const scored = candidates.map((face) => {
    const score = scoreTraits(face.traits || {}, traitsWithoutSex || {});
    return { ...face, score };
  });

  scored.sort((a, b) => b.score - a.score);

  function pickRandom(arr) {
    if (!arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const highMatches = scored.slice(0, Math.ceil(scored.length * 0.4));
  const midMatches  = scored.slice(Math.ceil(scored.length * 0.4), Math.ceil(scored.length * 0.7));
  const lowMatches  = scored.slice(Math.ceil(scored.length * 0.7));

  const picks = [];
  for (let i = 0; i < count; i++) {
    if (i < 2) picks.push(pickRandom(highMatches));
    else if (i === 2) picks.push(pickRandom(midMatches.length ? midMatches : highMatches));
    else picks.push(pickRandom(lowMatches.length ? lowMatches : midMatches.length ? midMatches : highMatches));
  }

  return picks.filter(Boolean).slice(0, count);
}

// selectGalleryFacesTiered: picks exactly 3 faces from 3 score tiers
// Face 0 → top 40% (high)  Face 1 → top 40% (high, different pick)  Face 2 → 40–70% (mid)
export function selectGalleryFacesTiered(gallery, requestedTraits, count = 3) {
  const requestedSex = (requestedTraits?.sex || '').trim().toLowerCase();

  let candidates = gallery;
  if (requestedSex) {
    const bySex = gallery.filter(
      (f) => (f.traits?.sex || '').trim().toLowerCase() === requestedSex
    );
    if (bySex.length >= count) {
      candidates = bySex;
    }
  }

  const traitsWithoutSex = { ...requestedTraits };
  delete traitsWithoutSex.sex;

  const scored = candidates.map((face) => {
    const score = scoreTraits(face.traits || {}, traitsWithoutSex || {});
    return { ...face, score };
  });

  scored.sort((a, b) => b.score - a.score);

  function pickRandom(arr, exclude = []) {
    const pool = arr.filter(f => !exclude.includes(f));
    if (!pool.length) return arr[Math.floor(Math.random() * arr.length)] || null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const highMatches = scored.slice(0, Math.ceil(scored.length * 0.4));
  const midMatches  = scored.slice(Math.ceil(scored.length * 0.4), Math.ceil(scored.length * 0.7));

  const pick0 = pickRandom(highMatches);
  const pick1 = pickRandom(highMatches, [pick0]);
  const pick2 = pickRandom(midMatches.length ? midMatches : highMatches, [pick0, pick1]);

  return [pick0, pick1, pick2].filter(Boolean).slice(0, count);
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
