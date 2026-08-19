/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fc',
          400: '#36adfa',
          500: '#0c92eb',
          600: '#0074ce',
          700: '#015da7',
          800: '#064e8a',
          900: '#0b4272',
          950: '#072a4b',
        },
        surface: {
          light: '#ffffff',
          'light-subtle': '#f8fafc',
          dark: '#0f172a',
          'dark-subtle': '#1e293b',
          'dark-card': '#1a2234',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'Menlo', 'monospace'],
        serif: ['Charter', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
