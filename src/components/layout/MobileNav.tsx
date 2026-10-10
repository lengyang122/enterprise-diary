import { NavLink } from 'react-router-dom'
import { WriteIcon, HistoryIcon, SettingsIcon } from '../icons'

const items = [
  { path: '/', label: '日记', Icon: WriteIcon },
  { path: '/history', label: '记录', Icon: HistoryIcon },
  { path: '/settings', label: '设置', Icon: SettingsIcon },
]

export default function MobileNav() {
  return (
    <nav className="glass rounded-glass-lg flex justify-around px-1.5 py-2">
      {items.map(({ path, label, Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-4 py-1.5 rounded-glass-sm transition-all duration-400 ease-spring ${
              isActive ? 'text-accent bg-white/60' : 'text-ink-tertiary'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={19} />
              <span className={`text-[11px] ${isActive ? 'font-semibold' : ''}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
