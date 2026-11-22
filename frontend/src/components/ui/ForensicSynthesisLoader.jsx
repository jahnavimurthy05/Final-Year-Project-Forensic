import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dna, ShieldCheck, Cpu, Eye, Sparkles } from 'lucide-react';

const PIPELINE_STAGES = [
  {
    id: 1,
    title: 'Genomic Marker Extraction',
    detail: 'Parsing 41 HIrisPlex-S SNP loci & STR amelogenin chromosomal markers',
    icon: Dna,
  },
  {
    id: 2,
    title: 'Bayesian Multi-Modal Fusion',
    detail: 'Cross-validating physical hair evidence with genomic phenotype priors',
    icon: ShieldCheck,
  },
  {
    id: 3,
    title: 'StyleGAN2-ADA Latent Synthesis',
    detail: 'Sampling 512-dim W+ latent manifold with attribute-guided directional vectors',
    icon: Cpu,
  },
  {
    id: 4,
    title: 'MediaPipe 468 Landmark & Iris Calibration',
    detail: 'Geometric iris segmentation, specular reflection preservation & recoloring',
    icon: Eye,
  },
];

const STAGE_BADGES = [
  '01: DNA HELIX SCAN',
  '02: BAYESIAN FUSION',
  '03: STYLEGAN LATENT',
  '04: 468 LANDMARKS LOCK',
];

const TELEMETRY_LINES = [
  'SCAN: Chromosomal locus rs12913832 (HERC2/OCA2) -> [G/A] concordant',
  'SCAN: Chromosomal locus rs1800407 (MC1R) -> [C/T] eumelanin validated',
  'FUSION: Calculating Bayesian opinion pool (W_dna=0.70, W_phys=0.30)',
  'AUDIT: Multi-modal concordance test initialized... status = VERIFIED',
  'LATENT: Navigating StyleGAN2-ADA W+ 18-layer tensor space',
  'BIOMETRIC: Detecting 468 3D facial mesh anchor coordinates',
  'IRIS: MediaPipe landmarks [468, 473] localized. Preserving pupil aperture',
  'COMPOSITE: Aligning 178x218 aspect ratio across benchmark galleries',
];

export default function ForensicSynthesisLoader() {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(12);
  const [telemetryIndex, setTelemetryIndex] = useState(0);

  useEffect(() => {
    // Stage stepper timer
    const stageTimer = setInterval(() => {
      setCurrentStage((prev) => (prev < PIPELINE_STAGES.length - 1 ? prev + 1 : prev));
    }, 1800);

    // Smooth progressive progress bar
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 96) return 96;
        const jump = Math.random() * 5 + 3;
        return Math.min(96, Math.floor(prev + jump));
      });
    }, 280);

    // Telemetry log scrolling
    const telemetryTimer = setInterval(() => {
      setTelemetryIndex((prev) => (prev + 1) % TELEMETRY_LINES.length);
    }, 900);

    return () => {
      clearInterval(stageTimer);
      clearInterval(progressTimer);
      clearInterval(telemetryTimer);
    };
  }, []);

  return (
    <div className="w-full max-w-3xl my-6 mx-auto px-4">
      <div className="relative rounded-2xl p-6 sm:p-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-teal-500/40 dark:border-cyan-500/40 shadow-[0_10px_40px_rgba(20,184,166,0.15)] dark:shadow-[0_10px_50px_rgba(0,210,255,0.18)] overflow-hidden">
        {/* Ambient background grid lines */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* ── Top HUD Header ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 dark:bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-600 dark:bg-cyan-500" />
            </span>
            <span className="font-mono text-xs uppercase tracking-widest font-bold text-teal-700 dark:text-cyan-400">
              Forensic Synthesis Pipeline In Progress
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">{progress}% Completed</span>
          </div>
        </div>

        {/* ── Center Stage: Biometric Face HUD Scanner ──────────────────── */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-2 mb-6">
          {/* Biometric Hologram Reticle */}
          <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex-shrink-0 flex items-center justify-center">
            {/* Outer rotating dashed ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-teal-500/40 dark:border-cyan-400/50 animate-[spin_16s_linear_infinite]" />

            {/* Inner counter-rotating calibrated ring */}
            <div className="absolute inset-2.5 rounded-full border border-teal-600/30 dark:border-purple-400/40 animate-[spin_10s_linear_infinite_reverse]" />

            {/* Micro coordinate markers */}
            <div className="absolute inset-0 flex items-center justify-between px-1 text-[8px] font-mono text-teal-600/50 dark:text-cyan-400/50 pointer-events-none select-none">
              <span>270°</span>
              <span>090°</span>
            </div>
            <div className="absolute inset-0 flex flex-col justify-between items-center py-1 text-[8px] font-mono text-teal-600/50 dark:text-cyan-400/50 pointer-events-none select-none">
              <span>000°</span>
              <span>180°</span>
            </div>

            {/* Corner HUD targeting brackets with breathing animation */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-teal-600 dark:border-cyan-400 shadow-[0_0_8px_#00d2ff]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-teal-600 dark:border-cyan-400 shadow-[0_0_8px_#00d2ff]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-teal-600 dark:border-cyan-400 shadow-[0_0_8px_#00d2ff]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-teal-600 dark:border-cyan-400 shadow-[0_0_8px_#00d2ff]" />
            </motion.div>

            {/* Center Biometric Face Viewfinder (ForenAI Authentic Brand Mark) */}
            <motion.div
              className="relative w-36 h-40 flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-teal-500/50 dark:border-cyan-500/50 shadow-inner group"
              animate={{
                boxShadow: [
                  '0 0 16px rgba(20,184,166,0.25), inset 0 0 20px rgba(20,184,166,0.15)',
                  '0 0 28px rgba(0,210,255,0.45), inset 0 0 25px rgba(0,210,255,0.25)',
                  '0 0 16px rgba(20,184,166,0.25), inset 0 0 20px rgba(20,184,166,0.15)',
                ],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Subtle holographic grid lines inside viewfinder */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(20,184,166,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.3) 1px, transparent 1px)',
                  backgroundSize: '12px 12px',
                }}
              />

              {/* Stage-responsive glow aura behind the emblem */}
              <motion.div
                className="absolute inset-3 rounded-full filter blur-xl pointer-events-none"
                animate={{
                  backgroundColor:
                    currentStage === 0
                      ? 'rgba(20,184,166,0.28)'
                      : currentStage === 1
                      ? 'rgba(245,158,11,0.25)'
                      : currentStage === 2
                      ? 'rgba(168,85,247,0.28)'
                      : 'rgba(0,210,255,0.32)',
                  scale: [0.9, 1.15, 0.9],
                }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Authentic ForenAI Logo Face Emblem with Smooth Floating & Shimmer */}
              <motion.img
                key="forenai-face-logo"
                src={`${import.meta.env.BASE_URL}forenai-mark-transparent.png`}
                alt="ForenAI Forensic Biometric Face"
                className="w-28 h-28 object-contain filter drop-shadow-[0_0_14px_rgba(20,184,166,0.6)] z-10 select-none pointer-events-none"
                animate={{
                  scale: [0.97, 1.04, 0.97],
                  y: [-3, 3, -3],
                }}
                transition={{
                  duration: 3.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Stage 3 Ocular MediaPipe Landmark Calibration Crosshair */}
              <AnimatePresence>
                {currentStage === 3 && (
                  <motion.div
                    initial={{ scale: 2.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="absolute top-[36%] right-[27%] w-6 h-6 -translate-y-1/2 translate-x-1/2 pointer-events-none z-20 flex items-center justify-center"
                  >
                    <div className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-75" />
                    <div className="w-4 h-4 rounded-full border border-cyan-300" />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-200 shadow-[0_0_6px_#00d2ff]" />
                    <span className="absolute -top-3.5 right-0 text-[7px] font-mono font-bold text-cyan-300 bg-slate-900/90 px-1 rounded border border-cyan-500/40">
                      #468
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Vertical Laser Scan Line Animation */}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_16px_#00d2ff,0_0_24px_#14b8a6] z-20 pointer-events-none"
                animate={{
                  top: ['6%', '92%', '6%'],
                  opacity: [0.75, 1, 0.75],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <div className="absolute inset-x-0 -top-3 h-3 bg-gradient-to-t from-cyan-400/20 to-transparent pointer-events-none" />
              </motion.div>

              {/* Smooth Stage Status Pill at bottom of viewfinder */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStage}
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.9 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="absolute bottom-1.5 z-20 px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold tracking-wider uppercase backdrop-blur-md bg-slate-900/90 border border-teal-500/40 text-teal-300 shadow-sm flex items-center gap-1.5 select-none"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                  <span>{STAGE_BADGES[currentStage]}</span>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Radar sweep beam */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none animate-[spin_3.5s_linear_infinite]"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(20, 184, 166, 0.22) 360deg)',
              }}
            />
          </div>

          {/* Stepper info list */}
          <div className="flex-1 w-full space-y-2.5">
            {PIPELINE_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isPast = idx < currentStage;
              const isCurrent = idx === currentStage;

              return (
                <div
                  key={stage.id}
                  className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-300 border ${
                    isCurrent
                      ? 'bg-teal-50 dark:bg-slate-800/90 border-teal-500/50 dark:border-cyan-500/50 shadow-sm'
                      : isPast
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                      : 'opacity-40 border-transparent'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                      isCurrent
                        ? 'bg-teal-600 text-white shadow-md'
                        : isPast
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-xs font-bold tracking-tight ${
                          isCurrent
                            ? 'text-teal-900 dark:text-cyan-300 text-sm'
                            : isPast
                            ? 'text-slate-800 dark:text-slate-300'
                            : 'text-slate-500 dark:text-slate-500'
                        }`}
                      >
                        {stage.title}
                      </span>
                      {isPast && (
                        <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-950/60 px-1.5 py-0.5 rounded">
                          DONE
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-300 animate-pulse">
                          RUNNING…
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-0.5 leading-snug truncate ${
                        isCurrent
                          ? 'text-slate-700 dark:text-slate-300 font-medium'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {stage.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── High-Tech Glowing Progress Bar ────────────────────────────── */}
        <div className="mb-4">
          <div className="flex justify-between items-center text-xs font-mono font-bold mb-1.5">
            <span className="text-slate-700 dark:text-slate-300">
              SYNTHESIS PIPELINE CONVERGENCE
            </span>
            <span className="text-teal-700 dark:text-cyan-400 text-sm">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-400 to-purple-500 shadow-[0_0_12px_rgba(20,184,166,0.6)]"
              initial={{ width: '12%' }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
            />
          </div>
        </div>

        {/* ── Live Forensic Telemetry Stream ────────────────────────────── */}
        <div className="rounded-lg p-2.5 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <span className="font-mono text-[10px] text-teal-600 dark:text-cyan-400 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-100 dark:bg-slate-900 border border-teal-500/30">
            TELEMETRY
          </span>
          <span className="font-mono text-xs text-slate-800 dark:text-slate-300 truncate flex-1">
            {TELEMETRY_LINES[telemetryIndex]}
          </span>
          <span className="inline-block w-1.5 h-3 bg-teal-500 dark:bg-cyan-400 animate-pulse flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
