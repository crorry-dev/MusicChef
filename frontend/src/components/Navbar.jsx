import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from '../context/LanguageContext'
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
  const { t, lang, setLanguage } = useTranslation()

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
              <span>{t('nav.home')}</span>
            </button>
            <button
              className={`sp-nav-link ${location.pathname === '/history' ? 'active' : ''}`}
              onClick={() => navigate('/history')}
            >
              <BarChart size={18} />
              <span>{t('nav.history')}</span>
            </button>
            <button
              className={`sp-nav-link ${location.pathname === '/discover' ? 'active' : ''}`}
              onClick={() => navigate('/discover')}
            >
              <Compass size={18} />
              <span>{t('nav.discover')}</span>
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
                    <span className="sp-dropdown-section-label">{t('nav.status')}</span>
                    <div className="sp-dropdown-status">
                      <CheckCircle size={14} />
                      <span>{t('nav.login')}</span>
                      <span className="sp-status-badge sp-status-ok">{t('nav.connected')}</span>
                    </div>
                    <div className="sp-dropdown-status">
                      <Settings size={14} />
                      <span>{t('nav.clientId')}</span>
                      {maskedId ? (
                        <span className="sp-status-badge sp-status-ok">{maskedId}</span>
                      ) : (
                        <span className="sp-status-badge sp-status-warn">{t('nav.missing')}</span>
                      )}
                    </div>
                    <div className="sp-dropdown-status">
                      <Globe size={14} />
                      <span>{t('nav.api')}</span>
                      <span className="sp-status-badge sp-status-ok">{t('nav.active')}</span>
                    </div>
                  </div>

                  <div className="sp-dropdown-divider" />

                  {/* Theme Switcher */}
                  <div className="sp-dropdown-section">
                    <span className="sp-dropdown-section-label">{t('nav.design')}</span>
                    <div className="sp-theme-switcher">
                      <button
                        className={`sp-theme-btn ${preference === 'dark' ? 'active' : ''}`}
                        onClick={() => setTheme('dark')}
                      >
                        <Moon size={14} />
                        <span>{t('nav.dark')}</span>
                      </button>
                      <button
                        className={`sp-theme-btn ${preference === 'light' ? 'active' : ''}`}
                        onClick={() => setTheme('light')}
                      >
                        <Sun size={14} />
                        <span>{t('nav.light')}</span>
                      </button>
                      <button
                        className={`sp-theme-btn ${preference === 'system' ? 'active' : ''}`}
                        onClick={() => setTheme('system')}
                      >
                        <Monitor size={14} />
                        <span>{t('nav.system')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Language Switcher */}
                  <div className="sp-dropdown-section">
                    <span className="sp-dropdown-section-label">{t('settings.language')}</span>
                    <div className="sp-theme-switcher">
                      <button
                        className={`sp-theme-btn ${lang === 'de' ? 'active' : ''}`}
                        onClick={() => setLanguage('de')}
                      >
                        <span>DE</span>
                      </button>
                      <button
                        className={`sp-theme-btn ${lang === 'en' ? 'active' : ''}`}
                        onClick={() => setLanguage('en')}
                      >
                        <span>EN</span>
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
                    <span>{t('nav.settings')}</span>
                  </button>
                  <button
                    className="sp-dropdown-item"
                    onClick={() => { setMenuOpen(false); navigate('/donate') }}
                    role="menuitem"
                  >
                    <Heart size={16} />
                    <span>{t('nav.support')}</span>
                    <Heart size={12} style={{ marginLeft: 'auto', color: 'var(--error, #e74c3c)' }} />
                  </button>

                  <div className="sp-dropdown-divider" />

                  {/* Logout */}
                  {onLogout && (
                    <button
                      className="sp-dropdown-item sp-dropdown-logout"
                      onClick={() => { setMenuOpen(false); onLogout() }}
                      role="menuitem"
                    >
                      <LogOut size={16} />
                      <span>{t('nav.logout')}</span>
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
