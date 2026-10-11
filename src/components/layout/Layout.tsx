// 页面骨架
//
// 改版后结构极简：一块背景 + 左上角一个抽屉按钮 + 内容区。
// 原来的「桌面常驻侧栏」与「移动端吸顶栏 + 底部导航」都已移除 ——
// 导航统一收进 NavDrawer，页面平时只有内容，背景动效完整露出。
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import NavDrawer from './NavDrawer'
import GlassBackground from '../GlassBackground'
import { MenuIcon } from '../icons'

export default function Layout() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="relative min-h-screen">
      <GlassBackground />

      {/* 抽屉触发器：收起状态下页面上唯一的常驻控件 */}
      <button
        onClick={() => setNavOpen(true)}
        aria-label="打开导航"
        title="导航"
        className="glass glass-safe-trigger fixed z-30 w-11 h-11 rounded-[14px] grid place-items-center glass-press"
      >
        <MenuIcon size={18} />
      </button>

      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />

      <main className="relative z-10">
        <div className="mx-auto w-full max-w-[760px] glass-safe-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
