/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        base: {
          // 底色略微压深，让白色卡片真正浮起来
          bg: '#F4F4F1',
          surface: '#FFFFFF',
          sunken: '#EFEFEC',
          text: '#191A1E',
          // 正文层级拉开对比
          secondary: '#63636D',
          muted: '#9B9BA4',
          line: '#E7E7E3',
          'line-strong': '#D9D9D4',
          accent: '#5B5FD6',
          'accent-hover': '#4C50C6',
          'accent-soft': 'rgba(91, 95, 214, 0.09)',
          'accent-ring': 'rgba(91, 95, 214, 0.22)',
          amber: '#B5761A',
          'amber-soft': 'rgba(181, 118, 26, 0.10)',
          success: '#1B7A4B',
          'success-soft': 'rgba(27, 122, 75, 0.10)',
        },
      },
      borderRadius: {
        input: '12px',
        button: '11px',
        card: '16px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(18, 18, 28, 0.04)',
        // 卡片：极淡的贴地阴影 + 大范围柔光，制造层次
        card: '0 1px 2px rgba(18, 18, 28, 0.04), 0 10px 28px -18px rgba(18, 18, 28, 0.22)',
        lift: '0 2px 6px rgba(18, 18, 28, 0.06), 0 18px 44px -20px rgba(18, 18, 28, 0.28)',
        accent: '0 6px 18px -8px rgba(91, 95, 214, 0.55)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        softPulse: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
        riseIn: 'riseIn 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
        softPulse: 'softPulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
