import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser
} from '@clerk/clerk-react'
import './Apertura.css'

const TABS = [
  { key: 'inventory', label: 'Inventory', desc: 'Manage your cameras, optics, filters, and accessories' },
  { key: 'trains', label: 'Imaging Trains', desc: 'Build and save imaging train configurations' },
  { key: 'nina', label: 'NINA Export', desc: 'Generate NINA profiles from your imaging trains' },
  { key: 'settings', label: 'Settings', desc: 'Configure Apertura preferences' },
]

function Apertura() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('inventory')

  const current = TABS.find(t => t.key === activeTab)

  return (
    <div className="apertura">
      <SignedOut>
        <div className="apertura-signin">
          <h2>Sign in to use Apertura</h2>
          <SignInButton mode="modal">
            <button className="apertura-signin-btn">Sign In</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <nav className="apt-top-nav">
          <div className="apt-nav-left">
            <Link to="/" className="nav-hub-link">&larr; Hub</Link>
            <a className="apt-nav-home" onClick={() => navigate('/')}>
              <svg className="apt-nav-logo-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              <span className="apt-nav-wordmark">Aper<span className="apt-nav-accent">tura</span></span>
            </a>
          </div>
          <div className="apt-nav-center">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`apt-nav-pill ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="apt-nav-right">
            <div className="apt-nav-avatar">{user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}</div>
            <UserButton />
          </div>
        </nav>

        <div className="apt-content">
          <div className="apt-placeholder-card">
            <h2 className="apt-placeholder-heading">{current.label}</h2>
            <p className="apt-placeholder-desc">{current.desc}</p>
          </div>
        </div>
      </SignedIn>
    </div>
  )
}

export default Apertura
