/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        base: {
          bg: '#F7F7F5',
          surface: '#FFFFFF',
          text: '#202020',
          secondary: '#8A8A8A',
          muted: '#B8B8B8',
          accent: '#6C6FD5',
          'accent-soft': 'rgba(108, 111, 213, 0.08)',
          line: '#ECECEA',
        }
      },
      borderRadius: {
        input: '12px',
        button: '11px',
        card: '14px',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(0,0,0,0.03)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        softPulse: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.85' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out',
        softPulse: 'softPulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
