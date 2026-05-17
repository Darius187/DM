/** uni-silent.de Tailwind-Konfig */
module.exports = {
  content: [
    '../public/**/*.php',
    '../public/**/*.html',
    '../app/views/**/*.php',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1e3a5f',
          50:  '#eef3f9',
          100: '#d6e1ee',
          200: '#aec3dc',
          300: '#7e9ec3',
          400: '#5079a8',
          500: '#34598b',
          600: '#264870',
          700: '#1e3a5f', // primary
          800: '#172d4a',
          900: '#101f33',
        },
        // accent = Industrie-Stahlgrau (laut 03-design-und-content.md).
        // Ersetzt das frühere Orange; die Code-Stellen "accent-500" etc. bleiben
        // unverändert, nur die Hex-Werte aendern sich.
        accent: {
          DEFAULT: '#64748b',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        '8xl': '88rem',
      },
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up .5s ease-out both',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
