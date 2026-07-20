"""
HIrisPlex-S Phenotype Prediction Engine
========================================
Two-tier prediction architecture:
  Tier 1 (PRIMARY):   Real HIrisPlex-S multinomial logistic regression
                      Loaded from: backend/checkpoints/hirisplex_s_coefficients.json
                      Requires validated beta coefficients from Walsh et al. (2017)
  Tier 2 (FALLBACK):  Approximate rule-based score accumulation
                      Used automatically when real coefficients are not yet populated

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

def _load_coefficients():
    """Load validated HIrisPlex-S coefficients. Returns None when not ready."""
    if not _COEFF_FILE.exists():
        return None
    try:
        with open(_COEFF_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        status = str(data.get("_status", ""))
        if status.upper().startswith("TEMPLATE"):
            return None  # Still a placeholder — fallback to Tier 2
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


def _run_hirisplex_mlr(markers_dosage: dict, coeffs: dict) -> dict:
    """Run all three HIrisPlex-S trait MLR models and normalise outputs."""

    # Eye color (HIrisPlex 3-class: blue / intermediate / brown)
    eye_raw, eye_matched, eye_missing = _predict_trait_mlr(
        markers_dosage, coeffs.get("eye_color", {})
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
        markers_dosage, coeffs.get("hair_color", {})
    )

    # Skin color (HIrisPlex-S 5-class → merged to 5 display labels)
    skin_raw, skin_matched, skin_missing = _predict_trait_mlr(
        markers_dosage, coeffs.get("skin_color", {})
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
# MAIN PREDICT FUNCTION
# ═══════════════════════════════════════════════════════════════════

def predict(profile):
    snp_markers   = profile.get("snpMarkers") or profile.get("markers") or []
    manual_traits = _normalize_manual_traits(profile.get("traits") or {})
    allele_map, dosage_map = _parse_markers(snp_markers)

    coeffs = _load_coefficients()

    if coeffs is not None:
        # ── TIER 1: Validated HIrisPlex-S MLR ─────────────────────
        results = _run_hirisplex_mlr(dosage_map, coeffs)
        eye_probs,  eye_matched,  eye_missing  = results["eye"]
        hair_probs, hair_matched, hair_missing = results["hair"]
        skin_probs, skin_matched, skin_missing = results["skin"]

        traits = {
            "eyeColor":  _best_label(eye_probs),
            "hairColor": _best_label(hair_probs),
            "skinTone":  _best_label(skin_probs),
        }
        traits.update(manual_traits)

        return {
            "status": "success",
            "traits": traits,
            "probabilities": {
                "eyeColor":  eye_probs,
                "hairColor": hair_probs,
                "skinTone":  skin_probs,
            },
            "metadata": {
                "model":  "hirisplex-s-mlr-validated",
                "engine": "multinomial-logistic-regression",
                "snps_evaluated":     len(dosage_map),
                "snps_in_model_eye":  len(eye_matched),
                "snps_in_model_hair": len(hair_matched),
                "snps_in_model_skin": len(skin_matched),
                "missing_snps": {
                    "eye":  eye_missing,
                    "hair": hair_missing,
                    "skin": skin_missing,
                },
                "forensic_notice": (
                    "Probabilistic phenotype estimation using validated HIrisPlex-S "
                    "multinomial logistic regression coefficients. "
                    "Not suitable as stand-alone evidence of identity."
                ),
            },
        }

    else:
        # ── TIER 2: Approximate Rule-Based Fallback ────────────────
        eye_probs,  eye_matched  = _score_from_rules(allele_map, EYE_RULES,  DEFAULT_PROBABILITIES["eyeColor"])
        hair_probs, hair_matched = _score_from_rules(allele_map, HAIR_RULES, DEFAULT_PROBABILITIES["hairColor"])
        skin_probs, skin_matched = _score_from_rules(allele_map, SKIN_RULES, DEFAULT_PROBABILITIES["skinTone"])

        traits = {
            "eyeColor":  _best_label(eye_probs),
            "hairColor": _best_label(hair_probs),
            "skinTone":  _best_label(skin_probs),
        }
        traits.update(manual_traits)

        return {
            "status": "success",
            "traits": traits,
            "probabilities": {
                "eyeColor":  eye_probs,
                "hairColor": hair_probs,
                "skinTone":  skin_probs,
            },
            "metadata": {
                "model":   "hirisplex-s-rule-approximation",
                "engine":  "weighted-rule-accumulation",
                "warning": (
                    "Real HIrisPlex-S coefficients not yet loaded. "
                    "Using approximate rule-based engine. "
                    "Populate backend/checkpoints/hirisplex_s_coefficients.json "
                    "with validated beta values from Walsh et al. (2017) "
                    "to enable full multinomial logistic regression."
                ),
                "snps_evaluated": len(allele_map),
                "matched_markers": {
                    "eyeColor":  eye_matched,
                    "hairColor": hair_matched,
                    "skinTone":  skin_matched,
                },
                "forensic_notice": "Approximate estimation only — not scientifically validated.",
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
