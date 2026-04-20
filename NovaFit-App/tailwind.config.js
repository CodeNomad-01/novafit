/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rajdhani', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'Rajdhani', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 30px rgba(92, 225, 255, 0.35)',
        'glow-violet': '0 0 30px rgba(168, 123, 255, 0.35)',
      },
    },
  },
  plugins: [],
}
