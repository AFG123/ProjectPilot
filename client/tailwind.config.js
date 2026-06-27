/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // brand = the violet primary; accent = the pink used in the duotone
        // gradient (brand -> accent). Shifted from the old indigo for the
        // "Bold Editorial" direction.
        brand: {
          50:  '#f1eeff',
          100: '#e4ddff',
          400: '#9b87ff',
          500: '#7c5cff',
          600: '#6a45f5',
        },
        accent: {
          400: '#ff7db0',
          500: '#ff5d9e',
          600: '#f43f8e',
        },
        surface: {
          DEFAULT: '#08080f',
          card:    '#13131f',
          border:  '#20202e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,92,255,0.18), transparent)',
        'hero-duo': 'radial-gradient(circle at 22% -10%, rgba(124,92,255,0.30), transparent 45%), radial-gradient(circle at 82% 0%, rgba(255,93,158,0.22), transparent 45%)',
      },
    },
  },
  plugins: [],
};
