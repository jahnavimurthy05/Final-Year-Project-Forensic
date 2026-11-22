import { useState } from 'react';
import { motion } from 'framer-motion';

export default function LiquidButton({
  children,
  onClick,
  type = 'button',
  variant = 'teal',
  className = '',
  disabled = false,
  icon = null,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const variants = {
    teal: {
      border: 'border border-teal-600 hover:border-teal-500 dark:border-teal-400/70',
      bgBase: 'bg-teal-50/90 dark:bg-slate-900/90',
      liquidGradient: 'from-teal-800 via-teal-600 to-teal-500',
      liquidBaseColor: 'bg-teal-600/15 dark:bg-teal-500/15',
      waveColor1: 'text-white/40 fill-current',
      waveColor2: 'text-teal-200/30 fill-current',
      textIdle: 'text-teal-950 dark:text-teal-100',
      textHover: 'text-white',
      glow: 'shadow-sm hover:shadow-md',
    },
    purple: {
      border: 'border-2 border-purple-500 hover:border-purple-400 dark:border-purple-400/70',
      bgBase: 'bg-purple-50/95 dark:bg-slate-900/90',
      liquidGradient: 'from-purple-800 via-purple-600 to-pink-500',
      liquidBaseColor: 'bg-purple-600/20 dark:bg-purple-500/15',
      waveColor1: 'text-white/50 fill-current',
      waveColor2: 'text-pink-200/40 fill-current',
      textIdle: 'text-purple-950 dark:text-purple-100',
      textHover: 'text-white',
      glow: 'shadow-[0_4px_16px_rgba(168,85,247,0.25)] hover:shadow-[0_8px_28px_rgba(168,85,247,0.5)]',
    },
    cyber: {
      border: 'border-2 border-cyan-500 hover:border-cyan-400 dark:border-cyan-400/70',
      bgBase: 'bg-cyan-50/95 dark:bg-slate-900/90',
      liquidGradient: 'from-cyan-700 via-cyan-500 to-blue-500',
      liquidBaseColor: 'bg-cyan-600/20 dark:bg-cyan-500/15',
      waveColor1: 'text-white/50 fill-current',
      waveColor2: 'text-sky-200/40 fill-current',
      textIdle: 'text-cyan-950 dark:text-cyan-100',
      textHover: 'text-white',
      glow: 'shadow-[0_4px_16px_rgba(0,210,255,0.25)] hover:shadow-[0_8px_28px_rgba(0,210,255,0.5)]',
    },
  };

  const current = variants[variant] || variants.teal;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={{ scale: 0.97 }}
      className={`group relative overflow-hidden rounded-xl px-7 py-3.5 font-bold text-sm tracking-wide transition-all duration-300 ${current.border} ${current.bgBase} ${current.glow} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {/* ── Idle Liquid Reservoir (Always-visible flowing wave at base) ── */}
      <div className={`absolute inset-x-0 bottom-0 h-3.5 ${current.liquidBaseColor} z-0 overflow-hidden pointer-events-none`}>
        <svg
          className={`absolute -top-2 left-0 w-[200%] h-3.5 opacity-60 fill-current ${
            variant === 'purple' ? 'text-purple-400' : 'text-teal-500'
          } animate-[wave_3.5s_linear_infinite]`}
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,-30 1200,30 L1200,120 L0,120 Z"></path>
        </svg>
      </div>

      {/* ── Rising Surging Liquid Fluid Layer (Fills on Hover) ─────────── */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: isHovered && !disabled ? '0%' : '100%' }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className={`absolute inset-0 bg-gradient-to-t ${current.liquidGradient} z-0 pointer-events-none shadow-inner`}
      >
        {/* Primary flowing wave crest (front) */}
        <svg
          className={`absolute -top-3.5 left-0 w-[200%] h-4 ${current.waveColor1} animate-[wave_2.2s_linear_infinite]`}
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,-30 1200,30 L1200,120 L0,120 Z"></path>
        </svg>

        {/* Secondary counter-flowing wave crest (depth layer) */}
        <svg
          className={`absolute -top-2.5 left-0 w-[200%] h-3.5 ${current.waveColor2} animate-[wave_3.8s_linear_infinite_reverse]`}
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path d="M0,30 C300,-20 500,80 750,10 C1000,-30 1100,50 1200,0 L1200,120 L0,120 Z"></path>
        </svg>
      </motion.div>

      {/* ── Button Label & Icon Content ─────────────────────────────────── */}
      <span
        className={`relative z-10 flex items-center justify-center gap-2.5 transition-colors duration-200 select-none ${
          isHovered && !disabled
            ? `${current.textHover} drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]`
            : current.textIdle
        }`}
      >
        {icon && (
          <span className="text-base transition-transform duration-200 group-hover:scale-110">
            {icon}
          </span>
        )}
        <span>{children}</span>
      </span>
    </motion.button>
  );
}
