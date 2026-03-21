import { useNavigate } from 'react-router-dom'
import { tools } from './tools'
import './Hub.css'

function Hub() {
  const navigate = useNavigate()

  return (
    <div className="hub">
      <header className="hub-hero">
        <h1 className="hub-title">marvymarv</h1>
        <p className="hub-subtitle">Tools for the things I love.</p>
      </header>

      <section className="hub-grid">
        {tools.map((tool) => {
          const isLive = tool.status === 'live'

          return (
            <div
              key={tool.name}
              className={`hub-card hub-card--${tool.accentColor} ${isLive ? 'hub-card--live' : 'hub-card--soon'}`}
              onClick={isLive ? () => navigate(tool.route) : undefined}
              role={isLive ? 'link' : undefined}
              tabIndex={isLive ? 0 : undefined}
              onKeyDown={isLive ? (e) => { if (e.key === 'Enter' || e.key === ' ') navigate(tool.route) } : undefined}
            >
              <div className="hub-card-header">
                <h2 className="hub-card-name">{tool.name}</h2>
                <span className={`hub-card-badge ${isLive ? 'hub-card-badge--live' : 'hub-card-badge--soon'}`}>
                  {isLive ? 'Live' : 'Coming Soon'}
                </span>
              </div>
              <p className="hub-card-desc">{tool.description}</p>
              {isLive && <span className="hub-card-arrow">&rarr;</span>}
            </div>
          )
        })}
      </section>
    </div>
  )
}

export default Hub
