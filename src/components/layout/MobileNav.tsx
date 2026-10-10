import { NavLink } from 'react-router-dom'

// 移动端轻量底部导航
const items = [
  { path: '/', label: '日记' },
  { path: '/history', label: '记录' },
  { path: '/settings', label: '设置' },
]

export default function MobileNav() {
  return (
    <nav className="bg-base-surface/95 backdrop-blur-md border-t border-base-line/70 flex justify-around py-2.5">
      {items.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `px-6 py-1.5 rounded-lg text-[13px] transition-colors duration-150 ${
              isActive ? 'text-base-accent font-medium' : 'text-base-muted'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
