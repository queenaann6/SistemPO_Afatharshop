/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        peach: {
          DEFAULT: '#FFE5D4',
          50: '#FFF7F2',
          100: '#FFF0E7',
          200: '#FFE5D4',
          300: '#FED2B8',
          400: '#FDBB97',
        },
        maroon: {
          DEFAULT: '#6B1416',
          900: '#4D0B0D',
          800: '#540D0F',
          700: '#6B1416',
          600: '#7C181B',
        },
        gold: {
          DEFAULT: '#F0C973',
          light: '#F5DC9F',
          dark: '#E5BC64',
          deep: '#C27E43'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        cinzel: ['"Cinzel"', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
