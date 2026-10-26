import { createContext, useContext, useState } from 'react';

const DnaContext = createContext();

export function DnaProvider({ children }) {
  const [dnaState, setDnaState] = useState({
    snpMarkers: [],
    traits: {
      sex: 'male',                 // Modality 1: Witness-Observed Physical Sex
      dnaSex: 'male',              // Modality 2: Biological Sex derived from DNA sample
      amelogenin: 'XY',            // DNA chromosomal sex marker
      hairColor: 'black',
      eyeColor: 'brown',
      // faceShape: 'oval',  // commented out — not used
      cheekbone: 'high',
      skinTone: 'medium',
      observedHairColor: 'black',  // Modality 1: Physical Hair Evidence Record
    },
    probabilities: {},
    rawMarkerString: '',
  });

  const updateTraits = (newTraits) => {
    setDnaState((prev) => {
      const merged = { ...prev.traits, ...newTraits };
      // Keep observedHairColor and hairColor strictly in sync
      if (newTraits.observedHairColor) {
        merged.hairColor = newTraits.observedHairColor;
      } else if (newTraits.hairColor) {
        merged.observedHairColor = newTraits.hairColor;
      }
      return {
        ...prev,
        traits: merged,
      };
    });
  };

  const setFullProfile = (profile) => {
    setDnaState((prev) => {
      // The user's physical selection is the ground truth for physical traits
      const currentHair = prev.traits.observedHairColor || prev.traits.hairColor || 'black';
      const dnaSex = (profile.traits?.sex || prev.traits.dnaSex || 'male').toLowerCase();
      const amel = dnaSex === 'male' ? 'XY' : 'XX';

      return {
        ...prev,
        snpMarkers: profile.snpMarkers || prev.snpMarkers,
        traits: profile.traits
          ? {
              ...prev.traits,
              ...profile.traits,
              // Keep witness-observed sex in traits.sex; store DNA biological sex in traits.dnaSex
              sex: prev.traits.sex,
              dnaSex: dnaSex,
              amelogenin: amel,
              // Strictly preserve and sync user's hair selection
              observedHairColor: currentHair,
              hairColor: currentHair,
            }
          : prev.traits,
        probabilities: profile.probabilities || prev.probabilities,
        rawMarkerString: profile.snpMarkers
          ? profile.snpMarkers.map((m) => `${m.marker}: ${m.allele}`).join(' | ')
          : prev.rawMarkerString,
      };
    });
  };

  return (
    <DnaContext.Provider value={{ dnaState, updateTraits, setFullProfile }}>
      {children}
    </DnaContext.Provider>
  );
}

export function useDna() {
  const context = useContext(DnaContext);
  if (!context) {
    throw new Error('useDna must be used within a DnaProvider');
  }
  return context;
}
