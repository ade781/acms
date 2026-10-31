/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        arff: {
          primary: '#b91c1c',    // Deep emergency red
          primaryHover: '#991b1b',
          accent: '#0284c7',     // Airport aviation blue
          accentHover: '#0369a1',
          success: '#15803d',
          warning: '#d97706',
          danger: '#dc2626'
        }
      }
    },
  },
  plugins: [],
};
