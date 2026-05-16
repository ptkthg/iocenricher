/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#030d1c',
          800: '#081628',
          700: '#0c1e36',
          600: '#112540',
        },
        accent: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          dark: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
}
