/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#faebe8',
          100: '#f4d3cd',
          200: '#eeb5aa',
          300: '#e69080',
          400: '#df705c',
          500: '#d93915',
          600: '#b52c0f',
          700: '#8f230d',
          800: '#731e0c',
          900: '#5c1a0c',
          950: '#330c04',
        },
        slate: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#cdd2d5',
          300: '#b6bcc0',
          400: '#9aa0a6',
          500: '#80868b',
          600: '#5d5e61',
          700: '#4a4b4d',
          800: '#5d5e61', // Map 800 to the requested text color so we don't have to change all classes
          900: '#202124',
          950: '#171717',
        }
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
