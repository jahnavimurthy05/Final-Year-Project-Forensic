import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex-shrink-0 flex items-center justify-center">
            {/* Outer rotating dashed ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-teal-500/40 dark:border-cyan-400/50 animate-[spin_12s_linear_infinite]" />

            {/* Inner counter-rotating ring */}
            <div className="absolute inset-3 rounded-full border border-teal-600/30 dark:border-purple-400/40 animate-[spin_8s_linear_infinite_reverse]" />

            {/* Corner HUD targeting brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-teal-600 dark:border-cyan-400" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-teal-600 dark:border-cyan-400" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-teal-600 dark:border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-teal-600 dark:border-cyan-400" />

            {/* Center Biometric Face Silhouette & Landmark Nodes */}
            <div className="relative w-32 h-36 flex items-center justify-center overflow-hidden rounded-xl bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
              {/* Stylized Face Mesh SVG */}
              <svg className="w-24 h-28 text-teal-600 dark:text-cyan-400" viewBox="0 0 100 120" fill="none">
                {/* Face contour */}
                <path
                  d="M 50 10 C 25 10 18 35 18 60 C 18 85 35 110 50 115 C 65 110 82 85 82 60 C 82 35 75 10 50 10 Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                  fill="none"
                />
                {/* Forehead & Temple mesh */}
                <path d="M 30 35 L 50 25 L 70 35 L 50 45 Z" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.5" />
                {/* Eye orbits */}
                <ellipse cx="36" cy="50" rx="9" ry="5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
                <ellipse cx="64" cy="50" rx="9" ry="5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
                <circle cx="36" cy="50" r="3" fill="currentColor" fillOpacity="0.9" />
                <circle cx="64" cy="50" r="3" fill="currentColor" fillOpacity="0.9" />
                {/* Nose bridge & tip */}
                <path d="M 50 45 L 47 68 L 53 68 Z" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
                {/* Mouth lips */}
                <path d="M 38 85 Q 50 81 62 85 Q 50 93 38 85 Z" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
                {/* Key Landmark Nodes */}
                <circle cx="50" cy="25" r="2" fill="#14b8a6" />
                <circle cx="18" cy="60" r="2" fill="#14b8a6" />
                <circle cx="82" cy="60" r="2" fill="#14b8a6" />
                <circle cx="50" cy="115" r="2.5" fill="#00d2ff" />
                <circle cx="50" cy="68" r="2" fill="#a855f7" />
              </svg>

              {/* Vertical Laser Scan Line Animation */}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00d2ff]"
                animate={{
                  top: ['5%', '92%', '5%'],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>

            {/* Radar sweep beam */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none animate-[spin_3s_linear_infinite]"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(20, 184, 166, 0.25) 360deg)',
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
