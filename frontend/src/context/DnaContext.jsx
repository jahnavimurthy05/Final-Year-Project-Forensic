import { createContext, useContext, useState } from 'react';

const DnaContext = createContext();

export function DnaProvider({ children }) {
  const [dnaState, setDnaState] = useState({
    snpMarkers: [],
    traits: {
      hairColor: 'Black',
      eyeColor: 'Brown',
      faceShape: 'Oval',
      cheekbone: 'High',
      skinTone: 'Medium',
    },
    probabilities: {},
    rawMarkerString: '',
  });

  const updateTraits = (newTraits) => {
    setDnaState((prev) => ({
      ...prev,
      traits: { ...prev.traits, ...newTraits },
    }));
  };

  const setFullProfile = (profile) => {
    setDnaState((prev) => ({
      ...prev,
      snpMarkers: profile.snpMarkers || prev.snpMarkers,
      traits: profile.traits ? { ...prev.traits, ...profile.traits } : prev.traits,
      probabilities: profile.probabilities || prev.probabilities,
      rawMarkerString: profile.snpMarkers
        ? profile.snpMarkers.map((m) => `${m.marker}: ${m.allele}`).join(' | ')
        : prev.rawMarkerString,
    }));
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
