/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode support
  theme: {
    extend: {
      colors: {
        'medical-blue': '#0A2540',
        'medical-light': '#F8FAFC',
      }
    },
  },
  plugins: [],
}
