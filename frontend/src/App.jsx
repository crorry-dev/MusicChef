import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import SetupPage from './pages/SetupPage'
import CallbackPage from './pages/CallbackPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import ResultsPage from './pages/ResultsPage'
import HistoryPage from './pages/HistoryPage'
import TinderPage from './pages/TinderPage'
import SettingsPage from './pages/SettingsPage'

function SpinnerFull() {
  return (
    <div className="spinner-fullpage">
      <div className="spinner" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, hasClientId, authError, login, logout } = useAuth()
  if (isLoading) return <SpinnerFull />
  if (!hasClientId) return <Navigate to="/setup" replace />
  if (!isAuthenticated && authError) {
    return (
      <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
        <div className="error-box" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
          {authError}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={login}>Neu einloggen</button>
        </div>
      </div>
    )
  }
  return isAuthenticated ? children : <Navigate to="/" replace />
}

function RootRoute() {
  const { isAuthenticated, isLoading, hasClientId } = useAuth()
  if (isLoading) return <SpinnerFull />
  if (!hasClientId) return <Navigate to="/setup" replace />
  return isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage />
}

function SetupRoute() {
  const { hasClientId, isAuthenticated } = useAuth()
  if (hasClientId && isAuthenticated) return <Navigate to="/home" replace />
  if (hasClientId) return <Navigate to="/" replace />
  return <SetupPage />
}

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/setup" element={<SetupRoute />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/" element={<RootRoute />} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="/results/:quizId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/discover" element={<ProtectedRoute><TinderPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}
