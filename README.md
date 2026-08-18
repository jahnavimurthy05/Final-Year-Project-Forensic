# Forensic Face Generation Project

A forensic composite-face generation system: a DNA/SNP profile (synthetic or user-entered) is run through a
phenotype predictor (HIrisPlex-S) and the resulting traits (eye color, hair color, skin tone, etc.) are used
to render candidate face images.

Stack: **Node/Express** API + **Python/PyTorch** ML inference (invoked as subprocesses) + **React/Vite**
frontend.

> For AI-agent-oriented architecture notes (which file does what, cross-cutting gotchas), see
> [`CLAUDE.md`](CLAUDE.md). This README is the human setup/run guide.

---

## 1. Prerequisites

| Tool | Version used | Notes |
|---|---|---|
| Node.js | v24.x (repo tested) | needed for both `backend/` and `frontend/` |
| Python | 3.10–3.11 recommended | see note below — StyleGAN2-ADA repo pins to older `torch`; 3.14 may not have working `torch` wheels yet |
| MongoDB | optional | app runs fine without it; only audit/history logging is skipped |
| Git | — | for cloning the StyleGAN2-ADA repo |

The project expects a **Python virtual environment at the repo root**, named `.venv`
(`Final-Year-Project-Forensic/.venv`) — not inside `backend/`. All npm scripts and all
`child_process.spawn` calls from the Node backend resolve the interpreter as
`../.venv/Scripts/python.exe` relative to `backend/` (Windows path). Override with the `PYTHON_PATH` env
var if you keep the venv somewhere else.

```powershell
# from the repo root
python -m venv .venv
.venv\Scripts\pip install -r backend\ml_requirements.txt
```

`backend/ml_requirements.txt` currently lists: `torch`, `torchvision`, `tqdm`, `pillow`, `mediapipe`.
`mediapipe` powers real per-image iris/face detection in `recolor_iris.py` (see §4) and also needs a model
file — `backend/checkpoints/face_landmarker.task` — which is **not installed by pip**, download it separately:
```powershell
mkdir backend\checkpoints -Force
curl.exe -L -o backend\checkpoints\face_landmarker.task https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task
```
Without that file, `recolor_iris.py` still works, it just falls back to a fixed-percentage guess for where
the eyes/face are (only accurate on perfectly centered, FFHQ-aligned images — see the known-issues note
in §4). If you use the StyleGAN2-ADA path you'll also need whatever `stylegan2-ada-pytorch` itself requires
(numpy, click, requests, pyspng, ninja — see that repo's own `requirements.txt` once cloned).

---

## 2. Install & run

### Backend
```powershell
cd backend
npm install
npm run dev          # node app.js — API on http://localhost:5000
```

### Frontend
```powershell
cd frontend
npm install
npm run dev           # vite dev server, default http://localhost:5173
```

Run both at once (two terminals). The frontend calls the API at a **hardcoded**
`http://localhost:5000/api` (`frontend/src/services/api.js`) — there's no `.env`-based override yet, so if
you change the backend port you must edit that file too.

### Backend environment variables (`backend/.env`, not committed)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/forensic_db
JWT_SECRET=some-long-random-string
GEMINI_API_KEY=...            # optional — enables Gemini-generated synthetic DNA profiles
PYTHON_PATH=...               # optional — override the interpreter used for all Python subprocess calls
STYLEGAN_FFHQ_PICKLE=...      # optional — override default checkpoint path (see §3)
STYLEGAN_REPO_DIR=...         # optional — override default StyleGAN2-ADA repo path
LATENT_DIRECTIONS_DIR=...     # optional — override default latent-direction vectors path
KAGGLE_FACE_GALLERY_DIR=...   # optional — override default Kaggle gallery path
ENABLE_STYLEGAN=false         # optional — set "true" to attempt live StyleGAN2 generation (see §4/§5).
                               # Leave unset/false unless this machine has an NVIDIA GPU — CPU-only
                               # inference takes multiple minutes per image (confirmed: 4 images took
                               # 10+ minutes on a CPU-only box). Default (false) uses the fast,
                               # pre-rendered Kaggle gallery, which is genuine StyleGAN2 output anyway.
STYLEGAN_IMAGE_COUNT=1         # optional — how many images to generate when ENABLE_STYLEGAN=true
```
If `MONGO_URI` isn't reachable, `/api/generate-synthetic-dna` and `/api/generate-face` still return their
real results — DB writes there are wrapped in their own try/catch and just log a `console.warn` on failure
instead of failing the request (fixed 2026-08-18, see progress log). `/api/auth/*` and
`/api/dashboard/stats` genuinely need MongoDB and will error without it — that's expected, not a bug.

**Known quirk**: the *first* request after startup that touches the DB (without Mongo running) takes ~30s
to respond, because the Node MongoDB driver retries for its default `serverSelectionTimeoutMS` before giving
up. Subsequent requests fail/skip instantly ("Topology is closed"). This isn't a hang — it's the driver
timing out. Either start MongoDB, or just expect that one slow first call.

---

## 3. Where model/checkpoint files go (read this before moving anything!)

**None of these are committed to git** (`.gitignore` excludes `backend/checkpoints/`, `backend/models/`,
`backend/data/`). They are resolved by fixed relative paths (overridable via env vars above), so if you move
a model file in VS Code / Explorer, the app will silently fall through to the next fallback tier instead of
erroring loudly — put things back in these exact locations:

```text
Final-Year-Project-Forensic/
├─ .venv/                                  ← Python venv (repo root, NOT inside backend/)
└─ backend/
   ├─ checkpoints/
   │  ├─ hirisplex_s_coefficients.json     ← HIrisPlex-S MLR beta coefficients (Walsh et al. 2017)
   │  │                                      absent/placeholder → falls back to rule-based approximation
   │  ├─ stylegan2-ada-ffhq.pkl            ← StyleGAN2-ADA FFHQ generator weights
   │  ├─ latent_directions/                ← *.npy direction vectors, e.g. gender.npy, age.npy,
   │  │                                       hair_black.npy, hair_blonde.npy, skin_fair.npy, ...
   │  ├─ generator.pth                      ← local CGAN generator (optional, currently unused — see §5)
   │  ├─ discriminator.pth                  ← local CGAN discriminator (training artifact)
   │  ├─ cgan_config.json                   ← local CGAN config (training artifact)
   │  └─ face_landmarker.task               ← MediaPipe Face Landmarker model (download command in §1)
   ├─ models/
   │  └─ stylegan2-ada-pytorch/             ← git clone of NVlabs/stylegan2-ada-pytorch (needs legacy.py, dnnlib/)
   ├─ data/raw/celeba/
   │  ├─ img_align_celeba/*.jpg             ← CelebA images (for training only)
   │  └─ list_attr_celeba.txt
   └─ generated_faces/kaggle/
      ├─ metadata.json                      ← array of {file, traits} — already populated, 65 sample faces committed
      └─ face_000001.png ...                ← pre-rendered fallback gallery images
```

**What happens if a piece is missing** — the app degrades gracefully, in this order (see §4):
1. No `hirisplex_s_coefficients.json` (or it's a `_status: "TEMPLATE"` placeholder) → phenotype prediction
   uses the Tier-2 rule-based approximation instead of the validated regression model. Still works, just
   less accurate; `metadata.model` in the API response tells you which tier ran.
2. `ENABLE_STYLEGAN` isn't `true` (the default), or it is but the `stylegan2-ada-pytorch` repo/checkpoint
   aren't present → face generation skips StyleGAN2 entirely and uses the Kaggle gallery
   (`backend/generated_faces/kaggle/`, already populated in this repo) — this is the normal, expected path.
3. If the Kaggle gallery is also empty → `/api/generate-face` throws a 500 with a clear error message
   telling you what to set up.

So: **the app works out of the box today via the Kaggle-gallery fallback** — and that's not a degraded mode,
it's the intended default, since the gallery is confirmed-genuine StyleGAN2 output already (§4) and doesn't
have StyleGAN2's CPU-speed problem. `hirisplex_s_coefficients.json` and live StyleGAN2 generation are the
two pieces that are genuinely optional quality/capability upgrades.

---

## 4. How the pipeline works (end to end)

1. **`GET /api/generate-synthetic-dna`**
   `backend/services/dna_service.js` asks Gemini (if `GEMINI_API_KEY` set) for a synthetic SNP profile +
   traits; on any failure/missing key it generates one locally at random instead. The profile is then run
   through the phenotype predictor to attach probabilities before being returned.

2. **Phenotype prediction** (`backend/inference/predict_traits.py`, spawned from
   `backend/services/phenotype_service.js`)
   - **Tier 1** — if `backend/checkpoints/hirisplex_s_coefficients.json` exists and isn't a placeholder:
     real multinomial logistic regression over SNP allele dosages (Walsh et al. 2017 HIrisPlex-S model).
   - **Tier 2** — otherwise: an approximate rule-based scoring table baked into the script.
   - Output shape is identical either way: `{ status, traits, probabilities, metadata }`.

3. **`POST /api/generate-face`** (`backend/services/generation_service.js#orchestrateFaceGeneration`)
   1. Re-runs phenotype prediction, merges predicted traits with any traits the user explicitly supplied
      (user input wins).
   2. **Opt-in engine — StyleGAN2-ADA** (only if `ENABLE_STYLEGAN=true`): spawns
      `backend/inference/stylegan_generate.py`, which samples random latents, maps them to `W+` space, nudges
      them along the requested trait's precomputed direction vectors (`latent_directions/*.npy`), and
      synthesizes images. **This is slow without a GPU** — confirmed 10+ minutes for 4 images on a CPU-only
      machine — which is why it's off by default rather than the primary path.
   3. **Default engine — Kaggle gallery**: `backend/services/face_gallery_service.js` scores every image in
      `backend/generated_faces/kaggle/metadata.json` against the requested traits (weighted match count) and
      returns the top 4. Fast (a few seconds), and confirmed to be genuine StyleGAN2-ADA FFHQ output already
      (see the correction note below) — not a lesser substitute, just pre-rendered instead of live.
   4. **Post-processing** (always runs, either engine): spawns `backend/inference/recolor_iris.py`, which
      recolors the iris region and adjusts hair/skin tone toward the target phenotype. It runs real MediaPipe
      Face Landmarker detection per image to find the actual iris/face position (requires
      `face_landmarker.task`, see §1) and only falls back to a fixed FFHQ-aligned percentage guess if no face
      is detected. `metadata.post_processing[i].landmark_model` in the response tells you which one ran for
      each image.
   5. Response includes a generated `auditTrailId`, confidence scores, and a forensic disclaimer; optionally
      logged to MongoDB (`face_generations` collection).
   6. If the client disconnects or times out mid-request, the server aborts the in-flight Python subprocess
      instead of letting it run to completion unattended — see the request-cancellation note in `CLAUDE.md`
      if you're touching this code; the two ways to get this wrong (`req.close` vs `res.close`, and an
      unhandled `stdin` error on an aborted child) both actually happened during development and are
      documented there so they don't get re-introduced.

4. **Frontend flow**: `LandingPage` → `DnaInputPage` (fills `DnaContext`) → `GenerationPage` (calls
   `/api/generate-face`) → results rendered with the forensic disclaimer and `EthicalBanner`.

### Trait name normalization
Trait keys arrive under multiple aliases across the JS/Python boundary (`hairColor` vs `hair_color`,
`cheekbone` vs `cheekboneShape` vs `cheekboneStructure`, etc.). Both sides keep an alias map — `normalizeTraits`
in `dna_service.js` and `TRAIT_KEYS` in `predict_traits.py`. If you add a new trait, update both (and
`DEFAULT_TRAIT_WEIGHTS` in `face_gallery_service.js` if it should affect gallery matching).

### Known issue: the Kaggle gallery can't represent every dropdown option
`backend/generated_faces/kaggle/metadata.json` (the fallback dataset used whenever StyleGAN2 isn't
configured — i.e. today, out of the box) only ever labels `eyeColor` as `brown`/`hazel` and `skinTone` as
`fair`/`medium`/`olive`/`brown`. There is no image labeled `blue`/`green` eyes or `dark` skin, even though
those are valid frontend dropdown choices. Since image *selection* only scores literal label matches,
picking those values has **no effect** on which images are chosen — it silently no-ops rather than erroring.
(The iris/hair/skin *recoloring* pass still applies your requested color on top of whichever image gets
picked, so the output still visually reflects your choice — it just won't influence which underlying face is
used.) Fixing this needs either broader/relabeled gallery images or the real StyleGAN2 path set up (§5).

**Correction (2026-08-18)**: an earlier version of this note claimed the gallery images looked like real
photographs rather than StyleGAN2 output. That was wrong — confirmed by regenerating `seed: 1` with the real
FFHQ checkpoint once it was set up (§5) and diffing it against `face_000001.png`: 99.98% pixel-identical
(mean diff 0.02/255, only PNG re-encoding noise). The gallery images are genuine StyleGAN2-ADA FFHQ output,
exactly as labeled. FFHQ-trained StyleGAN2 is simply extremely photorealistic — that's the same model family
behind sites like "this person does not exist" — which is what led to the mistaken visual assessment.

---

## 5. Training / offline workflows

### Local CGAN on CelebA (optional, currently not wired into `/api/generate-face`)
See [`backend/training/README.md`](backend/training/README.md) for full dataset-placement instructions.
```powershell
cd backend
..\.venv\Scripts\python.exe training\prepare_celeba.py --extract
..\.venv\Scripts\python.exe training\train_cgan.py --epochs 20 --batch-size 64
# quick smoke test:
..\.venv\Scripts\python.exe training\train_cgan.py --epochs 1 --batch-size 8 --num-workers 0 --max-batches 25
..\.venv\Scripts\python.exe inference\generate_faces.py --traits-json "{\"sex\":\"male\",\"hairColor\":\"black\"}"
```
Outputs go to `backend/checkpoints/{generator,discriminator}.pth`, `cgan_config.json`,
`backend/training/samples/`. `runLocalCganInference` in `generation_service.js` is implemented but not
currently called by the API route — StyleGAN2 → Kaggle gallery is the live priority order.

### Kaggle StyleGAN2 gallery (the fallback data already checked into this repo)
See [`kaggle/README.md`](kaggle/README.md). Summary: run `kaggle/generate_stylegan_gallery.py` on a Kaggle
GPU notebook, download the zip, extract into `backend/generated_faces/kaggle/` (metadata.json + PNGs).

### StyleGAN2-ADA (opt-in live-generation engine) setup
Only worth doing if this machine has an NVIDIA GPU — confirmed by direct testing that CPU-only inference
takes multiple minutes per image (10+ minutes for 4 images). Without a GPU, the default Kaggle-gallery path
(fast, and already genuine StyleGAN2 output) is the practical choice; set `ENABLE_STYLEGAN=true` only if you
specifically want live generation anyway (e.g. for the latent-editing capability itself).
```powershell
cd backend
git clone https://github.com/NVlabs/stylegan2-ada-pytorch models/stylegan2-ada-pytorch
..\.venv\Scripts\pip install requests click psutil scipy imageio ninja   # the cloned repo's own runtime deps
# download stylegan2-ada-ffhq.pkl (364MB) into backend/checkpoints/:
curl.exe -L -o checkpoints\stylegan2-ada-ffhq.pkl https://nvlabs-fi-cdn.nvidia.com/stylegan2-ada-pytorch/pretrained/ffhq.pkl
# place any *.npy latent direction vectors in backend/checkpoints/latent_directions/ (optional — the base
# generation and trait-color matching both work fine without these; they only add latent-space edits like
# gender/age/hair-texture on top of the random base face)
```
Then set `ENABLE_STYLEGAN=true` (and `pip install torch torchvision` — see §1's Windows long-path note below
if that install fails) to actually use it. **On Windows, installing `torch` can fail with
`[WinError 206] The filename or extension is too long`** if this repo's path is deeply nested — one of
torch's bundled license files has a very long internal path. Fix (requires an elevated/Administrator
PowerShell, one-time, no reboot needed):
```powershell
New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'LongPathsEnabled' -Value 1 -PropertyType DWORD -Force
```

---

## 6. API reference (current)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | health check |
| POST | `/api/auth/register` | create user (email + password, scrypt-hashed) |
| POST | `/api/auth/login` | returns JWT |
| GET | `/api/generate-synthetic-dna` | synthetic SNP profile + predicted traits |
| POST | `/api/generate-face` | body: `{ traits: {...} }` → generated face variations + metadata |
| GET | `/api/dashboard/stats` | aggregate stats from MongoDB (requires DB) |

---

## 7. Contributing

- Branch off `main` as `feature/your-short-desc`; PRs target `main`; at least one approving review required.
- Commit messages prefixed `feat:`, `fix:`, `chore:`, etc.
- Full guide: [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## 8. Project progress log

> Keep appending dated entries here as the project evolves — newest on top.

- **2026-08-18** — Actually set up the StyleGAN2-ADA live-generation path (cloned the repo, installed
  torch/torchvision — hit and fixed a Windows long-path install failure, see §5 — downloaded the 364MB FFHQ
  checkpoint) to test it end-to-end. Confirmed it generates correctly, but also confirmed it's impractically
  slow without a GPU: 10+ minutes for 4 images on this CPU-only machine (Intel UHD 770, no NVIDIA GPU).
  Decision: made StyleGAN2 opt-in via `ENABLE_STYLEGAN` (default off) instead of the primary path, with the
  Kaggle gallery as the practical default — justified by also *disproving* an earlier claim in this log:
  regenerating `seed: 1` with the real FFHQ checkpoint came back 99.98% pixel-identical to the gallery's
  `face_000001.png`, proving the gallery images are genuine StyleGAN2 output already, not a lesser
  substitute (see the correction note in §4). Separately found and fixed a real resource-leak bug while
  testing: Express doesn't cancel a spawned Python subprocess when the client disconnects/times out, so
  abandoned requests were leaving CPU-hogging orphaned processes running indefinitely (observed 6 piled up
  from repeated test timeouts). Fixed by wiring an `AbortController`/`AbortSignal` through every `spawn()`
  call. Two mistakes were made and caught while implementing that fix, both now documented in `CLAUDE.md` so
  they don't recur: using `req.on("close")` instead of `res.on("close")` (the former fires almost immediately
  for any small POST body, aborting every request instantly — caught because a normal request started
  failing after the change); and not attaching an error listener to an aborted child's `stdin`, which crashed
  the entire Node process, not just the request (caught the same way). Also reduced the StyleGAN2 default
  image count from 4 to 1 (`STYLEGAN_IMAGE_COUNT`) for when it is enabled.
- **2026-08-18** — Diagnosed a user report that changing DNA-page traits didn't change the generated faces,
  and that iris recoloring looked broken. Root causes: (1) the Kaggle gallery's trait labels don't cover
  `eyeColor: blue/green` or `skinTone: dark` at all, so those dropdown choices were always a no-op for image
  *selection* (see known-issues note above); (2) `recolor_iris.py` used fixed FFHQ-alignment-assumption
  percentage coordinates for the iris/hair/skin regions, which don't line up on the gallery's real,
  differently-cropped photos. Fixed (2): added real per-image MediaPipe Face Landmarker detection
  (`backend/checkpoints/face_landmarker.task`, new dependency) with the old fixed-percentage math kept only
  as a no-face-detected fallback. While verifying visually, also found and fixed two more real bugs in the
  same file: the hair and skin adaptation regions overlapped with no feathering, causing a visible
  compounding-brightness seam across the forehead; and the "red/auburn" hair color multiplier had its
  R and B channel scaling swapped, so requesting red hair actually tinted hair blue/purple. All three fixes
  verified visually via direct before/after image comparisons, not just by reading the code. (1) is not yet
  fixed — needs either a relabeled/expanded gallery or the real StyleGAN2 path set up.
- **2026-08-18** — Ran the full stack end-to-end (backend on `.venv` Python 3.14 + numpy/pillow only, no
  torch/StyleGAN checkpoints, no MongoDB) to verify correctness. Found and fixed a real bug: `/api/generate-
  synthetic-dna` and `/api/generate-face` were returning HTTP 500 and discarding an already-successful
  generation whenever MongoDB was unreachable, because the audit-log DB write in `backend/routes/generation.js`
  shared a try/catch with the actual generation logic. Wrapped those writes in their own try/catch (logs a
  warning, doesn't fail the request). Verified: phenotype prediction (Tier‑2 rule fallback), Kaggle-gallery
  face selection, and iris/hair/skin post-processing all work correctly standalone and via the API; StyleGAN2
  path correctly no-ops when torch/checkpoints are absent; Vite frontend serves and compiles all pages with
  no build errors.
- **2026-08-17** — Added `CLAUDE.md` (AI-agent architecture notes) and rewrote this README into a full
  setup/run/pipeline guide, including the exact model/checkpoint directory layout so relocating files
  doesn't silently break generation (it degrades to the Kaggle-gallery fallback instead).
