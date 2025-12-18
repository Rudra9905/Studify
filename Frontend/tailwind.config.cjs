/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f2ff',
          100: '#d6e7ff',
          500: '#4f9cff',
          600: '#3f8cff',
          700: '#2563eb'
        },
        accent: {
          50: '#e9f4ff',
          100: '#d3e7ff',
          500: '#6fb3ff',
          600: '#4a9bff'
        }
      },
      boxShadow: {
        soft: '0 10px 25px rgba(15, 23, 42, 0.06)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      }
    }
  },
  plugins: [],
};
