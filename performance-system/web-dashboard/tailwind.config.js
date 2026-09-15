export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#00d9ff',
          magenta: '#ff006e',
          purple: '#8b5cf6',
          pink: '#ff006e',
        },
        dark: {
          bg: '#0a0e27',
          surface: '#1a1f3a',
          border: '#2d3748',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        blink: 'blink 1s step-end infinite',
        glow: 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 49%, 100%': { opacity: '1' },
          '50%, 99%': { opacity: '0' },
        },
        glow: {
          '0%, 100%': { 'box-shadow': '0 0 20px rgba(0, 217, 255, 0.5)' },
          '50%': { 'box-shadow': '0 0 40px rgba(0, 217, 255, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
