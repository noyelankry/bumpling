import { Ionicons } from '@expo/vector-icons'
import { BellyMark } from './illustrations'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

// Keyed by care-item id rather than title text — titles are translated for
// display, but ids stay stable English slugs, so this is the one thing safe
// to pattern-match on regardless of the active language.
const ICON_BY_ID: Record<string, IoniconsName | 'belly' | 'body'> = {
  'first-ob-visit': 'medical-outline',
  'first-blood-tests': 'flask-outline',
  'first-urine-tests': 'flask-outline',
  'first-ultrasound': 'belly',
  'genetic-screening': 'flask-outline',
  'nuchal-translucency': 'belly',
  'first-tri-biochem': 'flask-outline',
  'cvs': 'body',
  'early-anatomy-scan': 'belly',
  'second-tri-biochem': 'flask-outline',
  'amniocentesis': 'body',
  'late-anatomy-scan': 'belly',
  'fetal-echo': 'body',
  'glucose-test': 'flask-outline',
  'pertussis-vaccine': 'shield-checkmark-outline',
  'third-tri-ultrasound': 'belly',
  'gbs-culture': 'flask-outline',
  'post-term-monitoring': 'time-outline',
}

export function ItemIcon({ id, size, color }: { id: string; size: number; color: string }) {
  const icon = ICON_BY_ID[id] ?? 'calendar-outline'
  if (icon === 'belly') return <BellyMark size={size} color={color} />
  if (icon === 'body') return <Ionicons name="body-outline" size={size} color={color} />
  return <Ionicons name={icon} size={size} color={color} />
}
