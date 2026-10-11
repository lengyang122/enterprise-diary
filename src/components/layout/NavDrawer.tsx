// 抽屉式导航
//
// 取代了原来的「桌面常驻侧栏 + 移动端底部导航」两套结构：
// 收起时页面上只剩一个按钮，背景动效完整露出来；展开时滑入一块玻璃面板。
// 桌面与移动端共用同一套，行为一致，也省掉了底部导航遮挡内容的问题。
import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BriefcaseIcon, WriteIcon, HistoryIcon, SettingsIcon } from '../icons'
import { useBodyScrollLock } from '../../lib/useBodyScrollLock'

const items = [
  { path: '/', label: '新建日记', Icon: WriteIcon },
  { path: '/history', label: '历史记录', Icon: HistoryIcon },
  { path: '/settings', label: '设置', Icon: SettingsIcon },
]

export default function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation()

  // 切换页面后自动收起
  useEffect(() => {
    onClose()
    // 只在路径变化时触发；onClose 每次渲染都是新函数，放进依赖会重复触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Esc 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // 展开时锁掉页面滚动，避免抽屉后面还能滚
  useBodyScrollLock(open)

  return (
    <>
      {/* 遮罩：点一下就收起 */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[rgba(28,38,64,0.16)] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed glass-safe-sidebar z-50 w-[248px] transition-transform duration-[420ms] ease-spring ${
          open ? 'translate-x-0' : '-translate-x-[118%]'
        }`}
      >
        <div className="glass rounded-glass-lg h-full flex flex-col px-4 pt-6 pb-5">
          {/* 品牌 */}
          <div className="flex items-center gap-2.5 px-2 pb-6">
            <span
              className="w-9 h-9 shrink-0 rounded-[12px] text-white grid place-items-center"
              style={{
                background: 'linear-gradient(160deg,#4EA8FF,#0A84FF)',
                boxShadow: '0 6px 16px -6px rgba(10,132,255,.75), inset 0 1px 0 rgba(255,255,255,.6)',
              }}
            >
              <BriefcaseIcon size={19} />
            </span>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold text-ink tracking-tight leading-tight">
                企业实践日记
              </h1>
              <p className="text-[11px] text-ink-tertiary mt-1">记录每一天的成长</p>
            </div>
          </div>

          <nav className="grid gap-[3px]">
            {items.map(({ path, label, Icon }) => (
              <NavLink
                key={path}
                to={path}
                // 收起时移出 Tab 顺序：面板只是滑出视野，仍在 DOM 里
                tabIndex={open ? 0 : -1}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-glass-sm text-[13.5px] nav-item-tap transition-all duration-300 ease-ios ${
                    isActive
                      ? 'bg-white/70 text-ink font-semibold shadow-glass-sm'
                      : 'text-ink-secondary hover:bg-white/55 hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? 'text-accent' : 'opacity-50'}>
                      <Icon size={17} />
                    </span>
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto px-2.5 pt-4 border-t border-hairline">
            <p className="text-[11px] text-ink-tertiary leading-relaxed">
              没有账号，也没有服务器
              <br />
              所有内容只存在这台设备上
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
