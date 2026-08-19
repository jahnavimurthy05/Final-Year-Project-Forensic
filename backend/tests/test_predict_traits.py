"""
Minimal unit tests for the HIrisPlex-S phenotype prediction logic
(backend/inference/predict_traits.py).

Run from the repo root with:
    .venv\\Scripts\\python.exe -m pytest backend/tests -q

These intentionally do NOT assert against real Walsh et al. (2017) coefficient values —
no validated coefficients file is committed to this repo (see predict_traits.py's module
docstring / CLAUDE.md), so Tier 1 cannot be exercised with real numbers. Instead they
verify: the math primitives (dosage counting, softmax, score normalization) are correct,
the Tier 2 rule-based fallback behaves as documented, Tier 1 MLR is structurally correct
given synthetic coefficients, and manual trait overrides take precedence as designed.
"""

import predict_traits as pt


# ── Dosage / allele parsing ───────────────────────────────────────────────

def test_dosage_counts_effect_allele_regardless_of_order_and_case():
    # rs12913832 effect allele is "G" — "ag" (lowercase, reversed order) has one copy.
    assert pt._genotype_to_dosage("ag", "rs12913832") == 1
    assert pt._genotype_to_dosage("GA", "rs12913832") == 1
    assert pt._genotype_to_dosage("GG", "rs12913832") == 2
    assert pt._genotype_to_dosage("AA", "rs12913832") == 0


def test_dosage_returns_negative_one_for_unknown_rsid():
    assert pt._genotype_to_dosage("GG", "rs_not_a_real_marker") == -1


def test_normalize_allele_sorts_and_uppercases():
    assert pt._normalize_allele("ga") == "AG"
    assert pt._normalize_allele("AG") == "AG"


def test_parse_markers_supports_key_aliases():
    snp_markers = [
        {"marker": "rs12913832", "allele": "GG"},
        {"rsid": "rs1800407", "genotype": "cg"},
        {"snp": "rs1805007", "allele": "TT"},
        {"marker": "unknown_field_missing_allele"},
    ]
    allele_map, dosage_map = pt._parse_markers(snp_markers)
    assert allele_map["rs12913832"] == "GG"
    assert allele_map["rs1800407"] == "CG"
    assert dosage_map["rs12913832"] == 2
    assert dosage_map["rs1805007"] == 2
    assert "unknown_field_missing_allele" not in allele_map


# ── Tier 2: rule-based fallback ───────────────────────────────────────────

def test_rule_based_eye_prediction_favors_blue_for_rs12913832_GG():
    scores, matched = pt._score_from_rules(
        {"rs12913832": "GG"}, pt.EYE_RULES, pt.DEFAULT_PROBABILITIES["eyeColor"]
    )
    assert pt._best_label(scores) == "blue"
    assert matched == [{"marker": "rs12913832", "allele": "GG"}]


def test_normalize_scores_sums_to_one():
    scores, _ = pt._score_from_rules(
        {"rs12913832": "AA"}, pt.EYE_RULES, pt.DEFAULT_PROBABILITIES["eyeColor"]
    )
    assert abs(sum(scores.values()) - 1.0) < 1e-6


def test_score_from_rules_falls_back_to_defaults_with_no_markers():
    scores, matched = pt._score_from_rules({}, pt.EYE_RULES, pt.DEFAULT_PROBABILITIES["eyeColor"])
    assert matched == []
    assert pt._best_label(scores) == pt._best_label(pt.DEFAULT_PROBABILITIES["eyeColor"])


def test_predict_tier2_fallback_end_to_end(monkeypatch):
    monkeypatch.setattr(pt, "_load_coefficients", lambda: None)
    profile = {"snpMarkers": [{"marker": "rs12913832", "allele": "GG"}]}
    result = pt.predict(profile)

    assert result["status"] == "success"
    assert result["metadata"]["model"] == "hirisplex-s-rule-approximation"
    assert result["traits"]["eyeColor"] == "blue"
    for category in ("eyeColor", "hairColor", "skinTone"):
        assert abs(sum(result["probabilities"][category].values()) - 1.0) < 1e-6


def test_predict_manual_trait_override_wins_over_snp_prediction(monkeypatch):
    monkeypatch.setattr(pt, "_load_coefficients", lambda: None)
    profile = {
        "snpMarkers": [{"marker": "rs12913832", "allele": "GG"}],  # would predict blue
        "traits": {"eyeColor": "green"},  # explicit user override
    }
    result = pt.predict(profile)
    assert result["traits"]["eyeColor"] == "green"


# ── Tier 1: MLR math (synthetic coefficients — not real Walsh et al. values) ──

def test_softmax_reference_category_gets_baseline_zero_log_odds():
    probs = pt._softmax({"blue": 1.0}, reference_category="brown")
    # brown (the reference) has implicit log-odds 0; blue has log-odds 1 → blue > brown
    assert probs["blue"] > probs["brown"]
    assert abs(sum(probs.values()) - 1.0) < 1e-6


def test_mlr_end_to_end_with_synthetic_coefficients():
    synthetic_coeffs = {
        "eye_color": {
            "_reference_category": "brown",
            "intercepts": {"blue": 0.0, "intermediate": 0.0},
            "snp_coefficients": {"rs12913832": {"blue": 3.0, "intermediate": 0.5}},
        },
        "hair_color": {
            "_reference_category": "brown",
            "intercepts": {"black": 0.0, "blonde": 0.0, "red": 0.0},
            "snp_coefficients": {},
        },
        "skin_color": {
            "_reference_category": "intermediate",
            "intercepts": {"very_pale": 0.0, "pale": 0.0, "dark": 0.0, "dark_to_black": 0.0},
            "snp_coefficients": {},
        },
    }
    results = pt._run_hirisplex_mlr({"rs12913832": 2}, synthetic_coeffs)
    eye_probs, matched, missing = results["eye"]

    # Dosage 2 at a strong positive blue coefficient should make blue dominant.
    assert eye_probs["blue"] > eye_probs["brown"]
    assert matched == [{"marker": "rs12913832", "dosage": 2}]
    assert abs(sum(eye_probs.values()) - 1.0) < 1e-6


def test_dosage_from_allele_map_uses_the_traits_own_effect_allele():
    # A SNP not in _GENOTYPE_DOSAGE_OVERRIDE: the shared Tier 2 EFFECT_ALLELE table (if it
    # had an entry) must NOT override what this trait's own coefficients declare.
    trait_cfg = {"snp_coefficients": {"rs_test_only": {"blue": 1.0, "_effect_allele": "T"}}}
    dosage = pt._dosage_from_allele_map({"rs_test_only": "TT"}, trait_cfg)
    assert dosage["rs_test_only"] == 2

    dosage_g_genotype = pt._dosage_from_allele_map({"rs_test_only": "GG"}, trait_cfg)
    assert dosage_g_genotype["rs_test_only"] == 0  # no "T" alleles present


def test_predict_mixed_tier_when_only_some_traits_have_coefficients(monkeypatch):
    # eye/hair have coefficients; skin_color is absent (mirrors the real committed file,
    # where the HIrisPlex-S skin model was never published in usable form).
    partial_coeffs = {
        "eye_color": {
            "_reference_category": "brown",
            "intercepts": {"blue": 0.0, "intermediate": 0.0},
            "snp_coefficients": {
                "rs12913832": {"blue": 3.0, "intermediate": 0.0, "_effect_allele": "G"}
            },
        },
        "hair_color": {
            "_reference_category": "blonde",
            "intercepts": {"brown": 0.0, "red": 0.0, "black": 0.0},
            "snp_coefficients": {},
        },
        "skin_color": None,
    }
    monkeypatch.setattr(pt, "_load_coefficients", lambda: partial_coeffs)
    profile = {"snpMarkers": [{"marker": "rs12913832", "allele": "GG"}]}
    result = pt.predict(profile)

    assert result["metadata"]["model"] == "hirisplex-mixed-tier"
    assert result["metadata"]["tiers"] == {
        "eyeColor": "mlr-validated",
        "hairColor": "mlr-validated",
        "skinTone": "rule-approximation",
    }
    assert result["traits"]["eyeColor"] == "blue"
    assert abs(sum(result["probabilities"]["skinTone"].values()) - 1.0) < 1e-6


def test_dosage_override_translates_rs12913832_via_verified_strand_complement():
    # dbSNP-verified: this app's forward A/G genotype vs. the paper's minus-strand T/C
    # effect allele. AA (forward) = TT (minus) = 2 copies of "T".
    trait_cfg = {"snp_coefficients": {"rs12913832": {"blue": -1.0, "_effect_allele": "T"}}}
    assert pt._dosage_from_allele_map({"rs12913832": "AA"}, trait_cfg)["rs12913832"] == 2
    assert pt._dosage_from_allele_map({"rs12913832": "AG"}, trait_cfg)["rs12913832"] == 1
    assert pt._dosage_from_allele_map({"rs12913832": "GG"}, trait_cfg)["rs12913832"] == 0


def test_dosage_override_translates_rs1800407_via_verified_symbol_mapping():
    # dbSNP-verified: this app's "G" is not a real allele at this locus (real SNP is C/T);
    # it's a placeholder that happens to point the same direction as the true minor allele.
    trait_cfg = {"snp_coefficients": {"rs1800407": {"blue": 1.0, "_effect_allele": "A"}}}
    assert pt._dosage_from_allele_map({"rs1800407": "CC"}, trait_cfg)["rs1800407"] == 0
    assert pt._dosage_from_allele_map({"rs1800407": "CG"}, trait_cfg)["rs1800407"] == 1
    assert pt._dosage_from_allele_map({"rs1800407": "GG"}, trait_cfg)["rs1800407"] == 2


def test_dosage_override_matches_expected_direction_against_tier2_ground_truth():
    # Regression guard for the bug this override fixes: without it, "GG" and "AA" at
    # rs12913832 both produced dosage 0 against the real coefficients file (silently
    # blind to the SNP). With the verified override, they must diverge in the same
    # direction the already-trusted Tier 2 rule table encodes (GG->blue, AA->brown).
    eye_cfg = {
        "_reference_category": "brown",
        "intercepts": {"blue": 3.8402, "intermediate": 0.372},
        "snp_coefficients": {"rs12913832": {"blue": -4.8727, "intermediate": -1.99, "_effect_allele": "T"}},
    }
    gg_probs, _, _ = pt._predict_trait_mlr_from_alleles({"rs12913832": "GG"}, eye_cfg)
    aa_probs, _, _ = pt._predict_trait_mlr_from_alleles({"rs12913832": "AA"}, eye_cfg)

    assert gg_probs["blue"] > gg_probs["brown"]   # GG -> blue-dominant, matches EYE_RULES GG
    assert aa_probs["brown"] > aa_probs["blue"]   # AA -> brown-dominant, matches EYE_RULES AA
    assert gg_probs["blue"] > aa_probs["blue"]    # must not collapse to the same result


def test_predict_uses_tier1_when_valid_coefficients_present(monkeypatch):
    synthetic_coeffs = {
        "eye_color": {
            "_reference_category": "brown",
            "intercepts": {"blue": 0.0, "intermediate": 0.0},
            "snp_coefficients": {
                "rs12913832": {"blue": 3.0, "intermediate": 0.0, "_effect_allele": "G"}
            },
        },
        "hair_color": {
            "_reference_category": "brown",
            "intercepts": {"black": 0.0, "blonde": 0.0, "red": 0.0},
            "snp_coefficients": {},
        },
        "skin_color": {
            "_reference_category": "intermediate",
            "intercepts": {"very_pale": 0.0, "pale": 0.0, "dark": 0.0, "dark_to_black": 0.0},
            "snp_coefficients": {},
        },
    }
    monkeypatch.setattr(pt, "_load_coefficients", lambda: synthetic_coeffs)
    profile = {"snpMarkers": [{"marker": "rs12913832", "allele": "GG"}]}
    result = pt.predict(profile)

    assert result["status"] == "success"
    assert result["metadata"]["model"] == "hirisplex-s-mlr-validated"
    assert result["traits"]["eyeColor"] == "blue"
