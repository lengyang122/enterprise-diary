import { NavLink } from 'react-router-dom'
import { DocIcon, WriteIcon, HistoryIcon, SettingsIcon } from '../icons'

const navItems = [
  { path: '/', label: '新建日记', Icon: WriteIcon },
  { path: '/history', label: '历史记录', Icon: HistoryIcon },
  { path: '/settings', label: '设置', Icon: SettingsIcon },
]

export default function Sidebar() {
  return (
    <aside className="glass rounded-glass-lg h-full flex flex-col px-4 pt-6 pb-5">
      {/* 品牌 */}
      <div className="flex items-center gap-2.5 px-2 pb-6">
        <span
          className="w-9 h-9 shrink-0 rounded-[12px] text-white grid place-items-center"
          style={{
            background: 'linear-gradient(160deg,#4EA8FF,#0A84FF)',
            boxShadow: '0 6px 16px -6px rgba(10,132,255,.75), inset 0 1px 0 rgba(255,255,255,.6)',
          }}
        >
          <DocIcon size={19} />
        </span>
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-ink tracking-tight leading-tight">
            企业实践日记
          </h1>
          <p className="text-[11px] text-ink-tertiary mt-1">记录每一天的成长</p>
        </div>
      </div>

      {/* 导航 */}
      <nav className="grid gap-[3px]">
        {navItems.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-glass-sm text-[13.5px] transition-all duration-300 ease-ios ${
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
        <p className="text-[11px] text-ink-tertiary leading-relaxed">把今天，留成一段记录</p>
      </div>
    </aside>
  )
}
