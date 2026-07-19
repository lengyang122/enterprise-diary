import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: '📝 新建日记', icon: '📝' },
  { path: '/history', label: '📚 历史记录', icon: '📚' },
  { path: '/settings', label: '⚙️ 设置', icon: '⚙️' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 h-screen bg-notion-sidebar border-r border-notion-border flex flex-col py-4 px-2 fixed left-0 top-0 overflow-y-auto">
      {/* Logo区域 */}
      <div className="px-3 mb-6">
        <h1 className="text-lg font-semibold text-notion-text tracking-tight">
        企业实践日记
        </h1>
        <p className="text-xs text-notion-text-secondary mt-1">
          中国计量大学 · 质卓4班
        </p>
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-notion-hover text-notion-text font-medium'
                  : 'text-notion-text-secondary hover:bg-notion-hover hover:text-notion-text'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 底部 */}
      <div className="px-3 pt-4 border-t border-notion-border mt-4">
        <p className="text-xs text-notion-text-secondary">
          PQE · 余姚舜宇智能光学
        </p>
      </div>
    </aside>
  )
}
