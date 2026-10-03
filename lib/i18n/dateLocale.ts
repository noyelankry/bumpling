import i18next from './index'

export function getDateLocale(): 'en-US' | 'he-IL' {
  return i18next.language === 'he' ? 'he-IL' : 'en-US'
}
