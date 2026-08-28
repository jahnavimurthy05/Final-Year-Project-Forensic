"""
MediaPipe & High-Precision Phenotype Post-Processing Engine
=============================================================
Transforms facial composite images to match target HIrisPlex-S phenotype predictions:
  1. Iris Recoloring (real per-image iris localization via MediaPipe Face Landmarker,
     falling back to a fixed-percentage guess only when no face is detected)
  2. Hair Color Adaptation (Black / Blonde / Red / Brown tone mapping)
  3. Skin Tone Adaptation (Fair / Medium / Olive / Brown / Dark tone mapping)
"""

import argparse
import base64
import io
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

EYE_COLORS = {
    "black": (20, 15, 10),         # Near-black dark brown (true black irises are very dark brown)
    "dark brown": (50, 30, 15),
    "brown": (92, 55, 28),
    "blue": (30, 144, 255),        # Vibrant Dodger Blue
    "green": (46, 139, 87),        # Vibrant Sea Green
    "hazel": (130, 90, 40),        # Warm Hazel
    "amber": (180, 110, 20),       # Amber
    "gray": (140, 155, 165),
    "grey": (140, 155, 165),
}

# MediaPipe Face Landmarker iris landmark indices (478-point face mesh).
_RIGHT_IRIS = [468, 469, 470, 471, 472]  # 468 = center
_LEFT_IRIS = [473, 474, 475, 476, 477]   # 473 = center

_HERE = Path(__file__).resolve().parent
_DEFAULT_MODEL_PATH = _HERE.parent / "checkpoints" / "face_landmarker.task"

_landmarker = None
_landmarker_load_failed = False


def _get_landmarker():
    """Lazily create the MediaPipe FaceLandmarker. Returns None if unavailable."""
    global _landmarker, _landmarker_load_failed
    if _landmarker is not None or _landmarker_load_failed:
        return _landmarker

    try:
        import mediapipe as mp
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision

        model_path = Path(os.environ.get("FACE_LANDMARKER_MODEL", str(_DEFAULT_MODEL_PATH)))
        if not model_path.exists():
            _landmarker_load_failed = True
            return None

        base_options = mp_python.BaseOptions(model_asset_path=str(model_path))
        options = vision.FaceLandmarkerOptions(base_options=base_options, num_faces=1)
        _landmarker = vision.FaceLandmarker.create_from_options(options)
    except Exception:
        _landmarker_load_failed = True
        return None

    return _landmarker


def detect_face_landmarks(pil_image):
    """Run real face-landmark detection. Returns a list of (x_px, y_px) tuples, or None."""
    landmarker = _get_landmarker()
    if landmarker is None:
        return None

    try:
        import mediapipe as mp

        rgb = np.array(pil_image.convert("RGB"))
        h, w = rgb.shape[:2]
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = landmarker.detect(mp_image)
        if not result.face_landmarks:
            return None

        landmarks = result.face_landmarks[0]
        return [(int(p.x * w), int(p.y * h)) for p in landmarks]
    except Exception:
        return None


def _iris_geometry_from_landmarks(landmarks, ring_indices):
    center = landmarks[ring_indices[0]]
    ring = ring_indices[1:]
    radii = [
        ((landmarks[i][0] - center[0]) ** 2 + (landmarks[i][1] - center[1]) ** 2) ** 0.5
        for i in ring
    ]
    radius = max(3, int(round(sum(radii) / len(radii))))
    return center, radius


def _face_bbox_from_landmarks(landmarks, w, h):
    xs = [p[0] for p in landmarks]
    ys = [p[1] for p in landmarks]
    x1, x2 = max(0, min(xs)), min(w, max(xs))
    y1, y2 = max(0, min(ys)), min(h, max(ys))
    return x1, y1, x2, y2


def _blend_ellipse(img, cx, cy, radius_x, radius_y, rgb_target, strength=0.8, mix=0.6):
    h, w, _ = img.shape
    x1, y1 = max(0, cx - radius_x), max(0, cy - radius_y)
    x2, y2 = min(w, cx + radius_x), min(h, cy + radius_y)
    if x2 <= x1 or y2 <= y1:
        return

    roi = img[y1:y2, x1:x2].astype(float)
    my, mx = np.ogrid[: y2 - y1, : x2 - x1]
    dist = ((mx - (cx - x1)) ** 2 / (radius_x ** 2) + (my - (cy - y1)) ** 2 / (radius_y ** 2))
    iris_mask = (dist <= 1.0).astype(float)[:, :, None]

    recolored_roi = roi * (1 - mix) + np.array(rgb_target) * mix
    img[y1:y2, x1:x2] = (roi * (1 - iris_mask * strength) + recolored_roi * (iris_mask * strength)).astype(
        np.uint8
    )


def recolor_iris_vivid(pil_image, eye_color="brown", landmarks=None):
    img = np.array(pil_image).copy()
    h, w, _ = img.shape
    color_name = str(eye_color).strip().lower()
    rgb_target = EYE_COLORS.get(color_name, EYE_COLORS["brown"])

    if landmarks:
        right_center, right_radius = _iris_geometry_from_landmarks(landmarks, _RIGHT_IRIS)
        left_center, left_radius = _iris_geometry_from_landmarks(landmarks, _LEFT_IRIS)
        for (cx, cy), radius in ((right_center, right_radius), (left_center, left_radius)):
            # Keep the recolor inside the actual iris ring — 0.9x slightly under-fills
            # which is safer than over-filling onto the sclera/eyelids. The iris landmark
            # ring already marks the visible iris boundary, so no outward padding is needed.
            padded = int(round(radius * 0.90))
            # Dark colors (black/dark brown) need strongest blending to overpower
            # any underlying light iris; all colors need strong enough mix to
            # actually replace the original iris color, not just tint it.
            is_dark = rgb_target[0] < 80 and rgb_target[1] < 80 and rgb_target[2] < 80
            blend_strength = 0.98 if is_dark else 0.95
            blend_mix = 0.90 if is_dark else 0.80
            _blend_ellipse(img, cx, cy, padded, padded, rgb_target, strength=blend_strength, mix=blend_mix)
    else:
        # Fixed-percentage fallback for when no face could be detected in the crop
        # (e.g. extreme close-up or an unusual pose). Tuned for FFHQ-style centered composites.
        centers = [
            (int(w * 0.375), int(h * 0.485)),
            (int(w * 0.625), int(h * 0.485)),
        ]
        radius_x = int(w * 0.038)
        radius_y = int(h * 0.032)
        is_dark = rgb_target[0] < 80 and rgb_target[1] < 80 and rgb_target[2] < 80
        blend_strength = 0.95 if is_dark else 0.85
        blend_mix = 0.85 if is_dark else 0.65
        for cx, cy in centers:
            _blend_ellipse(img, cx, cy, radius_x, radius_y, rgb_target, strength=blend_strength, mix=blend_mix)

    return Image.fromarray(img)


def _feathered_effect(img, region, transform_fn, feather=10):
    """Blend `transform_fn(img)` into `img` only within `region`, with a soft
    (gaussian-blurred) edge so adjacent regions don't meet at a hard, visible seam."""
    h, w = img.shape[:2]
    y1, y2, x1, x2 = region
    y1, y2 = max(0, int(y1)), min(h, int(y2))
    x1, x2 = max(0, int(x1)), min(w, int(x2))
    if y2 <= y1 or x2 <= x1:
        return img

    hard_mask = np.zeros((h, w), dtype=np.uint8)
    hard_mask[y1:y2, x1:x2] = 255
    soft_mask = np.asarray(Image.fromarray(hard_mask).filter(ImageFilter.GaussianBlur(radius=feather)))
    soft_mask = (soft_mask.astype(float) / 255.0)[:, :, None]

    transformed = transform_fn(img)
    return img * (1 - soft_mask) + transformed * soft_mask


def adapt_hair_and_skin(pil_image, hair_color="black", skin_tone="medium", landmarks=None):
    """
    Known limitation: the hair/skin split uses the face-landmark bounding box top as a
    proxy for the hairline (no real hair segmentation model is used). This is a
    reasonable approximation for most photos but is not exact, so for some crops a thin
    strip of forehead or background near that boundary can pick up a faint tint from the
    hair-color transform. This is a documented approximation, not a silent failure —
    `metadata.detector` in the API response still reports whether real landmarks were
    used at all for a given image.
    """
    img = np.array(pil_image).astype(float)
    h, w, _ = img.shape
    hair_lower = str(hair_color).lower()
    skin_lower = str(skin_tone).lower()

    if landmarks:
        x1, y1, x2, y2 = _face_bbox_from_landmarks(landmarks, w, h)
        hair_h = max(1, y1)  # everything above the detected hairline/forehead top
        sx1, sy1, sx2, sy2 = x1, y1, x2, y2
        # Hair covers a bit more than the face bbox width (temples/sides), but not the
        # whole frame. The face bbox itself is already quite wide (jaw-to-jaw), so only
        # a modest margin is added — a larger one (e.g. 50%) collapses back to the full
        # image width for typical portraits and reintroduces the background bleed.
        face_w = x2 - x1
        face_h = y2 - y1
        hx1 = max(0, int(x1 - face_w * 0.18))
        hx2 = min(w, int(x2 + face_w * 0.18))
        # There is often visible background between the top of the frame and the
        # actual hairline (crops aren't always tight to the head) — starting the hair
        # region at row 0 darkens/tints that background too. Without real hair
        # segmentation this is a heuristic, not exact, but stopping short of the frame
        # top noticeably reduces it (confirmed: a background pixel there previously
        # shifted from (83,82,82) to (37,36,36) under a full-height hair region).
        hair_top = max(0, int(y1 - face_h * 0.35))
    else:
        # Fixed-percentage fallback, tuned for FFHQ-style centered composites.
        hair_h = int(h * 0.32)
        sy1, sy2 = int(h * 0.28), int(h * 0.82)
        sx1, sx2 = int(w * 0.20), int(w * 0.80)
        hx1, hx2 = int(w * 0.12), int(w * 0.88)
        hair_top = 0

    # Skin region must not overlap the hair region, or the two effects compound
    # into a visible band where they meet.
    sy1 = max(sy1, hair_h)

    # 1. Hair region adaptation. Horizontally confined near the head (hx1..hx2) rather
    # than the full frame width — otherwise this visibly tints background pixels beside
    # the head (confirmed: a background corner pixel shifted from (139,137,129) to
    # (62,61,58) under the old full-width region).
    if "black" in hair_lower or "dark" in hair_lower:
        img = _feathered_effect(img, (hair_top, hair_h, hx1, hx2), lambda x: x * 0.45)
    elif "blonde" in hair_lower:
        img = _feathered_effect(img, (hair_top, hair_h, hx1, hx2), lambda x: np.clip(x * 1.35 + [30, 20, 5], 0, 255))
    elif "red" in hair_lower:
        # Channels are RGB order here (PIL "RGB" -> np.array) — boost red, cut blue for auburn.
        img = _feathered_effect(img, (hair_top, hair_h, hx1, hx2), lambda x: np.clip(x * [1.45, 0.85, 0.7], 0, 255))

    # 2. Skin tone adaptation. "brown" and "dark" get distinct multipliers — they used to
    # share one branch and rendered pixel-identical (confirmed: both produced (150,120,108)
    # from the same (200,161,144) source pixel).
    if sy2 > sy1:
        if "dark" in skin_lower:
            img = _feathered_effect(img, (sy1, sy2, sx1, sx2), lambda x: x * 0.62)
        elif "brown" in skin_lower:
            img = _feathered_effect(img, (sy1, sy2, sx1, sx2), lambda x: x * 0.82)
        elif "fair" in skin_lower or "pale" in skin_lower:
            img = _feathered_effect(img, (sy1, sy2, sx1, sx2), lambda x: np.clip(x * 1.12, 0, 255))
        elif "olive" in skin_lower:
            img = _feathered_effect(img, (sy1, sy2, sx1, sx2), lambda x: np.clip(x * [0.95, 1.05, 0.90], 0, 255))

    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def process_phenotype_post_processing(pil_image, eye_color="brown", hair_color="black", skin_tone="medium"):
    landmarks = detect_face_landmarks(pil_image)
    recolored = recolor_iris_vivid(pil_image, eye_color, landmarks)
    final_img = adapt_hair_and_skin(recolored, hair_color, skin_tone, landmarks)
    method = "mediapipe-face-landmarker" if landmarks else "fixed-coordinate-fallback"
    return final_img, method


def parse_data_url(data_url):
    if "," not in data_url:
        raise ValueError("Expected image data URL.")

    header, encoded = data_url.split(",", 1)
    image = Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGB")
    return image


def to_data_url(image):
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def main():
    parser = argparse.ArgumentParser(description="Recolor iris and adapt phenotype traits.")
    parser.add_argument("--image-data-url", default="")
    parser.add_argument("--eye-color", default="brown")
    parser.add_argument("--hair-color", default="black")
    parser.add_argument("--skin-tone", default="medium")
    args = parser.parse_args()

    try:
        data_url = args.image_data_url
        eye_color = args.eye_color
        hair_color = args.hair_color
        skin_tone = args.skin_tone

        if not data_url and not sys.stdin.isatty():
            payload = json.load(sys.stdin)
            data_url = payload.get("image_data_url") or payload.get("dataUrl") or ""
            eye_color = payload.get("eyeColor") or payload.get("eye_color") or eye_color
            hair_color = payload.get("hairColor") or payload.get("hair_color") or hair_color
            skin_tone = payload.get("skinTone") or payload.get("skin_tone") or skin_tone
            # Debug: log received values so Node-side issues are visible in backend stderr
            print(f"[recolor_iris] received eyeColor={eye_color!r} hairColor={hair_color!r} skinTone={skin_tone!r}", file=sys.stderr)

        if not data_url:
            print(json.dumps({"status": "error", "error": "No image data URL provided"}))
            sys.exit(1)

        pil_image = parse_data_url(data_url)
        processed, method = process_phenotype_post_processing(pil_image, eye_color, hair_color, skin_tone)
        out_url = to_data_url(processed)

        print(
            json.dumps(
                {
                    "status": "success",
                    "image": out_url,
                    "metadata": {
                        "detector": method,
                        "target_eye_color": eye_color,
                        "target_hair_color": hair_color,
                        "target_skin_tone": skin_tone,
                    },
                }
            )
        )
    except Exception as error:
        print(json.dumps({"status": "error", "error": str(error)}))
        sys.exit(2)


if __name__ == "__main__":
    main()
