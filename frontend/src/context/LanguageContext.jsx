import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { translations } from '../lib/translations'

const LanguageContext = createContext(null)

const STORAGE_KEY = 'mc_lang'

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'de' } catch { return 'de' }
  })

  const setLanguage = useCallback((l) => {
    setLangState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch { /* noop */ }
  }, [])

  const t = useCallback((key, vars) => {
    const str = translations[lang]?.[key] ?? translations.de[key] ?? key
    if (!vars) return str
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
      str,
    )
  }, [lang])

  const value = useMemo(() => ({ lang, setLanguage, t }), [lang, setLanguage, t])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider')
  return ctx
}
