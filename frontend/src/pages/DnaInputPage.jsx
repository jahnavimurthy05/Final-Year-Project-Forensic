import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { generateSyntheticDna as fetchDnaProfile } from '../services/api';
import { useDna } from '../context/DnaContext';
import LiquidButton from '../components/ui/LiquidButton';
import { Dna, ArrowRight, Sparkles } from 'lucide-react';

// ─── Utility ─────────────────────────────────────────────────────────────────
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

  // Must mirror attribute_fusion_service.js: DNA is dominant (0.80), physical is weak prior (0.20)
  const wDna = 0.8;
  const wHair = 0.2;
  const gamma = 0.5; // physical evidence is a weak prior
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

// ─── Component ────────────────────────────────────────────────────────────────
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
      {/* Page header */}
      <h2 className="text-3xl sm:text-4xl font-extrabold mb-2 text-slate-900 dark:text-white neon-text tracking-tight">
        Multi-Modal Forensic Phenotyping
      </h2>
      <p className="text-slate-600 dark:text-gray-400 text-xs sm:text-sm mb-8 font-mono leading-relaxed">
        Attribute Fusion from Physical Hair Evidence (Modality 1) × Synthetic DNA / HIrisPlex-S (Modality 2)
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* ── MODALITY 1: Physical Hair Evidence ─────────────────────────────── */}
        <div className="glass-panel p-6 rounded-2xl border border-amber-500/40 shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-500 text-xl">🔬</span>
            <span className="text-xs font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold">
              Modality 1
            </span>
          </div>
          <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-amber-300">Physical Hair Evidence</h3>
          <p className="text-xs text-slate-600 dark:text-gray-400 mb-5 leading-relaxed">
            Macroscopic / microscopic hair traits documented from the crime-scene evidence record. Extracted from the
            recovered hair strand — no image upload required.
          </p>

          <div className="space-y-5">
            {/* Observed Hair Colour */}
            <div>
              <label className="block text-slate-800 dark:text-gray-300 font-semibold text-sm mb-2">
                Observed Hair Colour{' '}
                <span className="text-amber-600 dark:text-amber-400 text-xs font-mono">(crime-scene record)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {HAIR_CLASSES.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleTraitChange('observedHairColor', c)}
                    className={`py-2 px-3 rounded-xl border-2 font-bold text-xs sm:text-sm capitalize flex items-center justify-center gap-2 transition-all duration-200 shadow-sm ${
                      observedHair === c
                        ? 'border-amber-500 bg-amber-500/20 text-amber-900 dark:text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                        : 'border-slate-300 dark:border-gray-800 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-gray-400 hover:border-slate-400 dark:hover:border-gray-600'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full inline-block border border-slate-400 dark:border-gray-600 shadow-sm"
                      style={{ backgroundColor: HAIR_DOTS[c] }}
                    />
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence source label */}
            <div>
              <label className="block text-slate-800 dark:text-gray-300 font-semibold text-sm mb-2">
                Evidence Source
              </label>
              <div className="bg-slate-100 dark:bg-darkBg border border-slate-200 dark:border-gray-800 rounded-xl p-3.5 text-xs font-mono text-slate-700 dark:text-gray-400 space-y-1">
                <p>📋 Type: Trace Hair Sample</p>
                <p>🔬 Analysis: Macroscopic Colour Observation</p>
                <p>📁 Collection: Crime-Scene Forensic Record</p>
                <p>🧪 Cellular Tag: Follicular Root Sheath</p>
              </div>
            </div>

            {/* Observed Physical Sex */}
            <div>
              <label className="block text-slate-800 dark:text-gray-300 font-semibold text-sm mb-2">
                Observed Sex{' '}
                <span className="text-amber-600 dark:text-amber-400 text-xs font-mono">
                  (witness / scene observation)
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['male', 'female'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleTraitChange('sex', opt)}
                    className={`py-2 px-3 rounded-xl border-2 font-bold text-xs sm:text-sm capitalize transition-all duration-200 shadow-sm ${
                      dnaState.traits.sex === opt
                        ? 'border-amber-500 bg-amber-500/20 text-amber-900 dark:text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                        : 'border-slate-300 dark:border-gray-800 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-gray-400 hover:border-slate-400 dark:hover:border-gray-600'
                    }`}
                  >
                    {opt === 'male' ? '♂ Male' : '♀ Female'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-800 dark:text-gray-300 font-semibold text-sm mb-2">Skin Tone</label>
              <select
                value={dnaState.traits.skinTone || 'medium'}
                onChange={(e) => handleTraitChange('skinTone', e.target.value)}
                className="w-full bg-slate-50 dark:bg-darkBg border border-slate-300 dark:border-gray-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-sm font-medium focus:border-teal-500 outline-none shadow-sm"
              >
                {['fair', 'medium', 'olive', 'brown', 'dark'].map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-800 dark:text-gray-300 font-semibold text-sm mb-2">Eye Colour</label>
              <select
                value={dnaState.traits.eyeColor || 'brown'}
                onChange={(e) => handleTraitChange('eyeColor', e.target.value)}
                className="w-full bg-slate-50 dark:bg-darkBg border border-slate-300 dark:border-gray-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-sm font-medium focus:border-teal-500 outline-none shadow-sm"
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

        {/* ── MODALITY 2: Synthetic DNA / HIrisPlex-S ─────────────────────────── */}
        <div className="glass-panel p-6 rounded-2xl border border-purple-500/40 shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-500 text-xl">🧬</span>
            <span className="text-xs font-mono uppercase tracking-widest text-purple-700 dark:text-purple-400 font-bold">
              Modality 2
            </span>
          </div>
          <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-purple-300">Synthetic DNA Profile</h3>
          <p className="text-xs text-slate-600 dark:text-gray-400 mb-5 leading-relaxed">
            Forensic SNP markers (rs12913832, rs1800407, …) extracted from the hair follicle root. Privacy-safe
            synthetic equivalents are generated via the HIrisPlex-S protocol.
          </p>

          {/* DNA Biological Sex Selector / Indicator */}
          <div className="mb-4 bg-slate-100 dark:bg-darkBg p-3.5 rounded-xl border border-slate-200 dark:border-gray-800">
            <label className="block text-slate-800 dark:text-gray-300 text-xs font-mono font-bold mb-2">
              DNA Biological Sex (Chromosomal AMEL Locus)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['male', 'female'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleTraitChange('dnaSex', opt)}
                  className={`py-2 rounded-lg border-2 text-xs font-mono font-bold capitalize transition-all shadow-sm ${
                    (dnaState.traits.dnaSex || 'male') === opt
                      ? 'border-purple-600 bg-purple-500/20 text-purple-900 dark:text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                      : 'border-slate-300 dark:border-gray-800 bg-white/80 dark:bg-darkBg text-slate-700 dark:text-gray-400 hover:border-slate-400 dark:hover:border-gray-700'
                  }`}
                >
                  {opt === 'male' ? '♂ Male (XY)' : '♀ Female (XX)'}
                </button>
              ))}
            </div>
          </div>

          {/* SNP marker display */}
          <div className="bg-slate-100 dark:bg-darkBg p-4 rounded-xl border border-slate-200 dark:border-gray-800 min-h-[90px] font-mono text-xs flex flex-col justify-center gap-1.5 mb-4 shadow-inner">
            {dnaState.snpMarkers && dnaState.snpMarkers.length > 0 ? (
              dnaState.snpMarkers.map((m, i) => (
                <div key={i} className="flex justify-between items-center py-0.5 border-b border-slate-200 dark:border-gray-800/60 last:border-none">
                  <span className="text-slate-700 dark:text-gray-400 font-medium">{m.marker}</span>
                  <span className="text-teal-700 dark:text-cyan-400 font-extrabold">{m.allele}</span>
                </div>
              ))
            ) : (
              <span className="text-slate-500 dark:text-gray-500 text-center font-medium">
                No markers synthesized yet. Click below →
              </span>
            )}
          </div>

          {/* HIrisPlex probability table */}
          {dnaState.probabilities && Object.keys(dnaState.probabilities).length > 0 && (
            <div className="mb-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-gray-800">
              <p className="text-xs uppercase tracking-wider text-purple-700 dark:text-purple-400 font-mono font-bold mb-2">
                HIrisPlex-S Probability Output
              </p>
              <div className="space-y-1.5">
                {Object.entries(dnaState.probabilities).map(([trait, probs]) => {
                  const top = Object.entries(probs || {}).reduce((a, b) => (b[1] > a[1] ? b : a), ['—', 0]);
                  return (
                    <div key={trait} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-700 dark:text-gray-400 font-medium capitalize">
                        {trait.replace('Color', ' Color').replace('Tone', ' Tone')}
                      </span>
                      <span className="text-purple-800 dark:text-purple-300 font-bold capitalize">
                        {top[0]} <span className="text-slate-900 dark:text-slate-300 font-extrabold">({(top[1] * 100).toFixed(1)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <LiquidButton
            onClick={generateSyntheticDna}
            disabled={isLoading}
            variant="purple"
            className="w-full py-3.5 mt-2 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
            icon={<Dna className="w-4 h-4 text-purple-300" />}
          >
            {isLoading ? 'Synthesizing SNP Profile...' : 'Synthesize HIrisPlex-S Markers'}
          </LiquidButton>
        </div>

        {/* ── ATTRIBUTE FUSION STATUS ──────────────────────────────────────────── */}
        <div className="glass-panel p-6 rounded-2xl border border-teal-500/40 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-teal-500 text-xl">⚡</span>
              <span className="text-xs font-mono uppercase tracking-widest text-teal-700 dark:text-cyan-400 font-bold">
                Fusion Engine
              </span>
            </div>
            <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-cyan-300">Attribute Fusion</h3>
            <p className="text-xs text-slate-600 dark:text-gray-400 mb-5 leading-relaxed">
              Bayesian Weighted Log-Opinion Pool cross-validates the two modalities. Concordance is verified or a
              forensic alert is raised before synthesis.
            </p>

            {/* Concordance Badge */}
            <motion.div
              key={`${observedHair}-${fusion.fusedColor}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl p-4 border mb-4 shadow-sm ${
                fusion.concordant
                  ? 'border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/20'
                  : 'border-rose-500/40 bg-rose-50/80 dark:bg-rose-950/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-lg ${fusion.concordant ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {fusion.concordant ? '✅' : '⚠️'}
                </span>
                <span
                  className={`text-xs sm:text-sm font-bold font-mono ${
                    fusion.concordant
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {fusion.isCanities
                    ? 'CANITIES VERIFIED (AGE RECONCILED)'
                    : fusion.concordant
                    ? 'CONCORDANT — VERIFIED'
                    : 'DISCORDANCE DETECTED'}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed font-medium">
                {fusion.isCanities
                  ? `Physical evidence displays age-related white/grey hair (canities), while DNA reveals natural baseline (${
                      fusion.dnaTop || 'dark'
                    }). Composite reconciled with age-adjusted white/grey phenotype.`
                  : fusion.concordant
                  ? `Physical evidence (${observedHair}) matches HIrisPlex-S genetic prediction (${fusion.dnaTop}). Composite confidence boosted.`
                  : `Physical evidence: ${observedHair} | DNA prediction: ${
                      fusion.dnaTop || '—'
                    }. Possible cosmetic alteration or DNA degradation.`}
              </p>
            </motion.div>

            {/* Sex Cross-Validation / Disguise Alert */}
            {dnaState.traits.sex !== (dnaState.traits.dnaSex || 'male') ? (
              <div className="rounded-xl p-3.5 border border-amber-500/40 bg-amber-500/10 mb-4 text-xs font-mono shadow-sm">
                <span className="text-amber-700 dark:text-amber-300 font-bold">🕵️ DISGUISE DETECTED:</span>
                <p className="mt-1 text-slate-800 dark:text-gray-300 leading-relaxed">
                  Suspect is a{' '}
                  <strong className="text-purple-700 dark:text-purple-400 capitalize">
                    {dnaState.traits.dnaSex || 'male'} ({dnaState.traits.dnaSex === 'female' ? 'XX' : 'XY'})
                  </strong>{' '}
                  disguised with <strong className="text-amber-700 dark:text-amber-300 capitalize">{dnaState.traits.sex} presentation</strong>.
                </p>
              </div>
            ) : (
              <div className="rounded-xl p-2.5 border border-emerald-500/30 bg-emerald-500/10 mb-4 text-xs font-mono text-emerald-800 dark:text-emerald-400 flex items-center gap-2 shadow-sm font-semibold">
                <span>✅</span>
                <span>Sex Concordant: Observation matches DNA biological sex ({dnaState.traits.sex}).</span>
              </div>
            )}

            {/* Fused probability bars */}
            <div className="space-y-2 mb-4 bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-gray-800">
              <p className="text-xs uppercase tracking-wider text-teal-700 dark:text-cyan-400 font-mono font-bold mb-2">
                Fused Hair Probabilities
              </p>
              {HAIR_CLASSES.map((c) => {
                const pct = ((fusion.fused[c] || 0) * 100).toFixed(1);
                return (
                  <div key={c} className="flex items-center gap-2 text-xs font-mono">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-400 dark:border-gray-600 flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: HAIR_DOTS[c] }}
                    />
                    <span className="capitalize text-slate-700 dark:text-gray-300 font-semibold w-14">{c}</span>
                    <div className="flex-1 bg-slate-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-teal-500 dark:bg-cyan-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-slate-900 dark:text-cyan-300 font-extrabold w-12 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>

            {/* Final fused trait */}
            <div className="bg-slate-100 dark:bg-darkBg border border-slate-300 dark:border-gray-700 rounded-xl p-3 text-xs font-mono shadow-sm">
              <span className="text-slate-600 dark:text-gray-400 font-medium">Fused Phenotype →</span>{' '}
              <span className="text-teal-800 dark:text-white font-extrabold capitalize">{fusion.fusedColor} Hair</span>
              <span className="text-slate-600 dark:text-gray-400 ml-1 font-semibold">
                ({((fusion.fused[fusion.fusedColor] || 0) * 100).toFixed(1)}% posterior)
              </span>
            </div>
          </div>

          <div className="mt-6">
            <LiquidButton
              onClick={() => navigate('/generate')}
              variant="teal"
              className="w-full py-3.5 shadow-[0_0_20px_rgba(20,184,166,0.35)]"
              icon={<ArrowRight className="w-4 h-4 text-teal-300" />}
            >
              Proceed to Facial Synthesis →
            </LiquidButton>
          </div>
        </div>
      </div>
    </div>
  );
}
