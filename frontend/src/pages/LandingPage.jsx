import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LiquidButton from '../components/ui/LiquidButton';
import { Dna, ShieldAlert, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center pt-16 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-4xl"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 dark:bg-slate-900 border border-teal-500/30 text-teal-400 text-xs font-mono uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
          <img src={`${import.meta.env.BASE_URL}forenai-icon.png`} alt="ForenAI" className="w-5 h-5 rounded-md" />
          ForenAI &bull; Forensic DNA Intelligence Suite
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 neon-text tracking-tight text-slate-900 dark:text-white">
          Synthesize Suspects from DNA
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-gray-300 mb-10 leading-relaxed max-w-3xl mx-auto">
          Multi-Modal Forensic Face Synthesis — fusing Physical Hair Evidence with Synthetic DNA via HIrisPlex-S and StyleGAN2 latent space editing.
        </p>
        
        <div className="flex flex-wrap justify-center items-center gap-5">
          <LiquidButton
            onClick={() => navigate('/dna-input')}
            variant="teal"
            className="text-base px-8 py-4 shadow-[0_0_20px_rgba(20,184,166,0.35)]"
            icon={<Dna className="w-5 h-5 text-teal-400" />}
          >
            Initialize DNA Mapping
          </LiquidButton>

          <Link
            to="/ethics"
            className="px-8 py-3.5 glass-panel rounded-xl border border-slate-300 dark:border-cyberPurple text-slate-800 dark:text-white font-semibold text-base hover:bg-slate-200/50 dark:hover:bg-cyberPurple/20 transition-all flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            Review Ethical Guidelines
          </Link>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mb-16"
      >
        <div className="glass-panel p-8 rounded-2xl text-center">
          <div className="text-teal-500 dark:text-cyberBlue text-4xl mb-4 font-mono font-bold">01</div>
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Genetic Parsing</h3>
          <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed">Map HIrisPlex-S inspired markers to phenotypic traits like hair, eye color, and bone structure.</p>
        </div>
        <div className="glass-panel p-8 rounded-2xl text-center relative overflow-hidden">
          <div className="text-purple-500 dark:text-cyberPurple text-4xl mb-4 font-mono font-bold">02</div>
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">CelebA Candidate Benchmark</h3>
          <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed">Query across 10,000 multi-attribute instances to extract high-concordance facial structures.</p>
        </div>
        <div className="glass-panel p-8 rounded-2xl text-center">
          <div className="text-cyan-500 dark:text-cyan-400 text-4xl mb-4 font-mono font-bold">03</div>
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">3D Particle Morphing</h3>
          <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed">Interactive Three.js particle dynamics morphing between the genetic globe and photographic composite.</p>
        </div>
      </motion.div>
    </div>
  );
}
