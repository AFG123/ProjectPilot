/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        surface: {
          DEFAULT: '#0d0d14',
          card:    '#13131f',
          border:  '#1e1e2e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.18), transparent)',
      },
    },
  },
  plugins: [],
};
