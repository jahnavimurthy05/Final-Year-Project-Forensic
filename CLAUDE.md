# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A forensic face-generation project: given a synthetic (or user-supplied) DNA/SNP profile, predict phenotype
traits (eye/hair/skin color) and render candidate face composites. Three parts:

- `backend/` — Node/Express API (ESM, `"type": "module"`) that also shells out to Python for ML inference.
- `backend/inference`, `backend/training`, `backend/ai_models` — Python (PyTorch) side: phenotype prediction,
  StyleGAN2-ADA generation, a local CGAN alternative, and CelebA training scripts.
- `frontend/` — Vite + React 19 SPA (Tailwind, React Router, Framer Motion).

There is no unified dev-server command — run backend and frontend separately (see below).

## Commands

### Backend (from `backend/`)
```powershell
npm run dev              # node app.js — starts Express API on PORT (default 5000)
npm run infer:cgan       # runs inference/generate_faces.py via the project .venv
npm run prepare:celeba   # training/prepare_celeba.py --extract
npm run train:cgan       # training/train_cgan.py
npm run train:cgan:smoke # 1-epoch smoke test with a tiny batch, no workers
```
Backend npm scripts invoke Python via `..\.venv\Scripts\python.exe` (a venv at the repo root, not inside
`backend/`). All ad-hoc Python inference calls from Node code (see `generation_service.js`,
`phenotype_service.js`) resolve the interpreter the same way, overridable with the `PYTHON_PATH` env var.

Python deps: `pip install -r backend/ml_requirements.txt` (torch, torchvision, tqdm, pillow). The root
`requirements.txt` just points at `-r backend/requirements.txt`, which does not currently exist — use
`backend/ml_requirements.txt` directly.

### Frontend (from `frontend/`)
```powershell
npm run dev       # vite dev server
npm run build     # vite build
npm run lint      # eslint .
npm run preview   # preview a production build
```

### CI
`.github/workflows/ci.yml` installs `backend/ml_requirements.txt` (if present) and runs `npm ci` at the repo
root, then a placeholder echo — there is no real test suite wired up yet.

### No test suite
There are currently no automated tests (backend, frontend, or Python). Don't assume a `test` script exists.

## Architecture

### Request flow: DNA → phenotype → face
1. **`GET /api/generate-synthetic-dna`** (`backend/routes/generation.js`) — `dna_service.js` asks Gemini
   (`GEMINI_API_KEY`) for a synthetic SNP profile + traits, falling back to local random generation if the
   key is missing, the call fails, or the response is incomplete. The result is then run through
   `predict_traits.py` (see below) to attach phenotype probabilities.
2. **`POST /api/generate-face`** (`backend/routes/generation.js`) — calls
   `generation_service.js#orchestrateFaceGeneration`, which:
   1. Predicts phenotype via `phenotype_service.js` → spawns `backend/inference/predict_traits.py`.
   2. Merges predicted traits with any user-supplied traits (user traits win — see `normalizeTraits`).
   3. **Opt-in engine — StyleGAN2** (only attempted if `ENABLE_STYLEGAN=true`; off by default): spawns
      `backend/inference/stylegan_generate.py` (StyleGAN2-ADA FFHQ, W+ latent editing via precomputed
      direction vectors in `checkpoints/latent_directions/`). Requires a cloned `stylegan2-ada-pytorch` repo
      and the FFHQ `.pkl` under `backend/checkpoints/` — neither is committed, and CPU-only inference (no
      CUDA GPU) takes multiple minutes per image, which is why this is opt-in rather than the default —
      confirmed by direct testing: 4 images took 10+ minutes on a CPU-only machine. `STYLEGAN_IMAGE_COUNT`
      (default 1) controls how many images it generates when enabled.
   4. **Default path**: `face_gallery_service.js` matches a pre-rendered Kaggle-generated gallery
      (`backend/generated_faces/kaggle/`, see `kaggle/README.md` for how to populate it) by weighted trait
      similarity (`selectGalleryFaces`/`scoreTraits`). This is genuine StyleGAN2-ADA FFHQ output (confirmed,
      see below), just pre-rendered instead of generated live — fast (a few seconds) and requires no setup,
      so it's what actually runs unless `ENABLE_STYLEGAN=true` and the checkpoint/repo are present.
   5. Either path's output images are post-processed by spawning `backend/inference/recolor_iris.py`
      (iris recoloring + hair/skin tone adaptation via numpy/PIL). This uses real MediaPipe Face Landmarker
      detection (requires `backend/checkpoints/face_landmarker.task`, downloaded separately — see below) to
      locate the actual iris/face position per image; only when no face is detected does it fall back to a
      fixed FFHQ-aligned percentage guess. `metadata.detector` in its output (`mediapipe-face-landmarker` vs
      `fixed-coordinate-fallback`) tells you which one ran for a given image. This matters because the
      Kaggle-gallery fallback images are NOT StyleGAN2-aligned composites — see the note on that gallery's
      provenance below.
   6. Response is enriched with an `auditTrailId` and forensic disclaimer text, then optionally logged to
      MongoDB (`face_generations` collection) if a DB is configured.
   - `backend/ai_models/cgan.py` + `backend/inference/generate_faces.py` (a local CelebA-trained CGAN) is a
     third, currently-unwired code path (`runLocalCganInference` in `generation_service.js` is defined but
     not called) — the current priority order is StyleGAN2 (opt-in) → Kaggle gallery (default) only.

### Trait normalization is the thing to get right
Trait keys/values arrive under many aliases across the JS/Python boundary (`hairColor` vs `hair_color`,
`cheekbone` vs `cheekboneShape` vs `cheekboneStructure`, etc.). Both sides carry an alias map:
`normalizeTraits` in `backend/services/dna_service.js` (JS) and `TRAIT_KEYS` in
`backend/inference/predict_traits.py` (Python). When adding a new trait, update both, plus
`DEFAULT_TRAIT_WEIGHTS` in `face_gallery_service.js` if it should influence gallery matching.

### HIrisPlex-S phenotype prediction has two tiers
`backend/inference/predict_traits.py` looks for `backend/checkpoints/hirisplex_s_coefficients.json`
(validated Walsh et al. 2017 beta coefficients, not committed):
- **Tier 1** (file present, not a `_status: "TEMPLATE..."` placeholder): real multinomial logistic
  regression over SNP dosages (`_run_hirisplex_mlr`).
- **Tier 2** (file absent/placeholder): approximate weighted rule-accumulation over a handful of hardcoded
  SNP/allele → probability tables (`EYE_RULES`/`HAIR_RULES`/`SKIN_RULES`).

Both tiers return the same `{status, traits, probabilities, metadata}` shape, so callers don't need to know
which tier ran — but `metadata.model`/`metadata.warning` indicate which one did.

### The Kaggle-gallery fallback has one real, known gap — check before assuming trait matching works
`backend/generated_faces/kaggle/metadata.json` (65 images) is the fallback engine's entire dataset, used
whenever the real StyleGAN2 primary path (repo + FFHQ checkpoint under `backend/checkpoints/`) isn't set up.
- **Label coverage is incomplete**: no image is labeled `eyeColor: blue`/`green` or `skinTone: dark`, even
  though those are valid options in the frontend's dropdowns. `scoreTraits` in `face_gallery_service.js`
  gives 0 points for a trait with no matching label, so picking those values has **zero effect** on which
  images get selected — it silently no-ops rather than erroring. If you touch gallery matching or the
  dropdown options, check this file's actual label vocabulary first.
- **The images ARE genuine StyleGAN2-ADA FFHQ output** — confirmed by regenerating `seed: 1` with the real
  FFHQ checkpoint and diffing pixels against `face_000001.png`: 99.98% identical (mean diff 0.02/255, only
  PNG re-encoding noise). (An earlier version of this note wrongly claimed these were real photographs based
  on visual inspection alone — FFHQ-trained StyleGAN2 is simply extremely photorealistic; that assumption was
  wrong and was corrected once actually tested. Don't assert provenance/authenticity claims about generated
  imagery from visual inspection alone — verify with a reproducible check like this one.)

### Node ⇄ Python boundary
All ML work is invoked from Express route handlers via `child_process.spawn`, passing JSON as a CLI arg
(`--traits-json`, `--profile-json`) or over stdin (`recolor_iris.py`), and parsing a single JSON line from
stdout. There's no persistent Python process/server — every request pays interpreter startup cost. When a
Python script isn't configured/available, the calling service resolves to a `status: "skipped"`/fallback
path rather than throwing, by design — check `configured()`/exit-code handling before assuming a script
failure should propagate as a 500.

### Request cancellation — spawn() is wired to an AbortSignal, and the wiring is subtle
`GET /api/generate-synthetic-dna` and `POST /api/generate-face` each create an `AbortController` and pass
`signal` down through `orchestrateFaceGeneration`/`predictPhenotypeFromSnp` into every `spawn()` call
(`runStyleganInference`, `runIrisRecoloring`, `predictPhenotypeFromSnp`). This exists because Express does
**not** cancel a child process on its own when a client disconnects/times out — confirmed directly: a timed-
out StyleGAN2 request left its Python process running to completion, burning CPU for minutes with nobody
listening, and repeated attempts piled up multiple such orphans competing for the same CPU.

Two non-obvious pitfalls if you touch this:
- **Must be `res.on("close", ...)`, not `req.on("close", ...)`.** The request stream's `close` fires once
  the incoming request body has been fully read — which happens almost immediately for a small JSON POST,
  long before a response is sent. Using it to trigger `controller.abort()` aborts every request instantly,
  not just abandoned ones (this actually happened and had to be reverted). `res` only closes early like that
  on a genuine client disconnect; guard with `if (!res.writableEnded)` so a normal, already-finished response
  doesn't get treated as an abort (harmless either way, since nothing is in-flight by then, but the guard
  keeps intent clear).
- **An aborted child's stdin needs its own `"error"` listener.** `runIrisRecoloring` writes the payload to
  the child's stdin; if the process is killed mid-write (via the abort), the stdin stream itself emits an
  `"error"` (EPIPE/EOF) that, without a listener, is an *uncaught* exception and crashes the entire Node
  process — not just the request. This also actually happened. `child.stdin.on("error", () => {})` is
  required (the `child.on("error"/"close")` handlers already settle the promise; this listener only exists
  to prevent the crash).

### Auth
`backend/services/password_service.js` implements Werkzeug-compatible `scrypt:`/`pbkdf2:` hash parsing
(hashes are `method$salt$hex`) — this exists so credentials created by a prior Python/Flask/Werkzeug backend
still validate. New hashes are always written as `scrypt:...`. JWT uses `JWT_SECRET` (falls back to a
hardcoded dev secret — expect this to be overridden via `.env` in real deployments).

### Data persistence is optional/best-effort
`app.locals.db` is a MongoDB handle set up unconditionally in `app.js` via `client.db()`, which returns a
truthy `Db` object without ever actually connecting — so `if (db)` in the routes is always true and doesn't
by itself indicate a live connection; the real connection attempt happens on the first `insertOne()` call.
In `generation.js`, those writes are wrapped in their own try/catch (logging a `console.warn` on failure)
specifically so that a missing/unreachable MongoDB degrades to skipped audit logging instead of discarding
an already-successful DNA/face generation response — this was a real bug (confirmed by running the app
without MongoDB: both routes returned 500 with the result thrown away) until it was fixed. `auth.js` and
`dashboard.js` are NOT wrapped this way, because for those routes the DB genuinely is the source of truth
(user records, aggregate stats) — they're expected to fail if Mongo is down. If you touch `generation.js`,
keep new DB writes inside their own try/catch for the same reason.

### Frontend
Single `DnaContext` (`frontend/src/context/DnaContext.jsx`) holds the in-progress DNA profile/traits across
pages (`DnaInputPage` → `GenerationPage`). `frontend/src/services/api.js` hardcodes
`http://localhost:5000/api` as the API base — no env-based config currently.

## Environment variables
- `PORT` — backend port (default 5000)
- `MONGO_URI` — Mongo connection string (default `mongodb://localhost:27017/forensic_db`)
- `JWT_SECRET` — JWT signing secret
- `GEMINI_API_KEY` — enables Gemini-based synthetic DNA generation (falls back to random if unset)
- `PYTHON_PATH` — override the Python interpreter used for all spawned ML scripts
- `STYLEGAN_FFHQ_PICKLE`, `STYLEGAN_REPO_DIR`, `LATENT_DIRECTIONS_DIR`, `KAGGLE_FACE_GALLERY_DIR` — override
  default paths under `backend/checkpoints/` and `backend/generated_faces/kaggle/`
- `FACE_LANDMARKER_MODEL` — override the path to the MediaPipe Face Landmarker model bundle used by
  `recolor_iris.py` (default `backend/checkpoints/face_landmarker.task`, not committed — download from
  `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task`)
- `ENABLE_STYLEGAN` — set to `true` to attempt live StyleGAN2 generation before falling back to the Kaggle
  gallery (default: unset/off, since CPU-only inference is multi-minutes-per-image — see above)
- `STYLEGAN_IMAGE_COUNT` — how many images to generate when `ENABLE_STYLEGAN=true` (default `1`)

## Contributing conventions (from CONTRIBUTING.md)
- Feature branches: `feature/your-short-desc`, PRs target `main`, at least one approving review required.
- Commit messages prefixed `feat:`, `fix:`, `chore:`, etc.
