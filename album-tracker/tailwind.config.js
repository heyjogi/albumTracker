/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        white: '#000000',
        brand: {
          50: '#002233',
          100: '#004455',
          200: '#006680',
          300: '#0088aa',
          400: '#00aad4',
          500: '#00f0ff', // main cyan
          600: '#00ccdd',
          700: '#0099aa',
          800: '#006677',
          900: '#003344',
          950: '#00111a',
        },
        slate: {
          50: '#001111',
          100: '#00f0ff',
          200: '#050a0f',
          300: '#00f0ff',
          400: '#00aaaa',
          500: '#00ff00', // neon green accents
          600: '#00f0ff',
          700: '#00f0ff',
          800: '#00f0ff', // main text
          900: '#0a111a',
          950: '#000000',
        }
      },
      fontFamily: {
        sans: ['"Galmuri9"', 'monospace'],
      }
    },
  },
  plugins: [],
}
