import argparse
import json
import sys


EYE_RULES = {
    "rs12913832": {
        "GG": {"blue": 0.82, "brown": 0.12, "green": 0.04, "hazel": 0.02},
        "AG": {"brown": 0.48, "blue": 0.30, "green": 0.12, "hazel": 0.10},
        "AA": {"brown": 0.78, "hazel": 0.12, "green": 0.07, "blue": 0.03},
    },
    "rs1800407": {
        "GG": {"green": 0.34, "hazel": 0.28, "brown": 0.24, "blue": 0.14},
        "CG": {"brown": 0.44, "hazel": 0.24, "green": 0.20, "blue": 0.12},
        "CC": {"brown": 0.62, "blue": 0.20, "hazel": 0.10, "green": 0.08},
    },
}

HAIR_RULES = {
    "rs12913832": {
        "GG": {"blonde": 0.46, "brown": 0.28, "black": 0.16, "red": 0.10},
        "AG": {"brown": 0.45, "black": 0.26, "blonde": 0.20, "red": 0.09},
        "AA": {"brown": 0.48, "black": 0.36, "red": 0.10, "blonde": 0.06},
    },
    "rs1800407": {
        "GG": {"red": 0.35, "brown": 0.32, "blonde": 0.18, "black": 0.15},
        "CG": {"brown": 0.42, "red": 0.22, "black": 0.20, "blonde": 0.16},
        "CC": {"brown": 0.46, "black": 0.30, "blonde": 0.18, "red": 0.06},
    },
}

SKIN_RULES = {
    "rs16891982": {
        "GG": {"fair": 0.62, "medium": 0.22, "olive": 0.08, "brown": 0.05, "dark": 0.03},
        "CG": {"medium": 0.42, "fair": 0.26, "olive": 0.18, "brown": 0.10, "dark": 0.04},
        "CC": {"brown": 0.36, "dark": 0.26, "olive": 0.20, "medium": 0.14, "fair": 0.04},
    },
    "rs12896399": {
        "TT": {"fair": 0.50, "medium": 0.28, "olive": 0.12, "brown": 0.07, "dark": 0.03},
        "TC": {"medium": 0.40, "olive": 0.24, "fair": 0.20, "brown": 0.12, "dark": 0.04},
        "CC": {"brown": 0.34, "olive": 0.28, "dark": 0.18, "medium": 0.16, "fair": 0.04},
    },
}

DEFAULT_PROBABILITIES = {
    "eyeColor": {"brown": 0.45, "blue": 0.25, "green": 0.15, "hazel": 0.15},
    "hairColor": {"brown": 0.42, "black": 0.28, "blonde": 0.20, "red": 0.10},
    "skinTone": {"medium": 0.36, "fair": 0.24, "olive": 0.18, "brown": 0.15, "dark": 0.07},
}

TRAIT_KEYS = {
    "eyeColor": "eyeColor",
    "eye_color": "eyeColor",
    "hairColor": "hairColor",
    "hair_color": "hairColor",
    "skinTone": "skinTone",
    "skin_tone": "skinTone",
    "sex": "sex",
    "gender": "sex",
    "age": "ageRange",
    "ageRange": "ageRange",
    "faceShape": "faceShape",
    "face_shape": "faceShape",
    "cheekbone": "cheekboneStructure",
    "cheekboneShape": "cheekboneStructure",
    "cheekboneStructure": "cheekboneStructure",
    "noseShape": "noseStructure",
    "noseStructure": "noseStructure",
    "lipShape": "lipStructure",
    "lipStructure": "lipStructure",
}


def parse_args():
    parser = argparse.ArgumentParser(description="Predict normalized phenotype traits from SNP markers.")
    parser.add_argument("--profile-json", required=True)
    return parser.parse_args()


def normalize_allele(value):
    return "".join(sorted(str(value or "").strip().upper()))


def normalize_label(value):
    return str(value or "").strip().lower()


def merge_scores(base, addition):
    merged = dict(base)
    for key, value in addition.items():
        merged[key] = merged.get(key, 0.0) + float(value)
    return merged


def normalize_scores(scores):
    total = sum(scores.values())
    if total <= 0:
        return scores
    return {key: round(value / total, 4) for key, value in scores.items()}


def best_label(probabilities):
    return max(probabilities.items(), key=lambda item: item[1])[0]


def marker_map(snp_markers):
    result = {}
    for marker in snp_markers or []:
        name = marker.get("marker") or marker.get("rsid") or marker.get("snp")
        allele = marker.get("allele") or marker.get("genotype")
        if name and allele:
            result[str(name).strip()] = normalize_allele(allele)
    return result


def score_from_rules(markers, rules, default_scores):
    scores = dict(default_scores)
    matched = []
    for marker, allele_rules in rules.items():
        allele = markers.get(marker)
        if allele and allele in allele_rules:
            scores = merge_scores(scores, allele_rules[allele])
            matched.append({"marker": marker, "allele": allele})
    return normalize_scores(scores), matched


def normalize_manual_traits(traits):
    normalized = {}
    for key, value in (traits or {}).items():
        mapped_key = TRAIT_KEYS.get(key)
        if mapped_key and value not in (None, ""):
            normalized[mapped_key] = normalize_label(value)
    return normalized


def predict(profile):
    snp_markers = profile.get("snpMarkers") or profile.get("markers") or []
    manual_traits = normalize_manual_traits(profile.get("traits") or profile)
    markers = marker_map(snp_markers)

    eye_probs, eye_matches = score_from_rules(markers, EYE_RULES, DEFAULT_PROBABILITIES["eyeColor"])
    hair_probs, hair_matches = score_from_rules(
        markers, HAIR_RULES, DEFAULT_PROBABILITIES["hairColor"]
    )
    skin_probs, skin_matches = score_from_rules(
        markers, SKIN_RULES, DEFAULT_PROBABILITIES["skinTone"]
    )

    traits = {
        "eyeColor": best_label(eye_probs),
        "hairColor": best_label(hair_probs),
        "skinTone": best_label(skin_probs),
    }
    traits.update(manual_traits)

    return {
        "status": "success",
        "traits": traits,
        "probabilities": {
            "eyeColor": eye_probs,
            "hairColor": hair_probs,
            "skinTone": skin_probs,
        },
        "metadata": {
            "model": "hirisplex-s-inspired-rule-baseline",
            "matchedMarkers": {
                "eyeColor": eye_matches,
                "hairColor": hair_matches,
                "skinTone": skin_matches,
            },
            "note": "Replace this baseline with validated HIrisPlex-S coefficients before scientific use.",
        },
    }


def main():
    try:
        args = parse_args()
        profile = json.loads(args.profile_json)
        print(json.dumps(predict(profile)))
    except Exception as error:
        print(json.dumps({"status": "error", "error": str(error)}))
        sys.exit(2)


if __name__ == "__main__":
    main()
