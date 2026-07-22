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
        dark: {
          bg: '#0b0f19',
          sidebar: '#0d121f',
          card: '#13192b',
          border: '#1e293b',
        }
      }
    },
  },
  plugins: [],
}
