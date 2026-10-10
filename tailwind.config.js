/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        // iOS 系统语义色
        ink: {
          DEFAULT: '#1C1C1E',
          secondary: 'rgba(60, 60, 67, 0.62)',
          tertiary: 'rgba(60, 60, 67, 0.34)',
        },
        hairline: 'rgba(60, 60, 67, 0.12)',
        accent: {
          DEFAULT: '#0A84FF',
          hover: '#0A78E8',
          soft: 'rgba(10, 132, 255, 0.12)',
          ring: 'rgba(10, 132, 255, 0.22)',
        },
        warn: { DEFAULT: '#B26B00', soft: 'rgba(178, 107, 0, 0.13)' },
        ok: { DEFAULT: '#1B7A4B', soft: 'rgba(27, 122, 75, 0.13)' },
        danger: { DEFAULT: '#D70015', soft: 'rgba(215, 0, 21, 0.09)' },
      },
      borderRadius: {
        'glass-lg': '26px',
        glass: '20px',
        'glass-sm': '14px',
      },
      boxShadow: {
        // 玻璃的「厚度」来自内侧上下高光，不是外阴影
        glass:
          'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(255,255,255,0.28), 0 10px 40px -14px rgba(28,38,64,0.24)',
        'glass-lift':
          'inset 0 1px 0 rgba(255,255,255,0.95), 0 18px 46px -18px rgba(28,38,64,0.3)',
        'glass-ring':
          'inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 3.5px rgba(10,132,255,0.22), 0 18px 46px -18px rgba(28,38,64,0.3)',
        'glass-sm':
          'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 10px -4px rgba(28,38,64,0.2)',
        accent:
          '0 10px 26px -10px rgba(10,132,255,0.9), inset 0 1px 0 rgba(255,255,255,0.45)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        ios: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'translateY(18px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        softPulse: {
          '0%, 100%': { opacity: '0.28' },
          '50%': { opacity: '1' },
        },
        // 背景光斑超慢漂移 —— 让界面像在呼吸
        drift: {
          '0%': { transform: 'translate3d(0,0,0) scale(1)' },
          '100%': { transform: 'translate3d(60px,44px,0) scale(1.12)' },
        },
      },
      animation: {
        riseIn: 'riseIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        fadeIn: 'fadeIn 0.3s cubic-bezier(0.32,0.72,0,1) both',
        popIn: 'popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
        softPulse: 'softPulse 1.5s ease-in-out infinite',
        drift: 'drift 26s cubic-bezier(0.32,0.72,0,1) infinite alternate',
      },
    },
  },
  plugins: [],
}
