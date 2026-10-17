// Curated dial-code list, not exhaustive — covers this app's primary
// markets (Hebrew/English locales) plus other major regions. The stored
// phone string is just "{dialCode} {number}" (see lib/momContact.ts), so a
// country here only drives the picker UI, not a separate storage shape.
export type PhoneCountry = { iso: string; dialCode: string; flag: string; nameEn: string; nameHe: string }

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'IL', dialCode: '+972', flag: '🇮🇱', nameEn: 'Israel', nameHe: 'ישראל' },
  { iso: 'US', dialCode: '+1', flag: '🇺🇸', nameEn: 'United States', nameHe: 'ארצות הברית' },
  { iso: 'CA', dialCode: '+1', flag: '🇨🇦', nameEn: 'Canada', nameHe: 'קנדה' },
  { iso: 'GB', dialCode: '+44', flag: '🇬🇧', nameEn: 'United Kingdom', nameHe: 'בריטניה' },
  { iso: 'FR', dialCode: '+33', flag: '🇫🇷', nameEn: 'France', nameHe: 'צרפת' },
  { iso: 'DE', dialCode: '+49', flag: '🇩🇪', nameEn: 'Germany', nameHe: 'גרמניה' },
  { iso: 'ES', dialCode: '+34', flag: '🇪🇸', nameEn: 'Spain', nameHe: 'ספרד' },
  { iso: 'IT', dialCode: '+39', flag: '🇮🇹', nameEn: 'Italy', nameHe: 'איטליה' },
  { iso: 'NL', dialCode: '+31', flag: '🇳🇱', nameEn: 'Netherlands', nameHe: 'הולנד' },
  { iso: 'AU', dialCode: '+61', flag: '🇦🇺', nameEn: 'Australia', nameHe: 'אוסטרליה' },
  { iso: 'BR', dialCode: '+55', flag: '🇧🇷', nameEn: 'Brazil', nameHe: 'ברזיל' },
  { iso: 'MX', dialCode: '+52', flag: '🇲🇽', nameEn: 'Mexico', nameHe: 'מקסיקו' },
  { iso: 'IN', dialCode: '+91', flag: '🇮🇳', nameEn: 'India', nameHe: 'הודו' },
  { iso: 'RU', dialCode: '+7', flag: '🇷🇺', nameEn: 'Russia', nameHe: 'רוסיה' },
  { iso: 'ZA', dialCode: '+27', flag: '🇿🇦', nameEn: 'South Africa', nameHe: 'דרום אפריקה' },
  { iso: 'AE', dialCode: '+971', flag: '🇦🇪', nameEn: 'United Arab Emirates', nameHe: 'איחוד האמירויות' },
  { iso: 'TR', dialCode: '+90', flag: '🇹🇷', nameEn: 'Turkey', nameHe: 'טורקיה' },
  { iso: 'UA', dialCode: '+380', flag: '🇺🇦', nameEn: 'Ukraine', nameHe: 'אוקראינה' },
  { iso: 'PL', dialCode: '+48', flag: '🇵🇱', nameEn: 'Poland', nameHe: 'פולין' },
  { iso: 'JP', dialCode: '+81', flag: '🇯🇵', nameEn: 'Japan', nameHe: 'יפן' },
]

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]

const byDialCodeDesc = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length)

/** Splits a stored "+972 501234567"-style string back into country + national number. */
export function splitPhone(stored: string): { country: PhoneCountry; number: string } {
  const trimmed = stored.trim()
  if (trimmed.startsWith('+')) {
    const match = byDialCodeDesc.find(c => trimmed.startsWith(c.dialCode))
    if (match) return { country: match, number: trimmed.slice(match.dialCode.length).trim() }
  }
  return { country: DEFAULT_PHONE_COUNTRY, number: trimmed }
}

export function joinPhone(country: PhoneCountry, number: string): string {
  const trimmedNumber = number.trim()
  return trimmedNumber ? `${country.dialCode} ${trimmedNumber}` : ''
}
