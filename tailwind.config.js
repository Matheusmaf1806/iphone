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
        'brand-yellow': 'var(--brand-color, #0071e3)',
        'custom-yellow': 'var(--brand-color, #0071e3)',
        'brand-dark': '#101942',
      },
    },
  },
  plugins: [],
};
