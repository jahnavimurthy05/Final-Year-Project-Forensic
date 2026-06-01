module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyberBlue: '#00d2ff',
        cyberPurple: '#3a7bd5',
        darkBg: '#0f172a',
        glassBg: 'rgba(15, 23, 42, 0.7)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
