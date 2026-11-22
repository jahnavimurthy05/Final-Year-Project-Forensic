module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyberBlue: '#00d2ff',
        cyberPurple: '#3a7bd5',
        cyberTeal: '#14b8a6',
        darkBg: '#0a0e17',
        lightBg: '#f8fafc',
        glassBg: 'rgba(15, 23, 42, 0.7)',
        glassLight: 'rgba(255, 255, 255, 0.85)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
