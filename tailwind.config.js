export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        orb: {
          blue:    '#4F8BFF',
          purple:  '#9B7BFF',
          teal:    '#00D4FF',
          magenta: '#E91E8C',
          pink:    '#FF6B9D',
          green:   '#10B981',
        }
      }
    }
  }
}