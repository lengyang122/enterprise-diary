import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import GlassBackground from '../GlassBackground'
import { DocIcon } from '../icons'

export default function Layout() {
  return (
    <div className="relative min-h-screen">
      <GlassBackground />

      {/* 桌面端侧边栏 —— 悬浮玻璃面板 */}
      <div className="hidden md:block fixed left-3 top-3 bottom-3 z-30 w-[236px]">
        <Sidebar />
      </div>

      {/* 移动端吸顶栏 */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 px-3 pt-3">
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
        <div className="mx-auto w-full max-w-[880px] px-3 md:px-6 pt-[76px] md:pt-3 pb-32 md:pb-6">
          <Outlet />
        </div>
      </main>

      {/* 移动端底部导航 */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-3">
        <MobileNav />
      </div>
    </div>
  )
}
