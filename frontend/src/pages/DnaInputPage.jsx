import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { generateSyntheticDna as fetchDnaProfile } from '../services/api';
import { useDna } from '../context/DnaContext';

// ─── Utility ─────────────────────────────────────────────────────────────────
const HAIR_CLASSES = ['black', 'brown', 'blonde', 'red'];
const HAIR_DOTS = { black: '#1a1a1a', brown: '#7b4f2e', blonde: '#d4a854', red: '#b03030' };

/**
 * Client-side Bayesian attribute fusion preview.
 * Mirrors the server-side logic in attribute_fusion_service.js so the user sees
 * live concordance feedback before hitting Generate.
 */
function computeFusionPreview(observedHairColor, dnaHairProbs = {}) {
  const obs = (observedHairColor || 'brown').toLowerCase();
  const wDna = 0.60;
  const wHair = 0.40;
  const gamma = 0.85;
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

  let best = 'black', maxP = -1;
  const fused = {};
  HAIR_CLASSES.forEach((c) => {
    fused[c] = total > 0 ? raw[c] / total : 0.25;
    if (fused[c] > maxP) { maxP = fused[c]; best = c; }
  });

  const dnaTop = Object.entries(dnaHairProbs).reduce((a, b) => b[1] > a[1] ? b : a, ['unknown', 0])[0];
  const concordant = dnaTop === obs;
  return { fused, fusedColor: best, dnaTop, concordant };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DnaInputPage() {
  const navigate = useNavigate();
  const { dnaState, updateTraits, setFullProfile } = useDna();
  const [isLoading, setIsLoading] = useState(false);

  const hairColor      = dnaState.traits.hairColor      || 'black';
  const observedHair   = dnaState.traits.observedHairColor || 'black';
  const dnaHairProbs   = dnaState.probabilities?.hairColor || {};

  const fusion = computeFusionPreview(observedHair, dnaHairProbs);

  const handleTraitChange = (key, value) => updateTraits({ [key]: value });

  const generateSyntheticDna = async () => {
    setIsLoading(true);
    try {
      const profile = await fetchDnaProfile();
      if (profile) setFullProfile(profile);
    } catch {
      setFullProfile({
        snpMarkers: [
          { marker: 'rs12913832', allele: 'AG' },
          { marker: 'rs1800407',  allele: 'GG' },
        ],
        traits: { hairColor: 'brown', eyeColor: 'hazel', skinTone: 'medium', observedHairColor: 'brown' },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Colour pill helper
  const HAIR_DOTS = { black: '#1a1a1a', brown: '#7b4f2e', blonde: '#d4a854', red: '#b03030' };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Page header */}
      <h2 className="text-4xl font-bold mb-2 neon-text">
        Multi-Modal Forensic Phenotyping
      </h2>
      <p className="text-gray-400 text-sm mb-8 font-mono">
        Attribute Fusion from Physical Hair Evidence (Modality 1) × Synthetic DNA / HIrisPlex-S (Modality 2)
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── MODALITY 1: Physical Hair Evidence ─────────────────────────────── */}
        <div className="glass-panel p-6 rounded-xl border border-amber-500/30">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-400 text-xl">🔬</span>
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400">Modality 1</span>
          </div>
          <h3 className="text-xl font-bold mb-1 text-amber-300">Physical Hair Evidence</h3>
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">
            Macroscopic / microscopic hair traits documented from the crime-scene evidence record.
            Extracted from the recovered hair strand — no image upload required.
          </p>

          <div className="space-y-5">
            {/* Observed Hair Colour */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Observed Hair Colour <span className="text-amber-400 text-xs">(crime-scene record)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {HAIR_CLASSES.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleTraitChange('observedHairColor', c)}
                    className={`py-2 rounded-lg border-2 font-semibold text-sm capitalize flex items-center justify-center gap-2 transition-all duration-200 ${
                      observedHair === c
                        ? 'border-amber-400 bg-amber-400/10 text-amber-300 shadow-[0_0_10px_#fbbf24]'
                        : 'border-gray-700 bg-darkBg text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full inline-block border border-gray-600"
                      style={{ backgroundColor: HAIR_DOTS[c] }}
                    />
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence source label */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Evidence Source</label>
              <div className="bg-darkBg border border-gray-800 rounded p-3 text-xs font-mono text-gray-500">
                <p>📋 Type: Trace Hair Sample</p>
                <p>🔬 Analysis: Macroscopic Colour Observation</p>
                <p>📁 Collection: Crime-Scene Forensic Record</p>
                <p>🧪 Cellular Tag: Follicular Root Sheath</p>
              </div>
            </div>

            {/* Other morphological traits */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Biological Sex</label>
              <div className="grid grid-cols-2 gap-2">
                {['male', 'female'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleTraitChange('sex', opt)}
                    className={`py-2 rounded-lg border-2 font-bold text-sm capitalize transition-all duration-200 ${
                      dnaState.traits.sex === opt
                        ? 'border-cyberBlue bg-cyberBlue/20 text-cyberBlue shadow-[0_0_12px_#00d2ff]'
                        : 'border-gray-700 bg-darkBg text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {opt === 'male' ? '♂ Male' : '♀ Female'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Face Shape</label>
              <select
                value={dnaState.traits.faceShape || 'oval'}
                onChange={(e) => handleTraitChange('faceShape', e.target.value)}
                className="w-full bg-darkBg border border-gray-700 rounded p-2 text-white text-sm focus:border-cyberBlue outline-none"
              >
                {['oval', 'round', 'square', 'heart'].map(s => (
                  <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Skin Tone</label>
              <select
                value={dnaState.traits.skinTone || 'medium'}
                onChange={(e) => handleTraitChange('skinTone', e.target.value)}
                className="w-full bg-darkBg border border-gray-700 rounded p-2 text-white text-sm focus:border-cyberBlue outline-none"
              >
                {['fair', 'medium', 'olive', 'brown', 'dark'].map(s => (
                  <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Eye Colour</label>
              <select
                value={dnaState.traits.eyeColor || 'brown'}
                onChange={(e) => handleTraitChange('eyeColor', e.target.value)}
                className="w-full bg-darkBg border border-gray-700 rounded p-2 text-white text-sm focus:border-cyberBlue outline-none"
              >
                {['brown', 'blue', 'green', 'hazel', 'black'].map(s => (
                  <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── MODALITY 2: Synthetic DNA / HIrisPlex-S ─────────────────────────── */}
        <div className="glass-panel p-6 rounded-xl border border-cyberPurple/40">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-cyberPurple text-xl">🧬</span>
            <span className="text-xs font-mono uppercase tracking-widest text-cyberPurple">Modality 2</span>
          </div>
          <h3 className="text-xl font-bold mb-1 text-cyberPurple">Synthetic DNA Profile</h3>
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">
            Forensic SNP markers (rs12913832, rs1800407, …) extracted from the hair follicle root.
            Privacy-safe synthetic equivalents are generated via the HIrisPlex-S protocol.
          </p>

          {/* SNP marker display */}
          <div className="bg-darkBg p-4 rounded border border-gray-800 min-h-[80px] font-mono text-xs text-cyberBlue flex flex-col justify-center gap-1 mb-4">
            {dnaState.snpMarkers && dnaState.snpMarkers.length > 0 ? (
              dnaState.snpMarkers.map((m, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-500">{m.marker}</span>
                  <span className="text-cyberBlue font-bold">{m.allele}</span>
                </div>
              ))
            ) : (
              <span className="text-gray-600 text-center">No markers synthesized yet. Click below →</span>
            )}
          </div>

          {/* HIrisPlex probability table */}
          {dnaState.probabilities && Object.keys(dnaState.probabilities).length > 0 && (
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider text-gray-600 font-mono mb-2">HIrisPlex-S Output</p>
              <div className="space-y-2">
                {Object.entries(dnaState.probabilities).map(([trait, probs]) => {
                  const top = Object.entries(probs || {}).reduce((a, b) => b[1] > a[1] ? b : a, ['—', 0]);
                  return (
                    <div key={trait} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-500 capitalize">{trait.replace('Color', ' Color').replace('Tone', ' Tone')}</span>
                      <span className="text-cyberPurple font-bold capitalize">
                        {top[0]} <span className="text-gray-600">({(top[1] * 100).toFixed(1)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={generateSyntheticDna}
            disabled={isLoading}
            className="w-full py-3 bg-transparent border-2 border-cyberPurple text-cyberPurple hover:bg-cyberPurple hover:text-white font-bold rounded transition-colors disabled:opacity-50"
          >
            {isLoading ? '⏳ Synthesizing SNP Profile...' : '🧬 Synthesize HIrisPlex-S Markers'}
          </button>
        </div>

        {/* ── ATTRIBUTE FUSION STATUS ──────────────────────────────────────────── */}
        <div className="glass-panel p-6 rounded-xl border border-cyberBlue/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-cyberBlue text-xl">⚡</span>
              <span className="text-xs font-mono uppercase tracking-widest text-cyberBlue">Fusion Engine</span>
            </div>
            <h3 className="text-xl font-bold mb-1 text-cyberBlue">Attribute Fusion</h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Bayesian Weighted Log-Opinion Pool cross-validates the two modalities.
              Concordance is verified or a forensic alert is raised before synthesis.
            </p>

            {/* Concordance Badge */}
            <motion.div
              key={`${observedHair}-${fusion.fusedColor}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg p-4 border mb-4 ${
                fusion.concordant
                  ? 'border-green-500/40 bg-green-500/10'
                  : 'border-red-500/40 bg-red-500/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-lg ${fusion.concordant ? 'text-green-400' : 'text-red-400'}`}>
                  {fusion.concordant ? '✅' : '⚠️'}
                </span>
                <span className={`text-sm font-bold font-mono ${fusion.concordant ? 'text-green-400' : 'text-red-400'}`}>
                  {fusion.concordant ? 'CONCORDANT — VERIFIED' : 'DISCORDANCE DETECTED'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {fusion.concordant
                  ? `Physical evidence (${observedHair}) matches HIrisPlex-S genetic prediction (${fusion.dnaTop}). Composite confidence boosted.`
                  : `Physical evidence: ${observedHair} | DNA prediction: ${fusion.dnaTop || '—'}. Possible cosmetic alteration or DNA degradation.`
                }
              </p>
            </motion.div>

            {/* Fused probability bars */}
            <div className="space-y-2 mb-4">
              <p className="text-xs uppercase tracking-wider text-gray-600 font-mono mb-2">Fused Hair Probabilities</p>
              {HAIR_CLASSES.map((c) => {
                const pct = ((fusion.fused[c] || 0) * 100).toFixed(1);
                return (
                  <div key={c} className="flex items-center gap-2 text-xs font-mono">
                    <span
                      className="w-3 h-3 rounded-full border border-gray-600 flex-shrink-0"
                      style={{ backgroundColor: HAIR_DOTS[c] }}
                    />
                    <span className="capitalize text-gray-400 w-12">{c}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-cyberBlue transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-cyberBlue w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>

            {/* Final fused trait */}
            <div className="bg-darkBg border border-gray-700 rounded p-3 text-xs font-mono">
              <span className="text-gray-500">Fused Phenotype →</span>{' '}
              <span className="text-white font-bold capitalize">{fusion.fusedColor} Hair</span>
              <span className="text-gray-600 ml-2">
                ({((fusion.fused[fusion.fusedColor] || 0) * 100).toFixed(1)}% posterior confidence)
              </span>
            </div>
          </div>

          {/* Proceed button */}
          <button
            onClick={() => navigate('/generate')}
            className="w-full py-4 mt-6 bg-cyberBlue text-darkBg font-bold text-lg rounded shadow-[0_0_15px_#00d2ff] hover:scale-105 transition-transform"
          >
            Proceed to Facial Synthesis →
          </button>
        </div>
      </div>
    </div>
  );
}

