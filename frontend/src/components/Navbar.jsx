import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { getClientId } from '../lib/spotify-pkce'
import {
  MusicNote, BarChart, LogOut, Home, ArrowLeft, Compass,
  ChevronDown, Sun, Moon, Monitor, Settings, CheckCircle, Globe, Heart,
} from '../lib/icons'

/**
 * Spotify-style navigation bar with profile dropdown menu.
 */
export default function Navbar({ user, onLogout, minimal = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/' || location.pathname === '/home'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { preference, setTheme } = useTheme()

  useEffect(() => {
    if (!menuOpen) return
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    function onEscape(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [menuOpen])

  const clientId = getClientId()
  const maskedId = clientId ? `${clientId.slice(0, 4)}…${clientId.slice(-4)}` : null

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

        {/* Center: Navigation links */}
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

        {/* Right: User Profile Dropdown */}
        <div className="sp-navbar-right" ref={menuRef} style={{ position: 'relative' }}>
          {user && (
            <>
              <button
                className={`sp-nav-user-trigger ${menuOpen ? 'open' : ''}`}
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                {user.image ? (
                  <img src={user.image} alt="" className="sp-nav-avatar" />
                ) : (
                  <div className="sp-nav-avatar-placeholder">
                    {user.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="sp-nav-username">{user.display_name}</span>
                <ChevronDown size={14} className={`sp-nav-chevron ${menuOpen ? 'rotated' : ''}`} />
              </button>

              {menuOpen && (
                <div className="sp-dropdown-menu" role="menu">
                  {/* User Info */}
                  <div className="sp-dropdown-header">
                    {user.image ? (
                      <img src={user.image} alt="" className="sp-dropdown-avatar" />
                    ) : (
                      <div className="sp-dropdown-avatar-placeholder">
                        {user.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="sp-dropdown-user-info">
                      <span className="sp-dropdown-name">{user.display_name}</span>
                      {user.email && <span className="sp-dropdown-email">{user.email}</span>}
                    </div>
                  </div>

                  <div className="sp-dropdown-divider" />

                  {/* Status */}
                  <div className="sp-dropdown-section">
                    <span className="sp-dropdown-section-label">Status</span>
                    <div className="sp-dropdown-status">
                      <CheckCircle size={14} />
                      <span>Login</span>
                      <span className="sp-status-badge sp-status-ok">Verbunden</span>
                    </div>
                    <div className="sp-dropdown-status">
                      <Settings size={14} />
                      <span>Client ID</span>
                      {maskedId ? (
                        <span className="sp-status-badge sp-status-ok">{maskedId}</span>
                      ) : (
                        <span className="sp-status-badge sp-status-warn">Fehlt</span>
                      )}
                    </div>
                    <div className="sp-dropdown-status">
                      <Globe size={14} />
                      <span>API</span>
                      <span className="sp-status-badge sp-status-ok">Aktiv</span>
                    </div>
                  </div>

                  <div className="sp-dropdown-divider" />

                  {/* Theme Switcher */}
                  <div className="sp-dropdown-section">
                    <span className="sp-dropdown-section-label">Design</span>
                    <div className="sp-theme-switcher">
                      <button
                        className={`sp-theme-btn ${preference === 'dark' ? 'active' : ''}`}
                        onClick={() => setTheme('dark')}
                      >
                        <Moon size={14} />
                        <span>Dunkel</span>
                      </button>
                      <button
                        className={`sp-theme-btn ${preference === 'light' ? 'active' : ''}`}
                        onClick={() => setTheme('light')}
                      >
                        <Sun size={14} />
                        <span>Hell</span>
                      </button>
                      <button
                        className={`sp-theme-btn ${preference === 'system' ? 'active' : ''}`}
                        onClick={() => setTheme('system')}
                      >
                        <Monitor size={14} />
                        <span>System</span>
                      </button>
                    </div>
                  </div>

                  <div className="sp-dropdown-divider" />

                  {/* Actions */}
                  <button
                    className="sp-dropdown-item"
                    onClick={() => { setMenuOpen(false); navigate('/settings') }}
                    role="menuitem"
                  >
                    <Settings size={16} />
                    <span>Einstellungen</span>
                  </button>
                  <a
                    className="sp-dropdown-item"
                    href="https://paypal.me/tobcro"
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Heart size={16} />
                    <span>Unterstützen</span>
                    <Heart size={12} style={{ marginLeft: 'auto', color: 'var(--error, #e74c3c)' }} />
                  </a>

                  <div className="sp-dropdown-divider" />

                  {/* Logout */}
                  {onLogout && (
                    <button
                      className="sp-dropdown-item sp-dropdown-logout"
                      onClick={() => { setMenuOpen(false); onLogout() }}
                      role="menuitem"
                    >
                      <LogOut size={16} />
                      <span>Abmelden</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
