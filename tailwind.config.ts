import type { Config } from 'tailwindcss'

export default {
  content: [
    "./app/**/*.{vue,js,ts,jsx,tsx}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./components/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {
      colors: {
        caro: {
          bg: {
            dark: '#09150f',
            deep: '#06120c',
          },
          accent: '#9ed8b0',
          text: '#e7f3eb',
          x: '#8ecae6',
          o: '#f2cc8f',
        }
      },
      fontFamily: {
        caro: ['"Alegreya Sans"', 'sans-serif'],
      },
      animation: {
        'caro-pulse': 'caro-pulse 1s infinite',
      },
      keyframes: {
        'caro-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        }
      },
      boxShadow: {
        toast: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
} satisfies Config
