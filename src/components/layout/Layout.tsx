import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-base-bg text-base-text">
      {/* 桌面端侧边栏 */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* 主内容 — 视觉居中 */}
      <main className="md:ml-56 min-h-screen flex flex-col">
        <div className="flex-1 w-full max-w-[820px] mx-auto px-6 md:px-10 py-10 md:py-16 pb-28 md:pb-16">
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
