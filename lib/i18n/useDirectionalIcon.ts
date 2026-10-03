import { useLanguage } from './LanguageProvider'

// Ionicons chevrons are plain glyphs and don't flip with RTL on their own —
// "back" should visually point toward reading-start, "forward" toward
// reading-end, whichever side that is for the active language.
export function useDirectionalIcon() {
  const { isRTL } = useLanguage()
  return {
    back: isRTL ? 'chevron-forward' : 'chevron-back',
    forward: isRTL ? 'chevron-back' : 'chevron-forward',
    arrowBack: isRTL ? 'arrow-forward' : 'arrow-back',
    arrowForward: isRTL ? 'arrow-back' : 'arrow-forward',
  } as const
}
