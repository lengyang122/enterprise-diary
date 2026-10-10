import { NavLink } from 'react-router-dom'
import { DocIcon, WriteIcon, HistoryIcon, SettingsIcon } from '../icons'

const navItems = [
  { path: '/', label: '新建日记', Icon: WriteIcon },
  { path: '/history', label: '历史记录', Icon: HistoryIcon },
  { path: '/settings', label: '设置', Icon: SettingsIcon },
]

export default function Sidebar() {
  return (
    <aside className="w-60 h-screen bg-base-surface border-r border-base-line flex flex-col fixed left-0 top-0 z-30">
      {/* 品牌 */}
      <div className="px-5 pt-7 pb-7 flex items-center gap-3">
        <span className="w-9 h-9 shrink-0 rounded-[11px] bg-base-accent text-white grid place-items-center shadow-accent">
          <DocIcon size={19} />
        </span>
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-base-text tracking-tight leading-tight">
            企业实践日记
          </h1>
          <p className="text-[11px] text-base-muted mt-1">记录每一天的成长</p>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `group relative flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] text-[13px] transition-all duration-200 ${
                isActive
                  ? 'bg-base-accent-soft text-base-accent font-medium'
                  : 'text-base-secondary hover:bg-base-bg hover:text-base-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-base-accent' : 'text-base-muted'}>
                  <Icon size={17} />
                </span>
                <span>{label}</span>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-base-accent" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-5 border-t border-base-line">
        <p className="text-[11px] text-base-muted leading-relaxed">把今天，留成一段记录</p>
      </div>
    </aside>
  )
}
