/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        galaxy: '#1D3B8B',
        darkGrey: '#2B2B2B',
        gain: '#28A745',
        loss: '#D9534F',
        primary: {
          50: '#e6f7ff',
          100: '#b3e0ff',
          200: '#80caff',
          300: '#4db3ff',
          400: '#1a9cff',
          500: '#0086e6',
          600: '#006bb3',
          700: '#005080',
          800: '#00364d',
          900: '#001b26',
        },
        secondary: {
          50: '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#ced4da',
          400: '#adb5bd',
          500: '#6c757d',
          600: '#495057',
          700: '#343a40',
          800: '#212529',
          900: '#121416',
        },
        accent: {
          50: '#fff3e6',
          100: '#ffe0b3',
          200: '#ffcc80',
          300: '#ffb84d',
          400: '#ffa41a',
          500: '#e68a00',
          600: '#b36b00',
          700: '#804c00',
          800: '#4d2d00',
          900: '#261700',
        }
      },
      fontFamily: {
        // Body text
        sans: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        // Headings
        display: ['Inter', 'system-ui', 'sans-serif'],
        // Numbers / tables
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      letterSpacing: {
        heading: '-0.005em' // roughly -0.5%
      }
    },
  },
  plugins: [],
} 