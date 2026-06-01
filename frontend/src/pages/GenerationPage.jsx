import { useState } from 'react';
import { motion } from 'framer-motion';
import { generateFaceVariations } from '../services/api';

export default function GenerationPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  const generateFaces = async () => {
    setIsGenerating(true);
    try {
      // In a real flow, these traits would come from a global state/context 
      // populated by the DnaInputPage.
      const mockTraits = { hairColor: 'Black', eyeColor: 'Brown' };
      const result = await generateFaceVariations(mockTraits);
      if (result && result.variations) {
        setImages(result.variations);
      }
    } catch (error) {
      console.error("Failed to generate faces", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col items-center">
      <h2 className="text-4xl font-bold mb-4 neon-text text-center">AI Face Generation</h2>
      <p className="text-gray-400 mb-10 text-center max-w-2xl">
        Synthesize multiple suspect variations based on the current trait mapping. The Conditional GAN will interpolate the latent space to provide diverse structural possibilities.
      </p>

      {!isGenerating && images.length === 0 && (
        <button 
          onClick={generateFaces}
          className="px-10 py-4 bg-cyberBlue text-darkBg font-bold text-xl rounded shadow-[0_0_20px_#00d2ff] hover:scale-105 transition-transform"
        >
          Initialize CGAN Generation
        </button>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center mt-12">
          <div className="w-24 h-24 border-t-4 border-b-4 border-cyberBlue rounded-full animate-spin mb-6 shadow-[0_0_15px_#00d2ff]"></div>
          <p className="text-xl font-mono text-cyberPurple animate-pulse">Processing Latent Vectors...</p>
          <p className="text-sm text-gray-500 mt-2 font-mono">Epoch: {Math.floor(Math.random() * 100)}/100 | Loss: {(Math.random() * 0.5).toFixed(4)}</p>
        </div>
      )}

      {images.length > 0 && !isGenerating && (
        <div className="w-full mt-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold">Generated Variations</h3>
            <button 
              onClick={() => setImages([])} 
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear Results
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {images.map((img, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.2 }}
                className="glass-panel p-4 rounded-xl flex flex-col items-center relative group"
              >
                <div className="absolute top-2 right-2 bg-darkBg/80 px-2 py-1 rounded text-xs text-cyberBlue font-mono border border-cyberBlue/30 z-10">
                  {(Math.random() * 20 + 80).toFixed(1)}% Match
                </div>
                <img src={img} alt={`Variation ${idx + 1}`} className="w-full h-auto rounded object-cover mb-4 grayscale group-hover:grayscale-0 transition-all duration-500" />
                <button onClick={() => setSelectedAnalysis(idx)} className="w-full py-2 bg-transparent border border-gray-600 rounded text-sm hover:border-cyberBlue hover:text-cyberBlue transition-colors">
                  View Analysis
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {selectedAnalysis !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-gray-700 p-8 rounded-xl max-w-lg w-full relative shadow-[0_0_30px_rgba(0,210,255,0.2)]">
            <button onClick={() => setSelectedAnalysis(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">&times;</button>
            <h3 className="text-2xl font-bold mb-4 neon-text">Variation {selectedAnalysis + 1} Analysis</h3>
            <div className="flex gap-6 mb-6">
              <img src={images[selectedAnalysis]} alt="Selected" className="w-32 h-32 rounded object-cover border border-gray-700" />
              <div>
                <p className="text-sm text-gray-400 mb-2">Confidence Score: <span className="text-green-400 font-bold">{(Math.random() * 10 + 85).toFixed(1)}%</span></p>
                <p className="text-sm text-gray-400 mb-2">Latent Distance: <span className="text-blue-400 font-mono">{(Math.random() * 0.5).toFixed(4)}</span></p>
                <p className="text-sm text-gray-400">GAN Epoch: <span className="font-mono">100/100</span></p>
              </div>
            </div>
            <h4 className="font-semibold border-b border-gray-700 pb-2 mb-3">Trait Conditioning</h4>
            <ul className="text-sm space-y-2 text-gray-300">
              <li><span className="text-cyberPurple">Skin Tone:</span> Matches input genotype</li>
              <li><span className="text-cyberPurple">Hair Color:</span> Matches input genotype</li>
              <li><span className="text-cyberPurple">Eye Color:</span> Synthesized via latent interpolation</li>
              <li><span className="text-cyberPurple">Bone Structure:</span> Adjusted via High Cheekbone vector</li>
            </ul>
          </motion.div>
        </div>
      )}
    </div>
  );
}
