import { NavLink } from 'react-router-dom'

// 线性图标（极简 SVG，非 emoji）
const icons = {
  write: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
    </svg>
  ),
  history: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5.5V8l2 1.5" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
    </svg>
  ),
  growth: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 13.5h12" />
      <path d="M4 13.5V9M7.5 13.5V6M11 13.5V3" />
    </svg>
  ),
}

const navItems = [
  { path: '/', label: '新建日记', icon: icons.write },
  { path: '/history', label: '历史记录', icon: icons.history },
  { path: '/growth', label: '成长分析', icon: icons.growth, disabled: true },
  { path: '/settings', label: '设置', icon: icons.settings },
]

export default function Sidebar() {
  return (
    <aside className="w-56 h-screen bg-base-bg flex flex-col py-8 px-3 fixed left-0 top-0 overflow-y-auto border-r border-base-line/60">
      {/* Logo — 安静克制 */}
      <div className="px-3 mb-8">
        <h1 className="text-[15px] font-medium text-base-text tracking-wide">
          企业实践日记
        </h1>
        <p className="text-xs text-base-muted mt-1">
          记录每一天的成长
        </p>
      </div>

      {/* 导航 — 弱视觉 */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => (
          item.disabled ? (
            <div
              key={item.path}
              className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] text-base-muted cursor-default"
              title="即将上线"
            >
              <span className="opacity-60">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] transition-all duration-150 ${
                  isActive
                    ? 'bg-base-accent-soft text-base-text font-medium'
                    : 'text-base-secondary hover:bg-base-surface hover:text-base-text'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          )
        ))}
      </nav>

      {/* 底部 — 极简 */}
      <div className="px-3 pt-6 mt-4 border-t border-base-line/60">
        <p className="text-[11px] text-base-muted leading-relaxed">
          把今天，留成一段记录
        </p>
      </div>
    </aside>
  )
}
