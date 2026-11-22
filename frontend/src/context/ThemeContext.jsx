import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('forenai-theme') || 'dark';
  });

  const [bgEffect, setBgEffect] = useState(() => {
    return localStorage.getItem('forenai-bg-effect') || 'glyph';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('forenai-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('forenai-bg-effect', bgEffect);
  }, [bgEffect]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleBgEffect = () => {
    setBgEffect((prev) => (prev === 'glyph' ? 'stars' : 'glyph'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, bgEffect, setBgEffect, toggleBgEffect }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
