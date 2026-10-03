import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Alert, I18nManager, Platform } from 'react-native'
import * as Localization from 'expo-localization'
import { useTranslation } from 'react-i18next'
import i18next from './index'
import { loadLanguage, saveLanguage, type Language } from './languageStorage'

type LanguageContextValue = {
  language: Language
  isRTL: boolean
  setLanguage: (lang: Language) => Promise<void>
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function isRTLFor(lang: Language) {
  return lang === 'he'
}

function applyWebDirection(lang: Language) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return
  document.documentElement.dir = isRTLFor(lang) ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  const [language, setLanguageState] = useState<Language>('en')
  const [isRTL, setIsRTL] = useState(I18nManager.isRTL)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const stored = await loadLanguage()
      const deviceLang = Localization.getLocales()[0]?.languageCode === 'he' ? 'he' : 'en'
      const resolved = stored ?? deviceLang
      if (cancelled) return

      await i18next.changeLanguage(resolved)
      I18nManager.allowRTL(true)
      I18nManager.forceRTL(isRTLFor(resolved))
      applyWebDirection(resolved)

      setLanguageState(resolved)
      setIsRTL(isRTLFor(resolved))
    })()
    return () => { cancelled = true }
  }, [])

  async function setLanguage(lang: Language) {
    await saveLanguage(lang)
    await i18next.changeLanguage(lang)

    const nextRTL = isRTLFor(lang)
    const rtlChanged = nextRTL !== I18nManager.isRTL

    if (Platform.OS === 'web') {
      applyWebDirection(lang)
      I18nManager.forceRTL(nextRTL)
    } else {
      I18nManager.forceRTL(nextRTL)
      if (rtlChanged) {
        Alert.alert(t('restartTitle'), t('restartBody'))
      }
    }

    setLanguageState(lang)
    setIsRTL(nextRTL)
  }

  return (
    <LanguageContext.Provider value={{ language, isRTL, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
