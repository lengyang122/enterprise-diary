import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import GlassBackground from '../GlassBackground'
import { DocIcon } from '../icons'

export default function Layout() {
  return (
    <div className="relative min-h-screen">
      <GlassBackground />

      {/* 桌面端侧边栏 —— 悬浮玻璃面板。safe-sidebar 让它避开横屏手机的侧边刘海 */}
      <div className="hidden md:block fixed z-30 w-[236px] glass-safe-sidebar">
        <Sidebar />
      </div>

      {/* 移动端吸顶栏：safe-* 类会加上 iOS 安全区（刘海 / 灵动岛），横屏时含左右 */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 glass-safe-top">
        <div className="glass rounded-glass-lg flex items-center gap-2.5 px-4 h-[52px]">
          <span
            className="w-7 h-7 rounded-[9px] text-white grid place-items-center shrink-0"
            style={{
              background: 'linear-gradient(160deg,#4EA8FF,#0A84FF)',
              boxShadow: '0 5px 14px -6px rgba(10,132,255,.8), inset 0 1px 0 rgba(255,255,255,.6)',
            }}
          >
            <DocIcon size={15} />
          </span>
          <span className="text-[14.5px] font-semibold tracking-tight">企业实践日记</span>
        </div>
      </header>

      <main className="relative z-10 md:pl-[260px]">
        <div className="mx-auto w-full max-w-[880px] px-3 md:px-6 glass-safe-content">
          <Outlet />
        </div>
      </main>

      {/* 移动端底部导航：safe-bottom 保证不被 Home 指示条压住 */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 glass-safe-bottom">
        <MobileNav />
      </div>
    </div>
  )
}
