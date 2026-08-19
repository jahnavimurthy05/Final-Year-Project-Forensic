"""
HIrisPlex(-S) Phenotype Prediction Engine
==========================================
Tier is decided independently per trait (eyeColor / hairColor / skinTone), not as one
global switch — see _tier1_eye/_tier1_hair/_tier1_skin and predict() below:
  Tier 1: Real multinomial logistic regression, when that trait's coefficients are
          present in backend/checkpoints/hirisplex_s_coefficients.json.
          eyeColor + hairColor: validated coefficients from Walsh et al. (2013),
          "The HIrisPlex system for simultaneous prediction of hair and eye colour
          from DNA," cross-checked against two independent published sources and
          reproduced to 16 significant digits against the paper's own worked example.
          skinTone: intentionally NOT populated — the HIrisPlex-S skin model (Walsh
          et al. 2017, Hum Genet 136:847-863) has never been published with usable
          intercepts/coefficients (its results table has no intercept row and is a
          raster image, not machine-readable numbers), so there is currently no
          legitimate way to run it outside the Erasmus MC webtool itself.
  Tier 2: Approximate rule-based score accumulation, used for whichever trait(s)
          don't have Tier 1 coefficients loaded (today: skinTone only).

`metadata.model` reports "hirisplex-s-mlr-validated" (all three Tier 1),
"hirisplex-s-rule-approximation" (all three Tier 2), or "hirisplex-mixed-tier"
(today's actual state: eye/hair Tier 1, skin Tier 2) — check `metadata.tiers` for the
per-trait breakdown rather than assuming from the top-level model string alone.

Input:  snpMarkers array  [{"marker": "rs12913832", "allele": "AG"}, ...]
Output: traits + per-category probabilities + audit metadata
"""

import argparse
import json
import math
import sys
from pathlib import Path

# ─── COEFFICIENT FILE LOCATION ───────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent
_COEFF_FILE = _HERE.parent / "checkpoints" / "hirisplex_s_coefficients.json"

# ─── EFFECT ALLELE TABLE (additive dosage model) ─────────────────────────────
# Effect allele = the minor/pigmentation-increasing allele per rsID
# Dosage: 0 = homozygous reference, 1 = heterozygous, 2 = homozygous effect allele
EFFECT_ALLELE = {
    "rs12913832": "G",  "rs1800407":  "G",  "rs12896399": "G",
    "rs16891982": "C",  "rs1393350":  "G",  "rs12203592": "C",
    "rs1129038":  "G",  "rs916977":   "A",  "rs11547464": "A",
    "rs1800401":  "A",  "rs1805007":  "T",  "rs1805008":  "T",
    "rs2228479":  "A",  "rs1110400":  "C",  "rs28777":    "C",
    "rs1042602":  "C",  "rs1426654":  "A",  "rs683":      "T",
    "rs1800414":  "C",  "rs2402130":  "G",  "rs3212345":  "C",
}

# Skin category mapping: HIrisPlex-S 5-tier → our display labels
_SKIN_HIRISPLEX_TO_DISPLAY = {
    "very_pale":     "fair",
    "pale":          "fair",
    "intermediate":  "medium",
    "dark":          "brown",
    "dark_to_black": "dark",
}

# ─── FALLBACK RULE TABLES ────────────────────────────────────────────────────
EYE_RULES = {
    "rs12913832": {
        "GG": {"blue": 0.85, "brown": 0.08, "green": 0.04, "hazel": 0.03},
        "AG": {"brown": 0.45, "blue": 0.32, "green": 0.12, "hazel": 0.11},
        "AA": {"brown": 0.82, "hazel": 0.10, "green": 0.05, "blue": 0.03},
    },
    "rs1800407": {
        "GG": {"green": 0.35, "hazel": 0.30, "brown": 0.20, "blue": 0.15},
        "CG": {"brown": 0.45, "hazel": 0.25, "green": 0.18, "blue": 0.12},
        "CC": {"brown": 0.65, "blue": 0.18, "hazel": 0.10, "green": 0.07},
    },
    "rs12896399": {
        "GG": {"blue": 0.40, "green": 0.30, "brown": 0.20, "hazel": 0.10},
        "GT": {"brown": 0.40, "blue": 0.30, "green": 0.18, "hazel": 0.12},
        "TT": {"brown": 0.55, "hazel": 0.20, "blue": 0.15, "green": 0.10},
    },
    "rs16891982": {
        "CC": {"blue": 0.45, "green": 0.25, "brown": 0.18, "hazel": 0.12},
        "CG": {"brown": 0.42, "blue": 0.28, "green": 0.18, "hazel": 0.12},
        "GG": {"brown": 0.70, "hazel": 0.15, "green": 0.08, "blue": 0.07},
    },
}

HAIR_RULES = {
    "rs12913832": {
        "GG": {"blonde": 0.50, "brown": 0.26, "black": 0.14, "red": 0.10},
        "AG": {"brown": 0.46, "black": 0.26, "blonde": 0.18, "red": 0.10},
        "AA": {"brown": 0.48, "black": 0.38, "red": 0.08, "blonde": 0.06},
    },
    "rs1800407": {
        "GG": {"red": 0.36, "brown": 0.30, "blonde": 0.20, "black": 0.14},
        "CG": {"brown": 0.44, "red": 0.20, "black": 0.20, "blonde": 0.16},
        "CC": {"brown": 0.48, "black": 0.30, "blonde": 0.16, "red": 0.06},
    },
    "rs1805007": {
        "TT": {"red": 0.75, "blonde": 0.15, "brown": 0.07, "black": 0.03},
        "CT": {"red": 0.40, "brown": 0.30, "blonde": 0.20, "black": 0.10},
        "CC": {"brown": 0.42, "black": 0.32, "blonde": 0.20, "red": 0.06},
    },
    "rs1805008": {
        "TT": {"red": 0.78, "blonde": 0.12, "brown": 0.07, "black": 0.03},
        "CT": {"red": 0.42, "brown": 0.28, "blonde": 0.20, "black": 0.10},
        "CC": {"brown": 0.40, "black": 0.34, "blonde": 0.20, "red": 0.06},
    },
}

SKIN_RULES = {
    "rs16891982": {
        "GG": {"fair": 0.65, "medium": 0.22, "olive": 0.07, "brown": 0.04, "dark": 0.02},
        "CG": {"medium": 0.45, "fair": 0.25, "olive": 0.18, "brown": 0.08, "dark": 0.04},
        "CC": {"brown": 0.38, "dark": 0.28, "olive": 0.18, "medium": 0.12, "fair": 0.04},
    },
    "rs1426654": {
        "AA": {"fair": 0.70, "medium": 0.20, "olive": 0.06, "brown": 0.03, "dark": 0.01},
        "AG": {"medium": 0.42, "olive": 0.26, "fair": 0.18, "brown": 0.10, "dark": 0.04},
        "GG": {"dark": 0.48, "brown": 0.32, "olive": 0.14, "medium": 0.04, "fair": 0.02},
    },
    "rs12896399": {
        "TT": {"fair": 0.52, "medium": 0.28, "olive": 0.11, "brown": 0.06, "dark": 0.03},
        "TC": {"medium": 0.42, "olive": 0.24, "fair": 0.18, "brown": 0.12, "dark": 0.04},
        "CC": {"brown": 0.35, "olive": 0.28, "dark": 0.18, "medium": 0.15, "fair": 0.04},
    },
    "rs1042602": {
        "CC": {"fair": 0.55, "medium": 0.28, "olive": 0.10, "brown": 0.05, "dark": 0.02},
        "AC": {"medium": 0.44, "fair": 0.28, "olive": 0.16, "brown": 0.08, "dark": 0.04},
        "AA": {"olive": 0.38, "brown": 0.30, "dark": 0.18, "medium": 0.10, "fair": 0.04},
    },
}

DEFAULT_PROBABILITIES = {
    "eyeColor":  {"brown": 0.45, "blue": 0.25, "green": 0.15, "hazel": 0.15},
    "hairColor": {"brown": 0.42, "black": 0.28, "blonde": 0.20, "red": 0.10},
    "skinTone":  {"medium": 0.36, "fair": 0.24, "olive": 0.18, "brown": 0.15, "dark": 0.07},
}

TRAIT_KEYS = {
    "eyeColor": "eyeColor",   "eye_color": "eyeColor",
    "hairColor": "hairColor", "hair_color": "hairColor",
    "skinTone": "skinTone",   "skin_tone": "skinTone",
    "sex": "sex",             "gender": "sex",
    "age": "ageRange",        "ageRange": "ageRange",
    "faceShape": "faceShape", "face_shape": "faceShape",
    "cheekbone": "cheekboneStructure",
    "cheekboneShape": "cheekboneStructure",
    "cheekboneStructure": "cheekboneStructure",
    "noseShape": "noseStructure",   "noseStructure": "noseStructure",
    "lipShape": "lipStructure",     "lipStructure": "lipStructure",
}


# ═══════════════════════════════════════════════════════════════════
# TIER 1: REAL HIrisPlex-S Multinomial Logistic Regression Engine
# ═══════════════════════════════════════════════════════════════════

_ACCEPTED_COEFFICIENT_STATUSES = {"VALIDATED_FROM_SOURCE"}


def _load_coefficients():
    """Load validated HIrisPlex-S coefficients. Returns None when not ready.

    Uses an allowlist of "_status" values rather than a blocklist (e.g. rejecting only
    "TEMPLATE...") — a file can be genuinely wrong for reasons other than being a
    placeholder (see backend/checkpoints/hirisplex_s_coefficients.PENDING_VERIFICATION.json,
    which failed an allele-orientation cross-check against this project's own SNP
    conventions after being sourced from a real paper). Requiring an explicit, known-good
    status is safer than assuming "not a template" means "safe to use".
    """
    if not _COEFF_FILE.exists():
        return None
    try:
        with open(_COEFF_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        status = str(data.get("_status", "")).upper()
        if status not in _ACCEPTED_COEFFICIENT_STATUSES:
            return None  # Not an explicitly-accepted status — fallback to Tier 2
        return data
    except Exception:
        return None


def _genotype_to_dosage(allele_str: str, rsid: str) -> int:
    """Count copies of the effect allele → dosage 0, 1, 2. Returns -1 if unknown."""
    effect = EFFECT_ALLELE.get(rsid)
    if not effect:
        return -1
    normalized = "".join(sorted(str(allele_str).strip().upper()))
    return normalized.count(effect)


def _softmax(log_odds: dict, reference_category: str) -> dict:
    """Convert log-odds (vs reference) to probabilities via numerically stable softmax."""
    all_cats = {**log_odds, reference_category: 0.0}
    max_val = max(all_cats.values())
    exps = {k: math.exp(v - max_val) for k, v in all_cats.items()}
    total = sum(exps.values())
    return {k: round(v / total, 4) for k, v in exps.items()}


# This app's own SNP generator (backend/services/dna_service.js SNP_MARKERS) only ever
# produces genotypes for 4 SNPs, each from a fixed set of allowed genotype strings — that
# is the app's "canonical" convention. Two of those four disagree with the letters this
# Tier 1 coefficients file declares, verified against dbSNP directly (not assumed) rather
# than blindly complemented, because a generic strand-complement is only sometimes the
# right fix:
#   rs12913832: dbSNP's forward-strand alleles are A/G (matches this app). The 2013
#     HIrisPlex paper's spreadsheet reports it on HERC2's minus strand instead ("T"/"C") —
#     confirmed via NCBI Gene's HERC2 coordinates (minus strand) and independently
#     corroborated by the IrisPlex patent (US20110312534A1), which states this SNP's
#     allele "may be either A ... (or, on the complementary strand, T)". A straightforward
#     Watson-Crick complement (A<->T) correctly translates one convention to the other.
#   rs1800407: dbSNP's real forward-strand alleles are C/T — this app's hardcoded "G"
#     allele (dna_service.js) is not a real base at this locus at all. It has always been
#     used purely as an internal placeholder symbol for "the pigmentation-shifting allele"
#     (this app's SNP genotypes are synthetic and were never checked against a real
#     reference sequence). That symbol happens to point in the same direction as the true
#     minor allele (OCA2 transcript "A" / forward "T" — same patent text, corroborated by
#     SNPedia), which is why a *direct genotype-string translation* is used here instead of
#     a biological strand complement — complementing a placeholder letter that was never a
#     real nucleotide would not be meaningful.
# Both translations were independently checked to reproduce the expected direction against
# this project's own (already-trusted, previously-verified) Tier 2 rule tables before being
# adopted — see CLAUDE.md for the full writeup, sources, and that cross-check.
_GENOTYPE_DOSAGE_OVERRIDE = {
    "rs12913832": {"AA": 2, "AG": 1, "GG": 0},
    "rs1800407":  {"CC": 0, "CG": 1, "GG": 2},
}


def _dosage_from_allele_map(allele_map: dict, trait_cfg: dict) -> dict:
    """
    Compute per-SNP dosage counts using the effect allele declared *in this trait's own
    coefficients* (per-SNP "_effect_allele"), NOT the shared module-level EFFECT_ALLELE
    table. Different published HIrisPlex(-S) models can report the same rsID on different
    strands, and the SNP sets differ per trait/paper — reusing one global effect-allele
    table silently miscounts or drops SNPs the table wasn't built for. This was caught
    before shipping: the module-level table has no entry at all for most of the real
    HIrisPlex hair-color SNPs (e.g. rs312262906, rs885479, rs1805005/6/9, rs2378249,
    rs4959270, rs12821256, rs201326893), which would have made every dosage lookup for
    those SNPs return -1 ("missing"), silently degrading Tier 1 hair predictions to just
    the model's intercepts regardless of the input genotypes.

    SNPs in _GENOTYPE_DOSAGE_OVERRIDE use a verified direct genotype->dosage translation
    instead of literal effect-allele counting (see that table's comment for why — one of
    the two is a strand complement, the other is not, so no single mechanical rule covers
    both). This only covers the SNPs this app actually generates today
    (backend/services/dna_service.js); any other SNP overlapping between this app's
    convention and a coefficients file has NOT been verified and would need the same
    dbSNP-backed treatment before being trusted.
    """
    dosage = {}
    for rsid, cfg in (trait_cfg.get("snp_coefficients") or {}).items():
        allele_str = allele_map.get(rsid)
        if not allele_str:
            continue
        normalized = "".join(sorted(str(allele_str).strip().upper()))

        override = _GENOTYPE_DOSAGE_OVERRIDE.get(rsid)
        if override is not None:
            if normalized in override:
                dosage[rsid] = override[normalized]
            continue  # unrecognized genotype string for an overridden SNP — leave "missing"

        effect = cfg.get("_effect_allele")
        if not effect:
            continue
        dosage[rsid] = normalized.count(effect)
    return dosage


def _predict_trait_mlr(markers_dosage: dict, trait_cfg: dict) -> tuple:
    """
    Multinomial logistic regression for one phenotype trait.
    Returns: (probability_dict, matched_snps_list, missing_snps_list)
    """
    intercepts = trait_cfg.get("intercepts", {})
    snp_coeffs = trait_cfg.get("snp_coefficients", {})
    reference  = trait_cfg.get("_reference_category", "")

    log_odds = {cat: float(b0) for cat, b0 in intercepts.items()}
    matched, missing = [], []

    for rsid, cfg in snp_coeffs.items():
        dosage = markers_dosage.get(rsid, -1)
        if dosage < 0:
            missing.append(rsid)
            continue
        for cat in log_odds:
            beta = cfg.get(cat, 0.0)
            if isinstance(beta, (int, float)):
                log_odds[cat] += float(beta) * dosage
        matched.append({"marker": rsid, "dosage": dosage})

    return _softmax(log_odds, reference), matched, missing


def _predict_trait_mlr_from_alleles(allele_map: dict, trait_cfg: dict) -> tuple:
    """Same as _predict_trait_mlr, but computes its own dosage map from allele_map using
    this trait's own declared effect alleles (see _dosage_from_allele_map)."""
    dosage_map = _dosage_from_allele_map(allele_map, trait_cfg)
    return _predict_trait_mlr(dosage_map, trait_cfg)


def _run_hirisplex_mlr(markers_dosage: dict, coeffs: dict) -> dict:
    """Run all three HIrisPlex-S trait MLR models and normalise outputs.

    `markers_dosage` here must already be scoped to whichever effect-allele convention
    `coeffs` expects (see _dosage_from_allele_map) — this function does not recompute
    dosage per trait, so it's only correct when all three trait configs in `coeffs` agree
    on the same effect allele per shared SNP. `predict()` does not use this path for real
    requests for that reason; it calls _predict_trait_mlr_from_alleles independently per
    trait instead. This function is kept for direct testing of the regression math itself.
    """

    # Eye color (HIrisPlex 3-class: blue / intermediate / brown)
    eye_raw, eye_matched, eye_missing = _predict_trait_mlr(
        markers_dosage, coeffs.get("eye_color") or {}
    )
    eye_probs = {
        "blue":  eye_raw.get("blue", 0.0),
        "hazel": eye_raw.get("intermediate", 0.0),
        "brown": eye_raw.get("brown", 0.0),
        "green": 0.0,
    }
    tot = sum(eye_probs.values()) or 1.0
    eye_probs = {k: round(v / tot, 4) for k, v in eye_probs.items()}

    # Hair color (4-class: black / brown / blonde / red)
    hair_probs, hair_matched, hair_missing = _predict_trait_mlr(
        markers_dosage, coeffs.get("hair_color") or {}
    )

    # Skin color (HIrisPlex-S 5-class → merged to 5 display labels)
    skin_raw, skin_matched, skin_missing = _predict_trait_mlr(
        markers_dosage, coeffs.get("skin_color") or {}
    )
    skin_probs: dict = {}
    for hirisplex_cat, display_cat in _SKIN_HIRISPLEX_TO_DISPLAY.items():
        skin_probs[display_cat] = skin_probs.get(display_cat, 0.0) + skin_raw.get(hirisplex_cat, 0.0)
    skin_probs.setdefault("olive", 0.0)
    tot = sum(skin_probs.values()) or 1.0
    skin_probs = {k: round(v / tot, 4) for k, v in skin_probs.items()}

    return {
        "eye":  (eye_probs,  eye_matched,  eye_missing),
        "hair": (hair_probs, hair_matched, hair_missing),
        "skin": (skin_probs, skin_matched, skin_missing),
    }


# ═══════════════════════════════════════════════════════════════════
# TIER 2: Approximate Rule-Based Fallback Engine
# ═══════════════════════════════════════════════════════════════════

def _normalize_allele(value):
    return "".join(sorted(str(value or "").strip().upper()))


def _merge_scores(base, addition):
    merged = dict(base)
    for key, value in addition.items():
        merged[key] = merged.get(key, 0.0) + float(value)
    return merged


def _normalize_scores(scores):
    total = sum(scores.values())
    if total <= 0:
        return scores
    return {key: round(value / total, 4) for key, value in scores.items()}


def _best_label(probabilities):
    return max(probabilities.items(), key=lambda item: item[1])[0]


def _score_from_rules(markers, rules, default_scores):
    scores = dict(default_scores)
    matched = []
    for marker, allele_rules in rules.items():
        allele = markers.get(marker)
        if allele and allele in allele_rules:
            scores = _merge_scores(scores, allele_rules[allele])
            matched.append({"marker": marker, "allele": allele})
    return _normalize_scores(scores), matched


# ═══════════════════════════════════════════════════════════════════
# SHARED UTILITIES
# ═══════════════════════════════════════════════════════════════════

def _parse_markers(snp_markers):
    """Build allele_map (for fallback) and dosage_map (for MLR) from input list."""
    allele_map = {}
    dosage_map = {}
    for marker in snp_markers or []:
        name   = marker.get("marker") or marker.get("rsid") or marker.get("snp")
        allele = marker.get("allele") or marker.get("genotype")
        if name and allele:
            rsid       = str(name).strip()
            normalized = _normalize_allele(allele)
            allele_map[rsid] = normalized
            dosage = _genotype_to_dosage(normalized, rsid)
            if dosage >= 0:
                dosage_map[rsid] = dosage
    return allele_map, dosage_map


def _normalize_manual_traits(traits):
    normalized = {}
    for key, value in (traits or {}).items():
        mapped_key = TRAIT_KEYS.get(key)
        if mapped_key and value not in (None, ""):
            normalized[mapped_key] = str(value).strip().lower()
    return normalized


# ═══════════════════════════════════════════════════════════════════
# TIER 1 PER-TRAIT WRAPPERS
# ═══════════════════════════════════════════════════════════════════
# Each trait is decided independently: Tier 1 MLR if that trait's coefficients are
# present in the loaded file, Tier 2 rule-based fallback otherwise. This matters because
# no published, usable skin-colour coefficients exist (see hirisplex_s_coefficients.json's
# own "_skin_color_status" field) — eye/hair can be genuinely validated while skin stays
# Tier 2, rather than an all-or-nothing switch forcing skin into an all-zero-probability
# dead end just because eye/hair coefficients happen to be available.

def _tier1_eye(allele_map, coeffs):
    eye_cfg = coeffs.get("eye_color")
    if not eye_cfg:
        return None
    eye_raw, matched, missing = _predict_trait_mlr_from_alleles(allele_map, eye_cfg)
    eye_probs = {
        "blue":  eye_raw.get("blue", 0.0),
        "hazel": eye_raw.get("intermediate", 0.0),
        "brown": eye_raw.get("brown", 0.0),
        "green": 0.0,
    }
    tot = sum(eye_probs.values()) or 1.0
    eye_probs = {k: round(v / tot, 4) for k, v in eye_probs.items()}
    return eye_probs, matched, missing


def _tier1_hair(allele_map, coeffs):
    hair_cfg = coeffs.get("hair_color")
    if not hair_cfg:
        return None
    return _predict_trait_mlr_from_alleles(allele_map, hair_cfg)


def _tier1_skin(allele_map, coeffs):
    skin_cfg = coeffs.get("skin_color")
    if not skin_cfg:
        return None
    skin_raw, matched, missing = _predict_trait_mlr_from_alleles(allele_map, skin_cfg)
    skin_probs = {}
    for hirisplex_cat, display_cat in _SKIN_HIRISPLEX_TO_DISPLAY.items():
        skin_probs[display_cat] = skin_probs.get(display_cat, 0.0) + skin_raw.get(hirisplex_cat, 0.0)
    skin_probs.setdefault("olive", 0.0)
    tot = sum(skin_probs.values()) or 1.0
    skin_probs = {k: round(v / tot, 4) for k, v in skin_probs.items()}
    return skin_probs, matched, missing


def _build_tier_warning(tiers):
    tier2_traits = [name for name, info in tiers.items() if info["tier"] == 2]
    if not tier2_traits:
        return None
    if tier2_traits == ["skinTone"]:
        return (
            "skinTone uses the Tier 2 approximate rule-based engine: the real HIrisPlex-S "
            "skin-colour model (Walsh et al. 2017, Hum Genet 136:847-863) has never been "
            "published with usable intercepts/coefficients — see CLAUDE.md. eyeColor and "
            "hairColor use validated Tier 1 HIrisPlex coefficients (Walsh et al. 2013)."
        )
    return (
        "Real HIrisPlex(-S) coefficients not loaded for: " + ", ".join(tier2_traits) + ". "
        "Using the approximate rule-based engine for those traits. Populate "
        "backend/checkpoints/hirisplex_s_coefficients.json to enable multinomial logistic "
        "regression for them."
    )


def _build_forensic_notice(tiers):
    tier1_traits = [name for name, info in tiers.items() if info["tier"] == 1]
    if not tier1_traits:
        return "Approximate estimation only — not scientifically validated."
    if len(tier1_traits) == len(tiers):
        return (
            "Probabilistic phenotype estimation using validated HIrisPlex multinomial "
            "logistic regression coefficients. Not suitable as stand-alone evidence of identity."
        )
    return (
        "Probabilistic phenotype estimation. " + "/".join(tier1_traits) + " use validated "
        "Walsh et al. multinomial logistic regression coefficients; remaining trait(s) use "
        "an approximate rule-based estimate. Not suitable as stand-alone evidence of identity."
    )


# ═══════════════════════════════════════════════════════════════════
# MAIN PREDICT FUNCTION
# ═══════════════════════════════════════════════════════════════════

def predict(profile):
    snp_markers   = profile.get("snpMarkers") or profile.get("markers") or []
    manual_traits = _normalize_manual_traits(profile.get("traits") or {})
    allele_map, _legacy_dosage_map = _parse_markers(snp_markers)

    coeffs = _load_coefficients() or {}

    tiers = {}

    tier1_eye = _tier1_eye(allele_map, coeffs)
    if tier1_eye is not None:
        eye_probs, eye_matched, eye_missing = tier1_eye
        tiers["eyeColor"] = {"tier": 1, "matched": eye_matched, "missing": eye_missing}
    else:
        eye_probs, eye_matched = _score_from_rules(allele_map, EYE_RULES, DEFAULT_PROBABILITIES["eyeColor"])
        tiers["eyeColor"] = {"tier": 2, "matched": eye_matched}

    tier1_hair = _tier1_hair(allele_map, coeffs)
    if tier1_hair is not None:
        hair_probs, hair_matched, hair_missing = tier1_hair
        tiers["hairColor"] = {"tier": 1, "matched": hair_matched, "missing": hair_missing}
    else:
        hair_probs, hair_matched = _score_from_rules(allele_map, HAIR_RULES, DEFAULT_PROBABILITIES["hairColor"])
        tiers["hairColor"] = {"tier": 2, "matched": hair_matched}

    tier1_skin = _tier1_skin(allele_map, coeffs)
    if tier1_skin is not None:
        skin_probs, skin_matched, skin_missing = tier1_skin
        tiers["skinTone"] = {"tier": 1, "matched": skin_matched, "missing": skin_missing}
    else:
        skin_probs, skin_matched = _score_from_rules(allele_map, SKIN_RULES, DEFAULT_PROBABILITIES["skinTone"])
        tiers["skinTone"] = {"tier": 2, "matched": skin_matched}

    traits = {
        "eyeColor":  _best_label(eye_probs),
        "hairColor": _best_label(hair_probs),
        "skinTone":  _best_label(skin_probs),
    }
    traits.update(manual_traits)

    tier_values = {info["tier"] for info in tiers.values()}
    if tier_values == {1}:
        model = "hirisplex-s-mlr-validated"
    elif tier_values == {2}:
        model = "hirisplex-s-rule-approximation"
    else:
        model = "hirisplex-mixed-tier"

    return {
        "status": "success",
        "traits": traits,
        "probabilities": {
            "eyeColor":  eye_probs,
            "hairColor": hair_probs,
            "skinTone":  skin_probs,
        },
        "metadata": {
            "model": model,
            "tiers": {
                name: ("mlr-validated" if info["tier"] == 1 else "rule-approximation")
                for name, info in tiers.items()
            },
            "matched_markers": {name: info["matched"] for name, info in tiers.items()},
            "missing_snps": {
                name: info["missing"] for name, info in tiers.items() if info["tier"] == 1
            },
            "warning": _build_tier_warning(tiers),
            "forensic_notice": _build_forensic_notice(tiers),
        },
    }


# ═══════════════════════════════════════════════════════════════════
# CLI ENTRY POINT
# ═══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="HIrisPlex-S phenotype prediction from SNP genotypes."
    )
    parser.add_argument(
        "--profile-json", required=True,
        help='JSON string, e.g. {"snpMarkers": [{"marker":"rs12913832","allele":"GG"}]}'
    )
    args = parser.parse_args()
    try:
        profile = json.loads(args.profile_json)
        print(json.dumps(predict(profile)))
    except Exception as error:
        print(json.dumps({"status": "error", "error": str(error)}))
        sys.exit(2)


if __name__ == "__main__":
    main()
