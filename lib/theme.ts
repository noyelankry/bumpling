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

  // legacy nutrition-tracking accents, still used by diary/goals screens
  protein: '#4ADE80',
  carbs: '#FBBF24',
  fat: '#F87171',
  fiber: '#93C5FD',
}

export const radius = { sm: 10, md: 16, lg: 20, xl: 26, pill: 999 }
export const spacing = { xs: 8, sm: 12, md: 28, lg: 36 }

// Body: DM Sans. Headline (week/day hero numbers, appointment titles): Poppins
// SemiBold. Both bundled via @expo-google-fonts so they render identically on
// every device rather than depending on the OS/browser having a match.
export const fonts = {
  sans:     'DM_Sans_400Regular',
  headline: 'Poppins_600SemiBold',
}
