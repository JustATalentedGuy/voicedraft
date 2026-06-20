export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f0f',
        surface: '#1a1a1a',
        surfaceHigh: '#252525',
        accent: '#14b8a6',
        accentLight: '#5eead4',
        danger: '#ef4444',
        textPrimary: '#f5f5f5',
        textMuted: '#a3a3a3',
        activePara: '#1c3a38',
        clipDefault: '#0d9488',
        clipSelected: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
