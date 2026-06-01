import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center pt-20 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-4xl"
      >
        <h1 className="text-5xl md:text-7xl font-bold mb-6 neon-text tracking-tight">
          Synthesize Suspects from DNA
        </h1>
        <p className="text-xl text-gray-300 mb-10 leading-relaxed">
          Advanced AI-powered forensic simulation system using Conditional GANs to generate approximate suspect facial images from hair samples and synthetic genetic markers.
        </p>
        
        <div className="flex justify-center gap-6">
          <Link to="/dna-input" className="px-8 py-4 bg-cyberBlue text-darkBg font-bold text-lg rounded shadow-[0_0_20px_#00d2ff] hover:scale-105 transition-transform">
            Initialize DNA Mapping
          </Link>
          <Link to="/ethics" className="px-8 py-4 glass-panel border border-cyberPurple text-white font-bold text-lg rounded hover:bg-cyberPurple/20 transition-all">
            Review Ethical Guidelines
          </Link>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl"
      >
        <div className="glass-panel p-8 rounded-xl text-center">
          <div className="text-cyberBlue text-4xl mb-4 font-mono">01</div>
          <h3 className="text-2xl font-bold mb-2">Genetic Parsing</h3>
          <p className="text-gray-400">Map HIrisPlex-S inspired markers to phenotypic traits like hair, eye color, and bone structure.</p>
        </div>
        <div className="glass-panel p-8 rounded-xl text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-cyberPurple/10 to-transparent"></div>
          <div className="text-cyberPurple text-4xl mb-4 font-mono">02</div>
          <h3 className="text-2xl font-bold mb-2">CGAN Synthesis</h3>
          <p className="text-gray-400">Process latent vectors through conditional networks trained on the CelebA dataset for diverse variations.</p>
        </div>
        <div className="glass-panel p-8 rounded-xl text-center">
          <div className="text-red-400 text-4xl mb-4 font-mono">03</div>
          <h3 className="text-2xl font-bold mb-2">Ethical Output</h3>
          <p className="text-gray-400">Generations are approximations heavily influenced by dataset bias, rendered strictly for simulation.</p>
        </div>
      </motion.div>
    </div>
  );
}
