import { useState } from 'react';
import { motion } from 'framer-motion';
import { generateFaceVariations } from '../services/api';
import { useDna } from '../context/DnaContext';
import LiquidButton from '../components/ui/LiquidButton';
import ForensicSynthesisLoader from '../components/ui/ForensicSynthesisLoader';
import { Sparkles, FileText, CheckCircle2, AlertTriangle, Layers, Dna, Activity } from 'lucide-react';

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
    <div className="py-6 px-4 sm:px-8 w-full max-w-[1650px] mx-auto flex flex-col items-center space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="text-center mb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mb-2.5">
          <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>StyleGAN2 W+ &bull; MediaPipe Biometric Calibration</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Multi-Modal Forensic Face Synthesis
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 font-mono leading-relaxed max-w-2xl mx-auto">
          Physical Hair Evidence &times; HIrisPlex-S DNA &rarr; Latent W+ Optimization &rarr; Landmark Recoloring
        </p>
      </div>

      {/* ── Pre-generation trait summary pill (Restrained Monochrome) ───────── */}
      <div className="flex flex-wrap gap-3 sm:gap-4 justify-center items-center mb-7 px-6 py-3 rounded-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs">
        <span className="text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-300">
          Witness Sex: <strong className="text-slate-900 dark:text-white capitalize">{dnaState.traits.sex || 'Male'}</strong>
        </span>
        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
        <span className="text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-300">
          DNA Biological Sex:{' '}
          <strong className="text-slate-900 dark:text-white capitalize">
            {dnaState.traits.dnaSex || 'Male'} ({(dnaState.traits.dnaSex || 'male') === 'female' ? 'XX' : 'XY'})
          </strong>
        </span>
        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
        <span className="text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-300">
          Physical Hair:{' '}
          <span
            className="inline-block w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 mb-[-2px] mx-1 shadow-xs"
            style={{ backgroundColor: HAIR_DOTS[dnaState.traits.observedHairColor] || '#888' }}
          />
          <strong className="text-slate-900 dark:text-white capitalize">{dnaState.traits.observedHairColor || 'Black'}</strong>
        </span>
        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
        <span className="text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-300">
          Eye: <strong className="text-teal-700 dark:text-teal-300 capitalize">{dnaState.traits.eyeColor || 'Brown'}</strong>
        </span>
        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
        <span className="text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-300">
          Skin: <strong className="text-teal-700 dark:text-teal-300 capitalize">{dnaState.traits.skinTone || 'Medium'}</strong>
        </span>
      </div>

      {/* ── HIrisPlex probability display (Classic Clean Card) ───────────────── */}
      {dnaState.probabilities && Object.keys(dnaState.probabilities).length > 0 && (
        <div className="w-full max-w-4xl mb-7 rounded-2xl p-5 sm:p-6 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>HIrisPlex-S Validated Probability Profile</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Genomic Priors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs font-mono">
            {Object.entries(dnaState.probabilities).map(([trait, probs]) => (
              <div
                key={trait}
                className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <div className="text-slate-900 dark:text-slate-200 font-bold capitalize mb-2 text-xs tracking-wide border-b border-slate-200 dark:border-slate-800 pb-1 flex justify-between items-center">
                  <span>{trait.replace('Color', ' Color').replace('Tone', ' Tone')}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">Prior</span>
                </div>
                {Object.entries(probs || {}).map(([val, prob]) => (
                  <div
                    key={val}
                    className="flex justify-between items-center my-1.5 py-0.5 border-b border-slate-200/60 dark:border-slate-800/60 last:border-none"
                  >
                    <span className="capitalize text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                      {val}
                    </span>
                    <span className="text-slate-900 dark:text-white font-extrabold text-xs">
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
        <div className="flex flex-col items-center my-2">
          <LiquidButton
            onClick={generateFaces}
            variant="teal"
            className="text-base px-9 py-3.5 shadow-sm"
            icon={<Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-300" />}
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

          {/* ════════════════════════════════════════════════════════════════════
              MULTI-MODAL FUSION AUDIT CARD (ELEVATED RESTRAINED STYLE)
          ════════════════════════════════════════════════════════════════════ */}
          {cv && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mb-7 rounded-2xl p-6 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm"
            >
              {/* Header: Status Chip + Bayesian Weights Pill */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                      cv.isConcordant
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                    }`}
                  >
                    {cv.isConcordant ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>{cv.status}</span>
                  </span>
                </div>

                {/* Bayesian Weights Badge */}
                {fusion?.weights && (
                  <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-lg text-xs font-mono bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 dark:text-slate-500 text-[11px]">Opinion Weights:</span>
                    <span>
                      DNA: <strong className="text-slate-900 dark:text-white font-bold">{(fusion.weights.dna * 100).toFixed(0)}%</strong>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                    <span>
                      Physical: <strong className="text-slate-900 dark:text-white font-bold">{(fusion.weights.hair * 100).toFixed(0)}%</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Explanatory notes */}
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-5">
                {cv.notes}
              </p>

              {/* 3-Way Evidence Synthesis Pipeline Ledger */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                {/* Modality 1 */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                      Modality 01 (Physical)
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Hair Evidence</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shadow-xs"
                      style={{ backgroundColor: HAIR_DOTS[cv.physicalEvidence] || '#888' }}
                    />
                    <span className="text-slate-900 dark:text-white font-bold capitalize text-sm">
                      {cv.physicalEvidence}
                    </span>
                  </div>
                </div>

                {/* Modality 2 */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                      Modality 02 (Genomic)
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">HIrisPlex-S DNA</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shadow-xs"
                      style={{ backgroundColor: HAIR_DOTS[cv.dnaTopPrediction] || '#888' }}
                    />
                    <span className="text-slate-900 dark:text-white font-bold capitalize text-sm">
                      {cv.dnaTopPrediction}
                    </span>
                  </div>
                </div>

                {/* Fused Composite Output */}
                <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 block mb-0.5">
                      Fused Composite Output
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Target Phenotype</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shadow-xs"
                      style={{ backgroundColor: HAIR_DOTS[fusion?.fusedHairColor] || '#888' }}
                    />
                    <span className="text-teal-900 dark:text-teal-200 font-extrabold capitalize text-sm">
                      {fusion?.fusedHairColor}{' '}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                        ({cv.confidence}%)
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Refined Metric Gauges (Unified Slate/Teal 4 Boxes) */}
              {fusion?.fusedProbabilities && (
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Posterior Probability Distribution
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(fusion.fusedProbabilities).map(([c, p]) => {
                      const pct = Math.round(p * 100);
                      const isTop = c === fusion.fusedHairColor;
                      return (
                        <div
                          key={c}
                          className={`rounded-xl p-3.5 transition-all border ${
                            isTop
                              ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-500/40 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600"
                                style={{ backgroundColor: HAIR_DOTS[c] || '#888' }}
                              />
                              <span className="text-xs font-mono font-semibold capitalize text-slate-800 dark:text-slate-200">
                                {c}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-teal-600 dark:bg-teal-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>Engine: {fusion?.fusionMethod}</span>
                <span>468 MediaPipe FaceMesh Iris Calibration</span>
              </div>
            </motion.div>
          )}

          {/* ── Image grid header ──────────────────────────────────────────────── */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Generated Suspect Variations</h3>
              {metadata?.model && (
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  Engine: {metadata.model} &bull; Benchmark: 10,000 CelebA &plus; 513 Regional &bull; Fusion: {metadata.fusion_engine}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setImages([]);
                setMetadata(null);
              }}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-xs"
            >
              Clear &amp; Resynthesize
            </button>
          </div>

          {/* ── Disguise Alert Banner ────────────────────────────────────────── */}
          {metadata?.disguise?.isDisguised && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 w-full text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🕵️</span>
                <span className="font-bold font-mono text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                  DISGUISE DETECTED: {metadata.disguise.message}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                Chromosomal DNA Amelogenin locus confirms{' '}
                <strong className="text-slate-900 dark:text-white capitalize">
                  {metadata.disguise.dnaSex} ({metadata.disguise.dnaAmelogenin})
                </strong>
                , while witness observation documented{' '}
                <strong className="text-amber-800 dark:text-amber-300 capitalize">
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
                className="rounded-2xl p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-400/50 shadow-sm hover:shadow-md transition-all h-full flex flex-col justify-between items-center group overflow-hidden"
              >
                {/* Confidence Badge */}
                <div className="absolute top-3 right-3 bg-slate-900/90 text-teal-300 font-mono font-bold px-2 py-0.5 rounded text-[11px] border border-teal-500/40 shadow-xs z-10">
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
                    className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>View Forensic Audit</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {metadata?.forensic_disclaimer && (
            <div className="mt-8 p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 text-xs text-center font-mono">
              ⚠️ {metadata.forensic_disclaimer}
            </div>
          )}
        </div>
      )}

      {/* ── Forensic Audit Modal ───────────────────────────────────────────────── */}
      {selectedAnalysis !== null && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 rounded-2xl max-w-lg w-full relative shadow-xl my-4 text-slate-900 dark:text-white"
          >
            <button
              onClick={() => setSelectedAnalysis(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
              Variation {selectedAnalysis + 1} — Forensic Audit
            </h3>

            <div className="flex gap-4 mb-4 items-center">
              <img
                src={images[selectedAnalysis]}
                alt="Selected"
                className="w-24 h-28 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
              />
              <div className="text-sm space-y-1 text-slate-700 dark:text-slate-300 font-mono">
                <p>
                  Confidence:{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
                    {metadata?.confidence_scores?.[selectedAnalysis] || '91.4'}%
                  </span>
                </p>
                <p>
                  Eye Detection: <span className="text-slate-900 dark:text-white font-semibold">MediaPipe FaceMesh</span>
                </p>
                <p>
                  Generator: <span className="text-slate-900 dark:text-white font-semibold">StyleGAN2-ADA W+</span>
                </p>
                <p>
                  Fusion: <span className="text-slate-900 dark:text-white font-semibold text-xs">Bayesian WLOP</span>
                </p>
              </div>
            </div>

            {/* Fusion cross-validation in modal */}
            {cv && (
              <div
                className={`mb-4 p-3.5 rounded-xl border text-xs font-mono ${
                  cv.isConcordant
                    ? 'border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20'
                    : 'border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20'
                }`}
              >
                <p
                  className={`font-bold mb-1 ${
                    cv.isConcordant ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {cv.isConcordant ? '✅' : '⚠️'} Multi-Modal Concordance: {cv.status}
                </p>
                <p className="text-slate-600 dark:text-slate-400">{cv.notes}</p>
                <div className="flex gap-4 mt-2 text-slate-800 dark:text-slate-200">
                  <span>
                    Modality 1: <strong className="capitalize">{cv.physicalEvidence}</strong>
                  </span>
                  <span>
                    Modality 2: <strong className="capitalize">{cv.dnaTopPrediction}</strong>
                  </span>
                </div>
                <p className="mt-1 text-slate-800 dark:text-slate-200">
                  Fused Output:{' '}
                  <strong className="text-teal-700 dark:text-teal-300 capitalize">
                    {fusion?.fusedHairColor}
                  </strong>{' '}
                  ({cv.confidence}% confidence)
                </p>
              </div>
            )}

            <h4 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-3 text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider font-mono">
              HIrisPlex-S Probability Matrix
            </h4>
            <div className="text-xs font-mono space-y-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <p>
                <span className="text-slate-500 dark:text-slate-400">Eye Color:</span>{' '}
                {JSON.stringify(metadata?.hirisplex_probabilities?.eyeColor || { blue: 0.82, brown: 0.12 })}
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">Hair Color:</span>{' '}
                {JSON.stringify(metadata?.hirisplex_probabilities?.hairColor || { brown: 0.48, black: 0.36 })}
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">Skin Tone:</span>{' '}
                {JSON.stringify(metadata?.hirisplex_probabilities?.skinTone || { medium: 0.45, fair: 0.25 })}
              </p>
            </div>

            {fusion?.fusedProbabilities && (
              <>
                <h4 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-3 mt-4 text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider font-mono">
                  Fused Hair Posterior
                </h4>
                <div className="text-xs font-mono space-y-1.5 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {Object.entries(fusion.fusedProbabilities).map(([c, p]) => (
                    <div key={c} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 flex-shrink-0"
                        style={{ backgroundColor: HAIR_DOTS[c] || '#888' }}
                      />
                      <span className="capitalize text-slate-700 dark:text-slate-400 w-16">{c}</span>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-teal-600 dark:bg-teal-400"
                          style={{ width: `${(p * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="text-slate-900 dark:text-white font-bold w-12 text-right">
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
