/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: '#090909',
        graphite: '#121212',
        brand: '#5b52e0'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif']
      }
    }
  },
  plugins: [],
}
