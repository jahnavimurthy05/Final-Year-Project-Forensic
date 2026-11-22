import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { generateSyntheticDna as fetchDnaProfile } from '../services/api';
import { useDna } from '../context/DnaContext';
import LiquidButton from '../components/ui/LiquidButton';
import {
  Dna,
  ArrowRight,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  Zap,
} from 'lucide-react';

// ─── Natural Hair Dot Swatches ────────────────────────────────────────────────
const HAIR_CLASSES = ['black', 'brown', 'blonde', 'red', 'white'];
const HAIR_DOTS = { black: '#1a1a1a', brown: '#7b4f2e', blonde: '#d4a854', red: '#b03030', white: '#e2e8f0' };

/**
 * Client-side Bayesian attribute fusion preview.
 * Mirrors the server-side logic in attribute_fusion_service.js so the user sees
 * live concordance feedback before hitting Generate.
 */
function computeFusionPreview(observedHairColor, dnaHairProbs = {}) {
  const obs = (observedHairColor || 'brown').toLowerCase();
  const dnaTop = Object.entries(dnaHairProbs).reduce((a, b) => (b[1] > a[1] ? b : a), ['unknown', 0])[0];

  // Forensic Canities / Ageing Reconciler:
  if (obs === 'white' || obs === 'grey' || obs === 'gray') {
    return {
      fused: { ...dnaHairProbs, white: 0.9 },
      fusedColor: 'white',
      dnaTop,
      concordant: true,
      isCanities: true,
    };
  }

  // DNA is dominant (0.80), physical is weak prior (0.20)
  const wDna = 0.8;
  const wHair = 0.2;
  const gamma = 0.5;
  const residual = (1 - gamma) / (HAIR_CLASSES.length - 1);

  let total = 0;
  const raw = {};
  HAIR_CLASSES.forEach((c) => {
    const pD = Math.max(dnaHairProbs[c] ?? 0.25, 1e-9);
    const pH = c === obs ? gamma : residual;
    const score = Math.pow(pD, wDna) * Math.pow(pH, wHair);
    raw[c] = score;
    total += score;
  });

  let best = 'black',
    maxP = -1;
  const fused = {};
  HAIR_CLASSES.forEach((c) => {
    fused[c] = total > 0 ? raw[c] / total : 0.25;
    if (fused[c] > maxP) {
      maxP = fused[c];
      best = c;
    }
  });

  const concordant = dnaTop === obs;
  return { fused, fusedColor: best, dnaTop, concordant, isCanities: false };
}

export default function DnaInputPage() {
  const navigate = useNavigate();
  const { dnaState, updateTraits, setFullProfile } = useDna();
  const [isLoading, setIsLoading] = useState(false);

  const observedHair = dnaState.traits.observedHairColor || 'black';
  const dnaHairProbs = dnaState.probabilities?.hairColor || {};

  const fusion = computeFusionPreview(observedHair, dnaHairProbs);

  const handleTraitChange = (key, value) => {
    if (key === 'observedHairColor' || key === 'hairColor') {
      updateTraits({ observedHairColor: value, hairColor: value });
    } else {
      updateTraits({ [key]: value });
    }
  };

  const generateSyntheticDna = async () => {
    setIsLoading(true);
    try {
      const profile = await fetchDnaProfile();
      if (profile) setFullProfile(profile);
    } catch {
      setFullProfile({
        snpMarkers: [
          { marker: 'rs12913832', allele: 'AG' },
          { marker: 'rs1800407', allele: 'GG' },
        ],
        traits: { hairColor: observedHair, eyeColor: 'hazel', skinTone: 'medium', observedHairColor: observedHair },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mb-2.5">
          <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Biometric &amp; Genomic Multi-Modal Pipeline</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Multi-Modal Forensic Phenotyping
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 font-mono leading-relaxed">
          Physical Trace Evidence (Modality 1) &times; HIrisPlex-S Genomic Profile (Modality 2) &rarr; Bayesian Attribute Fusion
        </p>
      </div>

      {/* ── 3 Column Forensic Data Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* ════════════════════════════════════════════════════════════════════
            CARD 1: MODALITY 1 — PHYSICAL HAIR EVIDENCE
        ════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-6 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header chip */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                <Fingerprint className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Modality 01</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Physical Evidence</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-1">
              Physical Hair Evidence
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Macroscopic traits documented from recovered crime-scene trace evidence.
            </p>

            <div className="space-y-4">
              {/* Observed Hair Colour Segmented Selector */}
              <div>
                <label className="block text-slate-800 dark:text-slate-200 font-semibold text-xs mb-2">
                  Observed Hair Colour <span className="text-slate-500 dark:text-slate-400 font-normal">(Crime-Scene Record)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {HAIR_CLASSES.map((c) => {
                    const isSelected = observedHair === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleTraitChange('observedHairColor', c)}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-semibold capitalize flex items-center justify-center gap-2 transition-all select-none ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-3 h-3 rounded-full inline-block shadow-xs ${
                            isSelected ? 'ring-2 ring-teal-600' : 'border border-slate-300 dark:border-slate-600'
                          }`}
                          style={{ backgroundColor: HAIR_DOTS[c] }}
                        />
                        <span>{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specimen Chain-of-Custody Manifest */}
              <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Specimen Chain of Custody</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    VERIFIED
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[9px]">SAMPLE</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">Trace Follicle</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[9px]">COLLECTION</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">Crime Scene</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[9px]">ANALYSIS</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">Macroscopic</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[9px]">ROOT TAG</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">Root Sheath</span>
                  </div>
                </div>
              </div>

              {/* Observed Physical Sex Segmented Switcher */}
              <div>
                <label className="block text-slate-800 dark:text-slate-200 font-semibold text-xs mb-2">
                  Observed Sex <span className="text-slate-500 dark:text-slate-400 font-normal">(Witness Record)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  {['male', 'female'].map((opt) => {
                    const isSelected = dnaState.traits.sex === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleTraitChange('sex', opt)}
                        className={`py-2 px-3 rounded-lg font-bold text-xs capitalize transition-all select-none ${
                          isSelected
                            ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-sm border border-slate-200 dark:border-slate-700'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {opt === 'male' ? '♂ Male' : '♀ Female'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Trait Selects: Skin Tone & Eye Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium text-xs mb-1.5">
                    Skin Tone
                  </label>
                  <select
                    value={dnaState.traits.skinTone || 'medium'}
                    onChange={(e) => handleTraitChange('skinTone', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white text-xs font-medium focus:border-teal-500 outline-none transition-colors"
                  >
                    {['fair', 'medium', 'olive', 'brown', 'dark'].map((s) => (
                      <option key={s} value={s} className="capitalize">
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium text-xs mb-1.5">
                    Eye Colour
                  </label>
                  <select
                    value={dnaState.traits.eyeColor || 'brown'}
                    onChange={(e) => handleTraitChange('eyeColor', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white text-xs font-medium focus:border-teal-500 outline-none transition-colors"
                  >
                    {['brown', 'blue', 'green', 'hazel', 'black'].map((s) => (
                      <option key={s} value={s} className="capitalize">
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 2: MODALITY 2 — SYNTHETIC DNA PROFILE
        ════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-6 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header chip */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                <Dna className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Modality 02</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Genomic Profile</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-1">
              Synthetic DNA Profile
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              41 SNP loci extracted via HIrisPlex-S protocol.
            </p>

            <div className="space-y-4">
              {/* DNA Biological Sex Selector */}
              <div>
                <label className="block text-slate-800 dark:text-slate-200 font-semibold text-xs mb-2">
                  DNA Biological Sex <span className="text-slate-500 dark:text-slate-400 font-normal">(AMEL Chromosomal)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  {['male', 'female'].map((opt) => {
                    const isSelected = (dnaState.traits.dnaSex || 'male') === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleTraitChange('dnaSex', opt)}
                        className={`py-2 px-3 rounded-lg font-bold text-xs capitalize transition-all select-none ${
                          isSelected
                            ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-sm border border-slate-200 dark:border-slate-700'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {opt === 'male' ? '♂ Male (XY)' : '♀ Female (XX)'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Genomic SNP Sequencer Box */}
              <div className="rounded-xl p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 min-h-[105px] flex flex-col justify-center">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>SNP Marker Alleles</span>
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                    {dnaState.snpMarkers?.length ? `${dnaState.snpMarkers.length} Loci Active` : 'Idle'}
                  </span>
                </div>

                {dnaState.snpMarkers && dnaState.snpMarkers.length > 0 ? (
                  <div className="space-y-1.5">
                    {dnaState.snpMarkers.map((m, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center py-1 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                      >
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {m.marker === 'rs12913832'
                            ? 'rs12913832 (HERC2/OCA2)'
                            : m.marker === 'rs1800407'
                            ? 'rs1800407 (MC1R)'
                            : m.marker}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-extrabold border border-teal-500/20">
                          {m.allele}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-3 text-center">
                    <Dna className="w-5 h-5 text-slate-400 dark:text-slate-500 mx-auto mb-1 animate-pulse" />
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400 font-medium">
                      No markers synthesized yet
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-500 mt-0.5">
                      Click below to generate synthetic SNP alleles &rarr;
                    </p>
                  </div>
                )}
              </div>

              {/* HIrisPlex-S Probability Matrix Output */}
              {dnaState.probabilities && Object.keys(dnaState.probabilities).length > 0 && (
                <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      HIrisPlex-S Genetic Priors
                    </span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(dnaState.probabilities).map(([trait, probs]) => {
                      const top = Object.entries(probs || {}).reduce((a, b) => (b[1] > a[1] ? b : a), ['—', 0]);
                      return (
                        <div key={trait} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-600 dark:text-slate-400 font-medium capitalize">
                            {trait.replace('Color', ' Color').replace('Tone', ' Tone')}
                          </span>
                          <span className="text-slate-900 dark:text-white font-bold capitalize">
                            {top[0]}{' '}
                            <span className="text-teal-700 dark:text-teal-400 font-extrabold">
                              ({(top[1] * 100).toFixed(1)}%)
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5">
            <LiquidButton
              onClick={generateSyntheticDna}
              disabled={isLoading}
              variant="teal"
              className="w-full py-3 shadow-sm"
              icon={<Dna className="w-4 h-4 text-teal-600 dark:text-teal-300" />}
            >
              {isLoading ? 'Synthesizing SNP Profile...' : 'Synthesize HIrisPlex-S Markers'}
            </LiquidButton>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 3: ATTRIBUTE FUSION ENGINE
        ════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-6 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header chip */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                <Zap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Fusion Engine</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Bayesian WLOP</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-1">
              Attribute Fusion
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Bayesian log opinion pool cross-validates physical and DNA modalities.
            </p>

            <div className="space-y-4">
              {/* Concordance / Discordance Alert Card (Restrained Signal Color) */}
              <motion.div
                key={`${observedHair}-${fusion.fusedColor}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl p-3 border transition-all ${
                  fusion.concordant
                    ? 'border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20'
                    : 'border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {fusion.concordant ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  )}
                  <span
                    className={`text-xs font-bold font-mono uppercase tracking-wider ${
                      fusion.concordant
                        ? 'text-emerald-800 dark:text-emerald-300'
                        : 'text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {fusion.isCanities
                      ? 'Canities Verified (Age Reconciled)'
                      : fusion.concordant
                      ? 'Concordant — Verified'
                      : 'Discordance Detected'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {fusion.isCanities
                    ? `Physical evidence displays age-related white/grey hair, while DNA reveals natural baseline (${
                        fusion.dnaTop || 'dark'
                      }). Reconciled.`
                    : fusion.concordant
                    ? `Physical evidence (${observedHair}) matches HIrisPlex-S DNA prediction (${fusion.dnaTop}). Composite confidence boosted.`
                    : `Physical: ${observedHair} | DNA prediction: ${
                        fusion.dnaTop || '—'
                      }. Possible cosmetic dye or template degradation.`}
                </p>
              </motion.div>

              {/* Sex Concordance / Disguise Alert */}
              {dnaState.traits.sex !== (dnaState.traits.dnaSex || 'male') ? (
                <div className="rounded-xl p-3 border border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 text-xs font-mono">
                  <div className="flex items-center gap-1.5 mb-1 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>DISGUISE DETECTED</span>
                  </div>
                  <p className="text-[11px] text-slate-800 dark:text-slate-300 leading-snug">
                    Suspect is{' '}
                    <strong className="text-slate-900 dark:text-white capitalize">
                      {dnaState.traits.dnaSex || 'male'} ({dnaState.traits.dnaSex === 'female' ? 'XX' : 'XY'})
                    </strong>{' '}
                    with <strong className="text-amber-800 dark:text-amber-300 capitalize">{dnaState.traits.sex} presentation</strong>.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="text-[11px]">Sex Concordant: Observation matches DNA ({dnaState.traits.sex}).</span>
                </div>
              )}

              {/* Fused Hair Probabilities Meter (Unified Slate/Teal Bars) */}
              <div className="rounded-xl p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Fused Posterior Probabilities
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">W_dna=0.80</span>
                </div>
                <div className="space-y-1.5">
                  {HAIR_CLASSES.map((c) => {
                    const pct = ((fusion.fused[c] || 0) * 100).toFixed(1);
                    return (
                      <div key={c} className="flex items-center gap-2 text-xs font-mono">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 flex-shrink-0"
                          style={{ backgroundColor: HAIR_DOTS[c] }}
                        />
                        <span className="capitalize text-slate-700 dark:text-slate-300 font-medium w-14 text-[11px]">
                          {c}
                        </span>
                        <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            className="h-1.5 rounded-full bg-teal-600 dark:bg-teal-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-slate-900 dark:text-white font-bold w-11 text-right text-[11px]">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fused Phenotype Summary Pill */}
              <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400">Fused Phenotype:</span>
                <span className="font-extrabold text-teal-800 dark:text-teal-300 capitalize text-sm">
                  {fusion.fusedColor} Hair{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    ({((fusion.fused[fusion.fusedColor] || 0) * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <LiquidButton
              onClick={() => navigate('/generate')}
              variant="teal"
              className="w-full py-3 shadow-sm"
              icon={<ArrowRight className="w-4 h-4 text-teal-600 dark:text-teal-300" />}
            >
              Proceed to Facial Synthesis &rarr;
            </LiquidButton>
          </div>
        </div>
      </div>
    </div>
  );
}
