import { Link, useLocation } from 'react-router-dom'
import './ToolNav.css'

const TOOLS = [
  { path: '/obscura', name: 'Obscura', accent: 'var(--accent-ember)' },
  { path: '/mensura', name: 'Mensura', accent: '#7c3aed' },
  { path: '/apertura', name: 'Apertura', accent: 'var(--accent-crimson)' },
  { path: '/vigilia', name: 'Vigilia', accent: 'var(--accent-teal)' },
]

export default function ToolNav() {
  const location = useLocation()
  const current = location.pathname

  return (
    <div className="tool-nav">
      <Link to="/" className="tool-nav-hub">← Hub</Link>
      <div className="tool-nav-links">
        {TOOLS.map(t => {
          const isActive = current === t.path
          return (
            <Link
              key={t.path}
              to={t.path}
              className={`tool-nav-link ${isActive ? 'active' : ''}`}
              style={isActive ? { color: t.accent, borderBottomColor: t.accent } : undefined}
            >
              <span className="tool-nav-name">{t.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
