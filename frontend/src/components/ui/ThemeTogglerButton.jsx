import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Sparkles, Orbit } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeTogglerButton({ showBgToggle = true }) {
  const { theme, toggleTheme, bgEffect, toggleBgEffect } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center gap-2">
      {/* Background Effect Switcher (Glyph ⇋ Gravity Stars) */}
      {showBgToggle && (
        <button
          onClick={toggleBgEffect}
          title={`Active Background: ${bgEffect === 'glyph' ? 'DNA Glyph Matrix' : 'Gravity Stars'}. Click to switch.`}
          className="relative p-2 rounded-xl border transition-all duration-300 flex items-center gap-1.5 text-xs font-mono
            dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-teal-500/50 dark:text-teal-400
            light:bg-white light:border-slate-200 light:hover:border-teal-600/50 light:text-teal-700
            shadow-sm hover:scale-105 active:scale-95"
        >
          <AnimatePresence mode="wait" initial={false}>
            {bgEffect === 'glyph' ? (
              <motion.div
                key="glyph"
                initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px] tracking-wider uppercase">Glyphs</span>
              </motion.div>
            ) : (
              <motion.div
                key="stars"
                initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1"
              >
                <Orbit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px] tracking-wider uppercase">Stars</span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      )}

      {/* Main Theme Toggler Button (Animate UI primitive style) */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title={`Current theme: ${theme}. Click to switch to ${isDark ? 'light' : 'dark'} mode.`}
        className="relative p-2.5 rounded-xl border transition-all duration-300 overflow-hidden
          dark:bg-slate-900/90 dark:border-slate-800 dark:hover:border-amber-400/50 dark:text-amber-300 dark:shadow-[0_0_15px_rgba(251,191,36,0.15)]
          light:bg-white light:border-slate-200 light:hover:border-sky-500/50 light:text-sky-600 light:shadow-[0_2px_10px_rgba(2,132,199,0.15)]
          hover:scale-105 active:scale-95 group"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ y: 20, rotate: 45, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, rotate: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, rotate: -45, opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            >
              <Moon className="w-4 h-4 transition-transform group-hover:-rotate-12" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ y: 20, rotate: -45, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, rotate: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, rotate: 45, opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            >
              <Sun className="w-4 h-4 transition-transform group-hover:rotate-45 text-amber-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
