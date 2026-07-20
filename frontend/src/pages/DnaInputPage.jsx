import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { generateSyntheticDna as fetchDnaProfile } from '../services/api';
import { useDna } from '../context/DnaContext';

export default function DnaInputPage() {
  const navigate = useNavigate();
  const { dnaState, updateTraits, setFullProfile } = useDna();
  const [isLoading, setIsLoading] = useState(false);

  const handleTraitChange = (key, value) => {
    updateTraits({ [key]: value });
  };

  const generateSyntheticDna = async () => {
    setIsLoading(true);
    try {
      const profile = await fetchDnaProfile();
      if (profile) {
        setFullProfile(profile);
      }
    } catch (error) {
      console.error("Failed to fetch DNA profile", error);
      setFullProfile({
        snpMarkers: [{ marker: 'rs12913832', allele: 'AG' }, { marker: 'rs1800407', allele: 'GG' }],
        traits: { hairColor: 'Brown', eyeColor: 'Hazel', skinTone: 'Medium' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h2 className="text-4xl font-bold mb-8 neon-text">DNA Trait Input & Phenotyping</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="glass-panel p-6 rounded-lg">
          <h3 className="text-2xl font-semibold mb-6 border-b border-gray-600 pb-2">Phenotype Trait Mapping</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-gray-400 mb-2">Hair Color</label>
              <select 
                value={dnaState.traits.hairColor || 'Black'}
                onChange={(e) => handleTraitChange('hairColor', e.target.value)}
                className="w-full bg-darkBg border border-gray-700 rounded p-3 text-white focus:border-cyberBlue outline-none transition-colors capitalize"
              >
                <option value="black">Black</option>
                <option value="brown">Brown</option>
                <option value="blonde">Blonde</option>
                <option value="red">Red</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-2">Eye Color</label>
              <select 
                value={dnaState.traits.eyeColor || 'Brown'}
                onChange={(e) => handleTraitChange('eyeColor', e.target.value)}
                className="w-full bg-darkBg border border-gray-700 rounded p-3 text-white focus:border-cyberBlue outline-none transition-colors capitalize"
              >
                <option value="brown">Brown</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="hazel">Hazel</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-2">Skin Tone</label>
              <select 
                value={dnaState.traits.skinTone || 'Medium'}
                onChange={(e) => handleTraitChange('skinTone', e.target.value)}
                className="w-full bg-darkBg border border-gray-700 rounded p-3 text-white focus:border-cyberBlue outline-none transition-colors capitalize"
              >
                <option value="fair">Fair</option>
                <option value="medium">Medium</option>
                <option value="olive">Olive</option>
                <option value="brown">Brown</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-2">Face Shape</label>
              <select 
                value={dnaState.traits.faceShape || 'Oval'}
                onChange={(e) => handleTraitChange('faceShape', e.target.value)}
                className="w-full bg-darkBg border border-gray-700 rounded p-3 text-white focus:border-cyberBlue outline-none transition-colors capitalize"
              >
                <option value="oval">Oval</option>
                <option value="round">Round</option>
                <option value="square">Square</option>
                <option value="heart">Heart</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-lg flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-semibold mb-6 border-b border-gray-600 pb-2">HIrisPlex-S DNA Synthesizer</h3>
            <p className="text-gray-400 mb-4 text-sm leading-relaxed">
              Generate synthetic genotype profiles using standard HIrisPlex-S markers (HERC2, OCA2, SLC45A2, MC1R). These markers determine probabilistic trait predictions.
            </p>
            
            <div className="bg-darkBg p-4 rounded border border-gray-800 h-32 font-mono text-sm text-cyberBlue flex items-center justify-center break-all text-center">
              {dnaState.rawMarkerString || "No markers generated yet. Click below to synthesize."}
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <button 
              onClick={generateSyntheticDna}
              disabled={isLoading}
              className="w-full py-3 bg-transparent border-2 border-cyberPurple text-cyberPurple hover:bg-cyberPurple hover:text-white font-bold rounded transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Synthesizing...' : 'Synthesize HIrisPlex-S Markers'}
            </button>

            <button 
              onClick={() => navigate('/generate')}
              className="w-full py-4 bg-cyberBlue text-darkBg font-bold text-lg rounded shadow-[0_0_15px_#00d2ff] hover:scale-102 transition-transform"
            >
              Proceed to Facial Synthesis →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

