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
        accent: {
          DEFAULT: '#f97316',
          50:  '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
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
