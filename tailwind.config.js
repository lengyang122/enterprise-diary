/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // 拉丁与中文分开选：
        //   苹果设备 → -apple-system 给到 SF Pro，中文由 PingFang 接管
        //   Windows  → -apple-system / SF Pro 不存在，拉丁落到 Segoe UI Variable（可变字重），
        //              中文继续回落到 PingFang SC（苹方）
        // 注意顺序：Segoe 系列不含中日韩字形，所以不会抢走中文；反过来若把 PingFang 提前，
        // 拉丁也会用苹方的拉丁字形（只有一个字重，粗细无层次）。
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI Variable Text"',
          '"Segoe UI Variable Display"',
          '"Segoe UI Variable"',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Noto Sans SC"',
          '"Microsoft YaHei UI"',
          '"Microsoft YaHei"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
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
        // 一律用 backwards 而不是 both。
        //
        // fill-mode: both 会让元素在动画结束后「保留最后一帧的样式」，
        // 而 riseIn / popIn 的最后一帧带 transform: translateY(0) scale(1) ——
        // 那不是 none，于是元素**永久成为 position: fixed 的包含块**。
        // 后果：这个容器里所有 fixed 元素（详情弹窗、轻提示、遮罩）
        // 都不再相对视口定位，而是相对这个容器 —— 弹窗会跟着页面滚走、
        // 遮罩会撑成整个文档高度、内部也无法滚动。
        // 已经被这个坑咬过三次（「已保存」提示、历史详情弹窗、抽屉遮罩），
        // 在这里一次性修掉，而不是每处都加 portal 绕开。
        //
        // backwards 只保证动画开始前先应用首帧（避免闪一下），结束后不保留任何样式。
        riseIn: 'riseIn 0.5s cubic-bezier(0.34,1.56,0.64,1) backwards',
        fadeIn: 'fadeIn 0.3s cubic-bezier(0.32,0.72,0,1) backwards',
        popIn: 'popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) backwards',
        softPulse: 'softPulse 1.5s ease-in-out infinite',
        drift: 'drift 26s cubic-bezier(0.32,0.72,0,1) infinite alternate',
      },
    },
  },
  plugins: [],
}
