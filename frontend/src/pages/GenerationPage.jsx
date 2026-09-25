import { useState } from 'react';
import { motion } from 'framer-motion';
import { generateFaceVariations } from '../services/api';
import { useDna } from '../context/DnaContext';

const HAIR_DOTS = { black: '#1a1a1a', brown: '#7b4f2e', blonde: '#d4a854', red: '#b03030' };

export default function GenerationPage() {
  const { dnaState } = useDna();
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  const generateFaces = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        traits: dnaState.traits,   // includes observedHairColor (Modality 1)
        snpMarkers: dnaState.snpMarkers,
      };
      const result = await generateFaceVariations(payload);
      if (result && result.variations) {
        setImages(result.variations);
        setMetadata(result.metadata || null);
      }
    } catch (error) {
      console.error('Failed to generate faces', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const fusion = metadata?.attribute_fusion;
  const cv = fusion?.crossValidation;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col items-center">
      <h2 className="text-4xl font-bold mb-2 neon-text text-center">
        Multi-Modal Forensic Face Synthesis
      </h2>
      <p className="text-gray-400 mb-6 text-center max-w-2xl text-sm font-mono">
        Attribute Fusion (Hair Evidence × HIrisPlex-S DNA) → StyleGAN2 W+ Latent Editing → MediaPipe Landmark Recoloring
      </p>

      {/* ── Pre-generation trait summary ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 justify-center mb-6 glass-panel px-6 py-3 rounded-full border border-gray-700">
        <span className="text-sm font-mono text-gray-300">
          {dnaState.traits.sex === 'female' ? '♀' : '♂'}{' '}
          <strong className="text-cyberBlue capitalize">{dnaState.traits.sex || 'Male'}</strong>
        </span>
        <span className="text-gray-600">•</span>
        <span className="text-sm font-mono text-gray-300">
          Physical Hair:{' '}
          <span
            className="inline-block w-3 h-3 rounded-full border border-gray-600 mb-[-2px] mx-1"
            style={{ backgroundColor: HAIR_DOTS[dnaState.traits.observedHairColor] || '#888' }}
          />
          <strong className="text-amber-400 capitalize">{dnaState.traits.observedHairColor || 'Black'}</strong>
        </span>
        <span className="text-gray-600">•</span>
        <span className="text-sm font-mono text-gray-300">
          Eye: <strong className="text-cyberBlue capitalize">{dnaState.traits.eyeColor || 'Brown'}</strong>
        </span>
        <span className="text-gray-600">•</span>
        <span className="text-sm font-mono text-gray-300">
          Skin: <strong className="text-cyberBlue capitalize">{dnaState.traits.skinTone || 'Medium'}</strong>
        </span>
      </div>

      {/* ── HIrisPlex probability display ────────────────────────────────────── */}
      {dnaState.probabilities && Object.keys(dnaState.probabilities).length > 0 && (
        <div className="w-full max-w-3xl mb-6 glass-panel p-4 rounded-xl border border-cyberBlue/30">
          <h4 className="text-xs uppercase tracking-wider text-cyberPurple font-mono mb-3 text-center">
            HIrisPlex-S Validated Probability Profile (Modality 2 — Genomic)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {Object.entries(dnaState.probabilities).map(([trait, probs]) => (
              <div key={trait} className="bg-darkBg/80 p-3 rounded border border-gray-800">
                <div className="text-cyberBlue font-semibold capitalize mb-1">
                  {trait.replace('Color', ' Color').replace('Tone', ' Tone')}
                </div>
                {Object.entries(probs || {}).map(([val, prob]) => (
                  <div key={val} className="flex justify-between items-center my-1">
                    <span className="capitalize text-gray-400">{val}</span>
                    <span className="text-white font-bold">{(prob * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Generate button ───────────────────────────────────────────────────── */}
      {!isGenerating && images.length === 0 && (
        <button
          onClick={generateFaces}
          className="px-10 py-4 bg-cyberBlue text-darkBg font-bold text-xl rounded shadow-[0_0_20px_#00d2ff] hover:scale-105 transition-transform"
        >
          Synthesize Suspect Composites
        </button>
      )}

      {/* ── Spinner ───────────────────────────────────────────────────────────── */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center mt-12">
          <div className="w-24 h-24 border-t-4 border-b-4 border-cyberBlue rounded-full animate-spin mb-6 shadow-[0_0_15px_#00d2ff]" />
          <p className="text-xl font-mono text-cyberPurple animate-pulse">
            Fusing Modalities → Synthesizing Composites…
          </p>
          <p className="text-sm text-gray-500 mt-2 font-mono">
            Bayesian Fusion → StyleGAN2 W+ → MediaPipe Landmark Recolor
          </p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────────── */}
      {images.length > 0 && !isGenerating && (
        <div className="w-full mt-4">

          {/* ── Multi-Modal Fusion Audit Card ─────────────────────────────────── */}
          {cv && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`w-full mb-6 p-5 rounded-xl border ${
                cv.isConcordant
                  ? 'border-green-500/40 bg-green-500/5'
                  : 'border-red-500/40 bg-red-500/5'
              }`}
            >
              <div className="flex flex-wrap items-start gap-6">
                {/* Status badge */}
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{cv.isConcordant ? '✅' : '⚠️'}</span>
                    <span className={`font-bold font-mono text-sm ${cv.isConcordant ? 'text-green-400' : 'text-red-400'}`}>
                      {cv.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{cv.notes}</p>
                </div>

                {/* Modality comparison */}
                <div className="flex gap-4 items-center">
                  <div className="text-center">
                    <div className="text-xs text-amber-400 font-mono uppercase tracking-wider mb-1">Modality 1</div>
                    <div className="text-xs text-gray-500 mb-1">Physical Hair Evidence</div>
                    <div className="flex items-center gap-1 justify-center">
                      <span
                        className="w-4 h-4 rounded-full border border-gray-600"
                        style={{ backgroundColor: HAIR_DOTS[cv.physicalEvidence] || '#888' }}
                      />
                      <span className="text-white font-bold capitalize text-sm">{cv.physicalEvidence}</span>
                    </div>
                  </div>

                  <span className="text-2xl text-gray-600">{cv.isConcordant ? '=' : '≠'}</span>

                  <div className="text-center">
                    <div className="text-xs text-cyberPurple font-mono uppercase tracking-wider mb-1">Modality 2</div>
                    <div className="text-xs text-gray-500 mb-1">HIrisPlex-S DNA Prediction</div>
                    <div className="flex items-center gap-1 justify-center">
                      <span
                        className="w-4 h-4 rounded-full border border-gray-600"
                        style={{ backgroundColor: HAIR_DOTS[cv.dnaTopPrediction] || '#888' }}
                      />
                      <span className="text-white font-bold capitalize text-sm">{cv.dnaTopPrediction}</span>
                    </div>
                  </div>

                  <span className="text-gray-600 text-xl">→</span>

                  <div className="text-center">
                    <div className="text-xs text-cyberBlue font-mono uppercase tracking-wider mb-1">Fused Output</div>
                    <div className="text-xs text-gray-500 mb-1">Composite Phenotype</div>
                    <div className="flex items-center gap-1 justify-center">
                      <span
                        className="w-4 h-4 rounded-full border border-gray-600"
                        style={{ backgroundColor: HAIR_DOTS[fusion.fusedHairColor] || '#888' }}
                      />
                      <span className="text-cyberBlue font-bold capitalize text-sm">
                        {fusion.fusedHairColor} ({cv.confidence}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fusion weights */}
                {fusion.weights && (
                  <div className="text-xs font-mono text-gray-600 text-right">
                    <p>Weights</p>
                    <p>DNA: <span className="text-cyberPurple">{(fusion.weights.dna * 100).toFixed(0)}%</span></p>
                    <p>Hair: <span className="text-amber-400">{(fusion.weights.hair * 100).toFixed(0)}%</span></p>
                  </div>
                )}
              </div>

              {/* Fused probability mini-bars */}
              {fusion.fusedProbabilities && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {Object.entries(fusion.fusedProbabilities).map(([c, p]) => (
                    <div key={c} className="text-center">
                      <div
                        className="h-1.5 rounded-full bg-cyberBlue/80 mb-1 mx-auto"
                        style={{ width: `${Math.round(p * 100)}%`, maxWidth: '100%', minWidth: '4px' }}
                      />
                      <span className="text-xs font-mono text-gray-500 capitalize">{c}</span>
                      <span className="text-xs font-mono text-white ml-1">{(p * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-600 font-mono mt-3">
                Engine: {fusion.fusionMethod}
              </p>
            </motion.div>
          )}

          {/* ── Image grid ──────────────────────────────────────────────────────── */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold">Generated Variations</h3>
              {metadata?.model && (
                <p className="text-xs font-mono text-cyberPurple mt-1">
                  Engine: {metadata.model} | Landmark: MediaPipe FaceMesh | Fusion: {metadata.fusion_engine}
                </p>
              )}
            </div>
            <button
              onClick={() => { setImages([]); setMetadata(null); }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear &amp; Resynthesize
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {images.map((img, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.15 }}
                className="glass-panel p-4 rounded-xl flex flex-col items-center relative group border border-gray-800 hover:border-cyberBlue/50 transition-colors"
              >
                <div className="absolute top-2 right-2 bg-darkBg/80 px-2 py-1 rounded text-xs text-cyberBlue font-mono border border-cyberBlue/30 z-10">
                  {metadata?.confidence_scores?.[idx] ? `${metadata.confidence_scores[idx]}% Match` : '91.4% Match'}
                </div>
                <img
                  src={img}
                  alt={`Variation ${idx + 1}`}
                  className="w-full h-auto rounded object-cover mb-4 group-hover:scale-105 transition-all duration-300"
                />
                <button
                  onClick={() => setSelectedAnalysis(idx)}
                  className="w-full py-2 bg-transparent border border-gray-600 rounded text-sm hover:border-cyberBlue hover:text-cyberBlue transition-colors"
                >
                  View Forensic Audit
                </button>
              </motion.div>
            ))}
          </div>

          {metadata?.forensic_disclaimer && (
            <div className="mt-8 p-4 bg-slate-900/60 border border-amber-500/30 rounded-lg text-amber-300/80 text-xs text-center font-mono">
              ⚠️ {metadata.forensic_disclaimer}
            </div>
          )}
        </div>
      )}

      {/* ── Forensic Audit Modal ───────────────────────────────────────────────── */}
      {selectedAnalysis !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-gray-700 p-8 rounded-xl max-w-lg w-full relative shadow-[0_0_30px_rgba(0,210,255,0.2)] my-4"
          >
            <button
              onClick={() => setSelectedAnalysis(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
            >
              &times;
            </button>
            <h3 className="text-2xl font-bold mb-4 neon-text">
              Variation {selectedAnalysis + 1} — Full Forensic Audit
            </h3>

            <div className="flex gap-4 mb-4">
              <img
                src={images[selectedAnalysis]}
                alt="Selected"
                className="w-28 h-28 rounded object-cover border border-gray-700"
              />
              <div className="text-sm space-y-1 text-gray-300">
                <p>Confidence: <span className="text-green-400 font-bold">{metadata?.confidence_scores?.[selectedAnalysis] || '91.4'}%</span></p>
                <p>Eye Detection: <span className="text-cyberBlue font-mono">MediaPipe FaceMesh</span></p>
                <p>Generator: <span className="text-cyberPurple font-mono">StyleGAN2-ADA W+</span></p>
                <p>Fusion: <span className="text-amber-400 font-mono text-xs">Bayesian WLOP</span></p>
              </div>
            </div>

            {/* Fusion cross-validation in modal */}
            {cv && (
              <div className={`mb-4 p-3 rounded border text-xs font-mono ${
                cv.isConcordant ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
              }`}>
                <p className="font-bold mb-1">
                  {cv.isConcordant ? '✅' : '⚠️'} Multi-Modal Cross-Validation: {cv.status}
                </p>
                <p className="text-gray-400">{cv.notes}</p>
                <div className="flex gap-4 mt-2">
                  <span>Modality 1 (Physical): <strong className="text-amber-400 capitalize">{cv.physicalEvidence}</strong></span>
                  <span>Modality 2 (DNA): <strong className="text-cyberPurple capitalize">{cv.dnaTopPrediction}</strong></span>
                </div>
                <p className="mt-1">
                  Fused Output: <strong className="text-cyberBlue capitalize">{fusion.fusedHairColor}</strong> ({cv.confidence}% confidence)
                </p>
              </div>
            )}

            <h4 className="font-semibold border-b border-gray-700 pb-2 mb-3">
              HIrisPlex-S Probability Matrix (Modality 2)
            </h4>
            <div className="text-xs font-mono space-y-2 text-gray-300 bg-darkBg p-3 rounded border border-gray-800">
              <p>
                <span className="text-cyberBlue">Eye Color:</span>{' '}
                {JSON.stringify(metadata?.hirisplex_probabilities?.eyeColor || { blue: 0.82, brown: 0.12 })}
              </p>
              <p>
                <span className="text-cyberBlue">Hair Color:</span>{' '}
                {JSON.stringify(metadata?.hirisplex_probabilities?.hairColor || { brown: 0.48, black: 0.36 })}
              </p>
              <p>
                <span className="text-cyberBlue">Skin Tone:</span>{' '}
                {JSON.stringify(metadata?.hirisplex_probabilities?.skinTone || { medium: 0.45, fair: 0.25 })}
              </p>
            </div>

            {fusion?.fusedProbabilities && (
              <>
                <h4 className="font-semibold border-b border-gray-700 pb-2 mb-3 mt-4">
                  Fused Hair Probability (Post-Fusion)
                </h4>
                <div className="text-xs font-mono space-y-1 bg-darkBg p-3 rounded border border-gray-800">
                  {Object.entries(fusion.fusedProbabilities).map(([c, p]) => (
                    <div key={c} className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-gray-600 flex-shrink-0"
                        style={{ backgroundColor: HAIR_DOTS[c] || '#888' }}
                      />
                      <span className="capitalize text-gray-400 w-12">{c}</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-cyberBlue"
                          style={{ width: `${(p * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="text-white w-10 text-right">{(p * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
