export const colors = {
  primary: '#E8927C',
  primaryDark: '#DD7C63',
  primaryLight: '#F3B7A4',
  background: '#FDFBF8',
  card: '#FFFFFF',
  textPrimary: '#2B2420',
  textSecondary: '#8C8078',
  textOnPrimary: '#FFFFFF',

  peach: '#F8E3D4',
  peachDeep: '#F2CDB4',
  sage: '#E4ECE1',
  sageDeep: '#9BBB9C',
  lavender: '#EAE3F5',
  lavenderDeep: '#B6A2D9',
  cream: '#F3EAD8',
  creamDeep: '#D8B978',

  moodHappy: '#E8927C',
  moodCalm: '#7FAE84',
  moodOkay: '#CDA23A',
  moodTired: '#9C82C4',
  moodAnxious: '#D96E5C',

  border: '#EFE4D8',

  urgent: '#D9634A',
  urgentBg: '#FBE7E1',
  neutralChip: '#EDE8E1',
  neutralChipDeep: '#9C948A',
  scheduledDot: '#3E5C3A',
}

export const radius = { sm: 10, md: 16, lg: 20, xl: 26, pill: 999 }
export const spacing = { xs: 8, sm: 12, md: 28, lg: 36 }

// Body: DM Sans. Headline (week/day hero numbers, appointment titles): Poppins
// SemiBold. Both bundled via @expo-google-fonts so they render identically on
// every device rather than depending on the OS/browser having a match.
//
// Neither has Hebrew glyphs, so Hebrew text always falls through to a
// fallback font. On web that fallback can be pinned to Noto Sans Hebrew (at
// the right weight per tier) via a comma-separated CSS font stack — the
// browser uses Poppins/DM Sans for every Latin glyph and only drops to Noto
// Sans Hebrew for the Hebrew ones. Native RN doesn't support stacked
// fontFamily strings (it looks for one exact font name), so native keeps the
// single English font and leaves Hebrew to whatever the OS substitutes —
// true native enforcement would need real per-language font switching, not
// just a stack.
import { Platform } from 'react-native'

const stack = (base: string, hebrew: string) => (Platform.OS === 'web' ? `${base}, ${hebrew}` : base)

export const fonts = {
  sans:         stack('DMSans_400Regular', 'NotoSansHebrew_400Regular'),
  headline:     stack('Poppins_600SemiBold', 'NotoSansHebrew_600SemiBold'),
  headlineBold: stack('Poppins_600SemiBold', 'NotoSansHebrew_700Bold'),
}
