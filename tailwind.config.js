/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Inter',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        'brand-yellow': 'var(--brand-color, #0043f7)',
        'custom-yellow': 'var(--brand-color, #0043f7)',
        'brand-dark': '#0c0e0b',
        // Paleta oficial (cada afiliado pode sobrescrever brand-yellow/custom-yellow
        // via --brand-color; estes tokens fixos servem para uso direto no código)
        'brand-primary': '#0043f7',
        'brand-bg': '#ebf0f6',
        'brand-ink': '#0c0e0b',
        'brand-neutral': '#707070',
      },
    },
  },
  plugins: [],
};
