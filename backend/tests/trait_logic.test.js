import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeTraits } from "../services/dna_service.js";
import { selectGalleryFaces } from "../services/face_gallery_service.js";

test("normalizeTraits maps known aliases to canonical keys", () => {
  const result = normalizeTraits({ eye_color: "Blue", gender: "Female", hairColor: "Black" });
  assert.equal(result.eyeColor, "blue");
  assert.equal(result.sex, "female");
  assert.equal(result.hairColor, "black");
});

test("normalizeTraits drops empty/null/undefined values", () => {
  const result = normalizeTraits({ eyeColor: "", hairColor: null, skinTone: undefined, faceShape: "oval" });
  assert.deepEqual(result, { faceShape: "oval" });
});

test("normalizeTraits trims and lowercases values", () => {
  const result = normalizeTraits({ eyeColor: "  Hazel  " });
  assert.equal(result.eyeColor, "hazel");
});

const SYNTHETIC_GALLERY = [
  { file: "a.png", traits: { eyeColor: "brown", hairColor: "black", skinTone: "medium" } },
  { file: "b.png", traits: { eyeColor: "hazel", hairColor: "blonde", skinTone: "fair" } },
  { file: "c.png", traits: { eyeColor: "brown", hairColor: "red", skinTone: "olive" } },
];

test("selectGalleryFaces ranks an exact multi-trait match highest", () => {
  const [top] = selectGalleryFaces(SYNTHETIC_GALLERY, { eyeColor: "brown", hairColor: "black" }, 1);
  assert.equal(top.file, "a.png");
});

test("selectGalleryFaces does not crash on a trait value absent from every labeled image", () => {
  // Documents the known gallery-coverage gap (see CLAUDE.md): no image here is labeled
  // eyeColor "blue", so this trait contributes 0 to every candidate's score instead of
  // erroring or excluding results — selection still returns `count` faces.
  const results = selectGalleryFaces(SYNTHETIC_GALLERY, { eyeColor: "blue" }, 2);
  assert.equal(results.length, 2);
});

test("selectGalleryFaces normalizes case/dash/underscore differences when matching", () => {
  const [top] = selectGalleryFaces(SYNTHETIC_GALLERY, { hairColor: "  BLACK " }, 1);
  assert.equal(top.file, "a.png");
});
