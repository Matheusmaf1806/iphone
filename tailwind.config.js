/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-yellow': 'var(--brand-color, #f60c49)',
        'custom-yellow': 'var(--brand-color, #f60c49)',
        'brand-dark': '#101942',
      },
    },
  },
  plugins: [],
};
