import { useState } from 'react';
import { motion } from 'framer-motion';
import { generateSyntheticDna as fetchDnaProfile } from '../services/api';

export default function DnaInputPage() {
  const [dnaData, setDnaData] = useState({
    hairColor: 'Black',
    eyeColor: 'Brown',
    faceShape: 'Oval',
    cheekbone: 'High',
    skinTone: 'Medium'
  });

  const [syntheticMarkers, setSyntheticMarkers] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const generateSyntheticDna = async () => {
    setIsLoading(true);
    try {
      const profile = await fetchDnaProfile();
      if (profile && profile.snpMarkers && profile.traits) {
        const markersStr = profile.snpMarkers.map(m => `${m.marker}: ${m.allele}`).join(' | ');
        setSyntheticMarkers(markersStr);
        setDnaData({
          hairColor: profile.traits.hairColor || 'Black',
          eyeColor: profile.traits.eyeColor || 'Brown',
          faceShape: profile.traits.faceShape || 'Oval',
          cheekbone: profile.traits.cheekbone || 'High',
          skinTone: profile.traits.skinTone || 'Medium',
        });
      }
    } catch (error) {
      console.error("Failed to fetch DNA profile", error);
      // Fallback
      setSyntheticMarkers('rs12913832: AA | rs1800407: GG (Mocked Fallback)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h2 className="text-4xl font-bold mb-8 neon-text">DNA Trait Input</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="glass-panel p-6 rounded-lg">
          <h3 className="text-2xl font-semibold mb-6 border-b border-gray-600 pb-2">Phenotype Mapping</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-gray-400 mb-2">Hair Color Prediction</label>
              <select 
                value={dnaData.hairColor}
                onChange={(e) => setDnaData({...dnaData, hairColor: e.target.value})}
                className="w-full bg-darkBg border border-gray-700 rounded p-3 text-white focus:border-cyberBlue outline-none transition-colors"
              >
                <option>Black</option>
                <option>Brown</option>
                <option>Blonde</option>
                <option>Red</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-2">Eye Color Prediction</label>
              <select 
                value={dnaData.eyeColor}
                onChange={(e) => setDnaData({...dnaData, eyeColor: e.target.value})}
                className="w-full bg-darkBg border border-gray-700 rounded p-3 text-white focus:border-cyberBlue outline-none transition-colors"
              >
                <option>Brown</option>
                <option>Blue</option>
                <option>Green</option>
                <option>Hazel</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-2">Face Shape</label>
              <select 
                value={dnaData.faceShape}
                onChange={(e) => setDnaData({...dnaData, faceShape: e.target.value})}
                className="w-full bg-darkBg border border-gray-700 rounded p-3 text-white focus:border-cyberBlue outline-none transition-colors"
              >
                <option>Oval</option>
                <option>Round</option>
                <option>Square</option>
                <option>Heart</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-400 mb-2">Cheekbone Structure</label>
              <input 
                type="range" 
                min="0" max="100" 
                className="w-full accent-cyberBlue"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Skin Tone</label>
              <select 
                value={dnaData.skinTone}
                onChange={(e) => setDnaData({...dnaData, skinTone: e.target.value})}
                className="w-full bg-darkBg border border-gray-700 rounded p-3 text-white focus:border-cyberBlue outline-none transition-colors"
              >
                <option>Fair</option>
                <option>Medium</option>
                <option>Olive</option>
                <option>Brown</option>
                <option>Dark</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-lg flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-semibold mb-6 border-b border-gray-600 pb-2">Synthetic DNA Generator</h3>
            <p className="text-gray-400 mb-4 text-sm leading-relaxed">
              Generate synthetic genotype profiles inspired by HIrisPlex-S markers. These markers map to trait probabilities used to condition the GAN generation.
            </p>
            
            <div className="bg-darkBg p-4 rounded border border-gray-800 h-32 font-mono text-sm text-cyberBlue flex items-center justify-center break-all text-center">
              {syntheticMarkers || "No markers generated yet. Click below to synthesize."}
            </div>
          </div>

          <button 
            onClick={generateSyntheticDna}
            disabled={isLoading}
            className="w-full py-4 mt-6 bg-transparent border-2 border-cyberPurple text-cyberPurple hover:bg-cyberPurple hover:text-white font-bold rounded transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Synthesizing...' : 'Generate Synthetic Markers'}
          </button>
        </div>
      </div>
    </div>
  );
}
