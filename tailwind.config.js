/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ronin: {
          blue: '#1273EA',
          dark: '#0A142F',
          card: '#111D42',
          border: '#1E2C5B',
          glow: '#00B2FF'
        },
        cyber: {
          bg: '#080B13',
          card: '#0F1626',
          card2: '#162035',
          border: '#202D49',
          accent: '#10B981',
          gold: '#F59E0B',
          cyan: '#06B6D4',
          danger: '#EF4444'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
