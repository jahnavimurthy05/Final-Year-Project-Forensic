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

  const colors = {
    teal: {
      border: 'border-teal-500/50',
      bgBase: 'bg-teal-950/20',
      liquid: 'from-teal-500 to-cyan-400',
      textHover: 'text-slate-950',
      glow: 'hover:shadow-[0_0_25px_rgba(20,184,166,0.4)]',
    },
    purple: {
      border: 'border-purple-500/50',
      bgBase: 'bg-purple-950/20',
      liquid: 'from-purple-600 to-pink-500',
      textHover: 'text-white',
      glow: 'hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]',
    },
    cyber: {
      border: 'border-cyberBlue/50',
      bgBase: 'bg-cyan-950/20',
      liquid: 'from-cyan-500 to-blue-600',
      textHover: 'text-slate-950',
      glow: 'hover:shadow-[0_0_25px_rgba(0,210,255,0.4)]',
    },
  };

  const current = colors[variant] || colors.teal;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={{ scale: 0.97 }}
      className={`relative overflow-hidden rounded-xl px-6 py-3 font-semibold text-sm tracking-wide transition-all duration-300 border ${current.border} ${current.bgBase} ${current.glow} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {/* Rising Fluid Liquid Layer */}
      <motion.div
        initial={{ y: '105%' }}
        animate={{ y: isHovered && !disabled ? '0%' : '105%' }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        className={`absolute inset-0 bg-gradient-to-t ${current.liquid} z-0`}
      >
        {/* Animated fluid wave crest at the top of the rising liquid */}
        <svg
          className="absolute -top-3 left-0 w-[200%] h-4 text-white/20 fill-current animate-[wave_2.5s_linear_infinite]"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,-30 1200,30 L1200,120 L0,120 Z"></path>
        </svg>
      </motion.div>

      {/* Button Content */}
      <span
        className={`relative z-10 flex items-center justify-center gap-2 transition-colors duration-300 ${
          isHovered && !disabled ? current.textHover : 'text-slate-900 dark:text-white'
        }`}
      >
        {icon && <span className="text-base">{icon}</span>}
        {children}
      </span>
    </motion.button>
  );
}
