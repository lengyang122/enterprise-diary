import { NavLink } from 'react-router-dom'
import { WriteIcon, HistoryIcon, SettingsIcon } from '../icons'

const items = [
  { path: '/', label: '日记', Icon: WriteIcon },
  { path: '/history', label: '记录', Icon: HistoryIcon },
  { path: '/settings', label: '设置', Icon: SettingsIcon },
]

export default function MobileNav() {
  return (
    <nav className="bg-base-surface/95 backdrop-blur-md border-t border-base-line flex justify-around pt-2 pb-2.5">
      {items.map(({ path, label, Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-5 py-1 rounded-[10px] transition-colors duration-200 ${
              isActive ? 'text-base-accent' : 'text-base-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={19} />
              <span className={`text-[11px] ${isActive ? 'font-medium' : ''}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
