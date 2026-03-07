import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// GitHub Pages SPA redirect: restore the original path after 404 → index.html
const spaRedirect = sessionStorage.getItem('spa_redirect')
if (spaRedirect) {
  sessionStorage.removeItem('spa_redirect')
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const targetPath = basePath && spaRedirect.startsWith(basePath)
    ? spaRedirect.slice(basePath.length) || '/'
    : spaRedirect
  const fullTarget = basePath + targetPath
  if (fullTarget !== window.location.pathname) {
    window.history.replaceState(null, '', fullTarget)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
