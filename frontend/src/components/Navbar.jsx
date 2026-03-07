import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MusicNote, ChefHat, BarChart, LogOut, Home, ArrowLeft, Compass } from '../lib/icons'

/**
 * Spotify-style navigation bar – used across all authenticated pages.
 */
export default function Navbar({ user, onLogout, minimal = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/' || location.pathname === '/home'

  return (
    <nav className="sp-navbar">
      <div className="sp-navbar-inner">
        {/* Left: Brand / Back */}
        <div className="sp-navbar-left">
          {!isHome && !minimal ? (
            <button className="sp-nav-btn sp-nav-back" onClick={() => navigate('/home')}>
              <ArrowLeft size={20} />
            </button>
          ) : null}
          <button className="sp-nav-brand" onClick={() => navigate('/home')}>
            <div className="sp-nav-logo">
              <MusicNote size={20} />
            </div>
            <span className="sp-nav-title">MusicChef</span>
          </button>
        </div>

        {/* Center: Navigation links (only on home-like pages) */}
        {!minimal && (
          <div className="sp-navbar-center">
            <button
              className={`sp-nav-link ${isHome ? 'active' : ''}`}
              onClick={() => navigate('/home')}
            >
              <Home size={18} />
              <span>Home</span>
            </button>
            <button
              className={`sp-nav-link ${location.pathname === '/history' ? 'active' : ''}`}
              onClick={() => navigate('/history')}
            >
              <BarChart size={18} />
              <span>Verlauf</span>
            </button>
            <button
              className={`sp-nav-link ${location.pathname === '/discover' ? 'active' : ''}`}
              onClick={() => navigate('/discover')}
            >
              <Compass size={18} />
              <span>Entdecken</span>
            </button>
          </div>
        )}

        {/* Right: User / Logout */}
        <div className="sp-navbar-right">
          {user && (
            <>
              <div className="sp-nav-user">
                {user.images?.[0]?.url ? (
                  <img src={user.images[0].url} alt="" className="sp-nav-avatar" />
                ) : (
                  <div className="sp-nav-avatar-placeholder">
                    {user.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="sp-nav-username">{user.display_name}</span>
              </div>
              {onLogout && (
                <button className="sp-nav-btn sp-nav-logout" onClick={onLogout} title="Abmelden">
                  <LogOut size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
