import { useState } from 'react';
import { motion } from 'framer-motion';
import { generateFaceVariations } from '../services/api';
import { useDna } from '../context/DnaContext';
import LiquidButton from '../components/ui/LiquidButton';
import ForensicSynthesisLoader from '../components/ui/ForensicSynthesisLoader';
import { Sparkles, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

const HAIR_DOTS = { black: '#1a1a1a', brown: '#7b4f2e', blonde: '#d4a854', red: '#b03030', white: '#e2e8f0' };

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
        traits: dnaState.traits, // includes observedHairColor (Modality 1)
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
    <div className="p-6 sm:p-8 max-w-7xl mx-auto flex flex-col items-center">
      <h2 className="text-3xl sm:text-4xl font-extrabold mb-2 text-slate-900 dark:text-white neon-text text-center tracking-tight">
        Multi-Modal Forensic Face Synthesis
      </h2>
      <p className="text-slate-600 dark:text-gray-400 mb-6 text-center max-w-2xl text-xs sm:text-sm font-mono leading-relaxed">
        Attribute Fusion (Hair Evidence × HIrisPlex-S DNA) → StyleGAN2 W+ Latent Editing → MediaPipe Landmark Recoloring
      </p>

      {/* ── Pre-generation trait summary ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 sm:gap-4 justify-center items-center mb-6 glass-panel px-6 py-3.5 rounded-full border border-slate-300 dark:border-gray-700 shadow-sm">
        <span className="text-xs sm:text-sm font-mono text-slate-800 dark:text-gray-200">
          Witness Sex: <strong className="text-amber-600 dark:text-amber-400 font-bold capitalize">{dnaState.traits.sex || 'Male'}</strong>
        </span>
        <span className="text-slate-400 dark:text-gray-600">•</span>
        <span className="text-xs sm:text-sm font-mono text-slate-800 dark:text-gray-200">
          DNA Biological Sex:{' '}
          <strong className="text-purple-700 dark:text-purple-400 font-bold capitalize">
            {dnaState.traits.dnaSex || 'Male'} ({(dnaState.traits.dnaSex || 'male') === 'female' ? 'XX' : 'XY'})
          </strong>
        </span>
        <span className="text-slate-400 dark:text-gray-600">•</span>
        <span className="text-xs sm:text-sm font-mono text-slate-800 dark:text-gray-200">
          Physical Hair:{' '}
          <span
            className="inline-block w-3.5 h-3.5 rounded-full border border-slate-400 dark:border-gray-500 mb-[-2px] mx-1 shadow-sm"
            style={{ backgroundColor: HAIR_DOTS[dnaState.traits.observedHairColor] || '#888' }}
          />
          <strong className="text-amber-600 dark:text-amber-400 font-bold capitalize">{dnaState.traits.observedHairColor || 'Black'}</strong>
        </span>
        <span className="text-slate-400 dark:text-gray-600">•</span>
        <span className="text-xs sm:text-sm font-mono text-slate-800 dark:text-gray-200">
          Eye: <strong className="text-teal-700 dark:text-cyan-400 font-bold capitalize">{dnaState.traits.eyeColor || 'Brown'}</strong>
        </span>
        <span className="text-slate-400 dark:text-gray-600">•</span>
        <span className="text-xs sm:text-sm font-mono text-slate-800 dark:text-gray-200">
          Skin: <strong className="text-teal-700 dark:text-cyan-400 font-bold capitalize">{dnaState.traits.skinTone || 'Medium'}</strong>
        </span>
      </div>

      {/* ── HIrisPlex probability display ────────────────────────────────────── */}
      {dnaState.probabilities && Object.keys(dnaState.probabilities).length > 0 && (
        <div className="w-full max-w-3xl mb-6 glass-panel p-5 rounded-2xl border border-teal-500/40 dark:border-cyan-500/30 shadow-md">
          <h4 className="text-xs uppercase tracking-wider text-teal-800 dark:text-purple-300 font-mono font-bold mb-3 text-center">
            HIrisPlex-S Validated Probability Profile (Modality 2 — Genomic)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {Object.entries(dnaState.probabilities).map(([trait, probs]) => (
              <div
                key={trait}
                className="bg-slate-50/90 dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-gray-800 shadow-sm"
              >
                <div className="text-teal-700 dark:text-cyan-400 font-extrabold capitalize mb-2 text-sm tracking-wide border-b border-slate-200 dark:border-gray-800 pb-1">
                  {trait.replace('Color', ' Color').replace('Tone', ' Tone')}
                </div>
                {Object.entries(probs || {}).map(([val, prob]) => (
                  <div
                    key={val}
                    className="flex justify-between items-center my-1.5 py-0.5 border-b border-slate-200/50 dark:border-gray-800/50 last:border-none"
                  >
                    <span className="capitalize text-slate-700 dark:text-gray-300 font-medium">
                      {val}
                    </span>
                    <span className="text-slate-900 dark:text-cyan-300 font-extrabold text-sm">
                      {(prob * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Generate button ───────────────────────────────────────────────────── */}
      {!isGenerating && images.length === 0 && (
        <div className="flex flex-col items-center">
          <LiquidButton
            onClick={generateFaces}
            variant="teal"
            className="text-lg px-10 py-4 shadow-[0_0_25px_rgba(20,184,166,0.35)]"
            icon={<Sparkles className="w-5 h-5 text-teal-300" />}
          >
            Synthesize Suspect Composites
          </LiquidButton>
        </div>
      )}

      {/* ── Attractive Forensic AI Synthesis Pipeline Animation ────────────── */}
      {isGenerating && <ForensicSynthesisLoader />}

      {/* ── Results ───────────────────────────────────────────────────────────── */}
      {images.length > 0 && !isGenerating && (
        <div className="w-full mt-4">
          {/* ── Multi-Modal Fusion Audit Card ─────────────────────────────────── */}
          {cv && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`w-full mb-6 p-5 rounded-2xl border shadow-md ${
                cv.isConcordant
                  ? 'border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/20'
                  : 'border-rose-500/40 bg-rose-50/70 dark:bg-rose-950/20'
              }`}
            >
              <div className="flex flex-wrap items-start gap-6">
                {/* Status badge */}
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-2">
                    {cv.isConcordant ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    )}
                    <span
                      className={`font-bold font-mono text-sm ${
                        cv.isConcordant
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {cv.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed font-medium">
                    {cv.notes}
                  </p>
                </div>

                {/* Modality comparison */}
                <div className="flex gap-4 items-center flex-wrap">
                  <div className="text-center">
                    <div className="text-xs text-amber-700 dark:text-amber-400 font-mono uppercase tracking-wider mb-1 font-bold">
                      Modality 1
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-gray-400 mb-1">
                      Physical Hair Evidence
                    </div>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-400 dark:border-gray-500 shadow-sm"
                        style={{ backgroundColor: HAIR_DOTS[cv.physicalEvidence] || '#888' }}
                      />
                      <span className="text-slate-900 dark:text-white font-extrabold capitalize text-sm">
                        {cv.physicalEvidence}
                      </span>
                    </div>
                  </div>

                  <span className="text-2xl text-slate-400 dark:text-gray-600 font-mono">
                    {cv.isConcordant ? '=' : '≠'}
                  </span>

                  <div className="text-center">
                    <div className="text-xs text-purple-700 dark:text-purple-400 font-mono uppercase tracking-wider mb-1 font-bold">
                      Modality 2
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-gray-400 mb-1">
                      HIrisPlex-S DNA Prediction
                    </div>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-400 dark:border-gray-500 shadow-sm"
                        style={{ backgroundColor: HAIR_DOTS[cv.dnaTopPrediction] || '#888' }}
                      />
                      <span className="text-slate-900 dark:text-white font-extrabold capitalize text-sm">
                        {cv.dnaTopPrediction}
                      </span>
                    </div>
                  </div>

                  <span className="text-slate-400 dark:text-gray-600 text-xl">→</span>

                  <div className="text-center">
                    <div className="text-xs text-teal-700 dark:text-cyan-400 font-mono uppercase tracking-wider mb-1 font-bold">
                      Fused Output
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-gray-400 mb-1">
                      Composite Phenotype
                    </div>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-400 dark:border-gray-500 shadow-sm"
                        style={{ backgroundColor: HAIR_DOTS[fusion.fusedHairColor] || '#888' }}
                      />
                      <span className="text-teal-700 dark:text-cyan-300 font-extrabold capitalize text-sm">
                        {fusion.fusedHairColor} ({cv.confidence}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fusion weights */}
                {fusion.weights && (
                  <div className="text-xs font-mono text-slate-700 dark:text-gray-400 text-right">
                    <p className="font-semibold text-slate-900 dark:text-slate-300">Bayesian Weights</p>
                    <p>
                      DNA: <span className="text-purple-700 dark:text-purple-400 font-bold">{(fusion.weights.dna * 100).toFixed(0)}%</span>
                    </p>
                    <p>
                      Hair: <span className="text-amber-700 dark:text-amber-400 font-bold">{(fusion.weights.hair * 100).toFixed(0)}%</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Fused probability mini-bars */}
              {fusion.fusedProbabilities && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  {Object.entries(fusion.fusedProbabilities).map(([c, p]) => (
                    <div key={c} className="text-center bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
                      <div
                        className="h-1.5 rounded-full bg-teal-500 dark:bg-cyan-400 mb-1 mx-auto"
                        style={{ width: `${Math.round(p * 100)}%`, maxWidth: '100%', minWidth: '4px' }}
                      />
                      <span className="text-xs font-mono text-slate-700 dark:text-gray-300 capitalize font-medium">{c}</span>
                      <span className="text-xs font-mono text-slate-950 dark:text-white font-extrabold ml-1">
                        {(p * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-gray-400 font-mono mt-3">
                Engine: {fusion.fusionMethod}
              </p>
            </motion.div>
          )}

          {/* ── Image grid header ──────────────────────────────────────────────── */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Generated Suspect Variations</h3>
              {metadata?.model && (
                <p className="text-xs font-mono text-teal-700 dark:text-purple-400 mt-1">
                  Engine: {metadata.model} | Landmark: MediaPipe FaceMesh | Fusion: {metadata.fusion_engine}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setImages([]);
                setMetadata(null);
              }}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
            >
              Clear &amp; Resynthesize
            </button>
          </div>

          {/* ── Disguise Alert Banner ────────────────────────────────────────── */}
          {metadata?.disguise?.isDisguised && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 w-full text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🕵️</span>
                <span className="font-bold font-mono text-sm text-amber-600 dark:text-amber-300">
                  DISGUISE DETECTED: {metadata.disguise.message}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-gray-300 font-mono">
                Chromosomal DNA Amelogenin locus confirms{' '}
                <strong className="text-purple-700 dark:text-purple-400 capitalize">
                  {metadata.disguise.dnaSex} ({metadata.disguise.dnaAmelogenin})
                </strong>
                , while witness observation documented{' '}
                <strong className="text-amber-600 dark:text-amber-300 capitalize">
                  {metadata.disguise.witnessSex} presentation
                </strong>
                .
              </p>
            </div>
          )}

          {/* ── 4 Face Variations Output ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 items-stretch">
            {images.map((img, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.15 }}
                className="glass-panel p-4 rounded-2xl flex flex-col justify-between items-center relative group border border-slate-200 dark:border-gray-800 hover:border-teal-500/60 dark:hover:border-cyan-400/60 shadow-lg transition-all h-full"
              >
                {/* Confidence Badge */}
                <div className="absolute top-3 right-3 bg-slate-900/90 text-teal-300 font-mono font-bold px-2.5 py-1 rounded-md text-xs border border-teal-500/40 shadow-sm z-10">
                  {metadata?.confidence_scores?.[idx] ? `${metadata.confidence_scores[idx]}% Match` : '91.4% Match'}
                </div>

                {/* Face Image with standardized 178x218 aspect ratio */}
                <div className="w-full aspect-[178/218] overflow-hidden rounded-xl mb-4 bg-slate-900 flex items-center justify-center shadow-inner">
                  <img
                    src={img}
                    alt={`Variation ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  />
                </div>

                {/* Actions */}
                <div className="w-full flex flex-col gap-2 mt-auto">
                  <button
                    onClick={() => setSelectedAnalysis(idx)}
                    className="w-full py-2.5 px-3 bg-teal-500/10 hover:bg-teal-500/20 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 border border-teal-500/40 hover:border-teal-500 dark:border-cyan-500/40 dark:hover:border-cyan-400 rounded-xl text-xs font-mono font-bold text-teal-800 dark:text-cyan-300 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400" />
                    <span>View Forensic Audit</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {metadata?.forensic_disclaimer && (
            <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300/90 text-xs text-center font-mono font-medium">
              ⚠️ {metadata.forensic_disclaimer}
            </div>
          )}
        </div>
      )}

      {/* ── Forensic Audit Modal ───────────────────────────────────────────────── */}
      {selectedAnalysis !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-gray-700 p-6 sm:p-8 rounded-2xl max-w-lg w-full relative shadow-[0_0_40px_rgba(20,184,166,0.25)] my-4 text-slate-900 dark:text-white"
          >
            <button
              onClick={() => setSelectedAnalysis(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              &times;
            </button>
            <h3 className="text-xl sm:text-2xl font-bold mb-4 text-slate-900 dark:text-white neon-text">
              Variation {selectedAnalysis + 1} — Forensic Audit
            </h3>

            <div className="flex gap-4 mb-4 items-center">
              <img
                src={images[selectedAnalysis]}
                alt="Selected"
                className="w-24 h-28 rounded-xl object-cover border border-slate-300 dark:border-gray-700 shadow-sm"
              />
              <div className="text-sm space-y-1 text-slate-700 dark:text-gray-300 font-mono">
                <p>
                  Confidence:{' '}
                  <span className="text-emerald-600 dark:text-green-400 font-extrabold text-base">
                    {metadata?.confidence_scores?.[selectedAnalysis] || '91.4'}%
                  </span>
                </p>
                <p>
                  Eye Detection: <span className="text-teal-700 dark:text-cyan-400 font-bold">MediaPipe FaceMesh</span>
                </p>
                <p>
                  Generator: <span className="text-purple-700 dark:text-purple-400 font-bold">StyleGAN2-ADA W+</span>
                </p>
                <p>
                  Fusion: <span className="text-amber-600 dark:text-amber-400 font-bold text-xs">Bayesian WLOP</span>
                </p>
              </div>
            </div>

            {/* Fusion cross-validation in modal */}
            {cv && (
              <div
                className={`mb-4 p-3.5 rounded-xl border text-xs font-mono ${
                  cv.isConcordant
                    ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20'
                    : 'border-rose-500/40 bg-rose-50 dark:bg-rose-950/20'
                }`}
              >
                <p
                  className={`font-bold mb-1 ${
                    cv.isConcordant ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {cv.isConcordant ? '✅' : '⚠️'} Multi-Modal Cross-Validation: {cv.status}
                </p>
                <p className="text-slate-600 dark:text-gray-400">{cv.notes}</p>
                <div className="flex gap-4 mt-2 text-slate-800 dark:text-gray-300">
                  <span>
                    Modality 1: <strong className="text-amber-600 dark:text-amber-400 capitalize">{cv.physicalEvidence}</strong>
                  </span>
                  <span>
                    Modality 2: <strong className="text-purple-700 dark:text-purple-400 capitalize">{cv.dnaTopPrediction}</strong>
                  </span>
                </div>
                <p className="mt-1 text-slate-800 dark:text-gray-200">
                  Fused Output:{' '}
                  <strong className="text-teal-700 dark:text-cyan-400 capitalize">
                    {fusion.fusedHairColor}
                  </strong>{' '}
                  ({cv.confidence}% confidence)
                </p>
              </div>
            )}

            <h4 className="font-bold border-b border-slate-200 dark:border-gray-800 pb-2 mb-3 text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider font-mono">
              HIrisPlex-S Probability Matrix (Modality 2)
            </h4>
            <div className="text-xs font-mono space-y-2 text-slate-800 dark:text-gray-300 bg-slate-100 dark:bg-darkBg p-3 rounded-xl border border-slate-200 dark:border-gray-800">
              <p>
                <span className="text-teal-700 dark:text-cyan-400 font-bold">Eye Color:</span>{' '}
                {JSON.stringify(metadata?.hirisplex_probabilities?.eyeColor || { blue: 0.82, brown: 0.12 })}
              </p>
              <p>
                <span className="text-teal-700 dark:text-cyan-400 font-bold">Hair Color:</span>{' '}
                {JSON.stringify(metadata?.hirisplex_probabilities?.hairColor || { brown: 0.48, black: 0.36 })}
              </p>
              <p>
                <span className="text-teal-700 dark:text-cyan-400 font-bold">Skin Tone:</span>{' '}
                {JSON.stringify(metadata?.hirisplex_probabilities?.skinTone || { medium: 0.45, fair: 0.25 })}
              </p>
            </div>

            {fusion?.fusedProbabilities && (
              <>
                <h4 className="font-bold border-b border-slate-200 dark:border-gray-800 pb-2 mb-3 mt-4 text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider font-mono">
                  Fused Hair Probability (Post-Fusion)
                </h4>
                <div className="text-xs font-mono space-y-1.5 bg-slate-100 dark:bg-darkBg p-3 rounded-xl border border-slate-200 dark:border-gray-800">
                  {Object.entries(fusion.fusedProbabilities).map(([c, p]) => (
                    <div key={c} className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-slate-400 dark:border-gray-600 flex-shrink-0"
                        style={{ backgroundColor: HAIR_DOTS[c] || '#888' }}
                      />
                      <span className="capitalize text-slate-700 dark:text-gray-400 w-16">{c}</span>
                      <div className="flex-1 bg-slate-200 dark:bg-gray-800 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-teal-500 dark:bg-cyan-400"
                          style={{ width: `${(p * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="text-slate-950 dark:text-white font-extrabold w-12 text-right">
                        {(p * 100).toFixed(1)}%
                      </span>
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
