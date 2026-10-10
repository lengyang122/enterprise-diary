import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { DocIcon } from '../icons'

export default function Layout() {
  return (
    <div className="min-h-screen bg-base-bg text-base-text">
      {/* 桌面端侧边栏 */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* 移动端顶栏 */}
      <header className="md:hidden sticky top-0 z-30 bg-base-bg/85 backdrop-blur-md border-b border-base-line">
        <div className="px-5 h-14 flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[9px] bg-base-accent text-white grid place-items-center shadow-accent">
            <DocIcon size={15} />
          </span>
          <span className="text-[14px] font-semibold tracking-tight">企业实践日记</span>
        </div>
      </header>

      {/* 主内容 — 视觉居中 */}
      <main className="md:ml-60 min-h-screen flex flex-col">
        <div className="flex-1 w-full max-w-[860px] mx-auto px-5 md:px-10 py-8 md:py-14 pb-32 md:pb-16">
          <Outlet />
        </div>
      </main>

      {/* 移动端底部导航 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <MobileNav />
      </div>
    </div>
  )
}
