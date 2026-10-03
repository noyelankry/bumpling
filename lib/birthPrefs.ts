// Birth-preferences guided flow: one question per topic, answered at the
// user's own pace, rendered into a shareable PDF birth plan at the end.
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'bumpling_birth_prefs'

export type TopicId =
  | 'environment'
  | 'pain-relief'
  | 'movement'
  | 'support-people'
  | 'monitoring'
  | 'after-birth'
  | 'feeding'

export type TopicOption = { id: string; icon: string; label: string; summary: string }

export type Topic = {
  id: TopicId
  icon: string
  navLabel: string
  question: string
  subtitle: string
  /** For a 'contacts' topic, these are the relationship choices offered per contact rather than a single pick for the topic. */
  options: TopicOption[]
  tips?: string[]
  /** 'contacts' renders an add-a-person list (name/relationship/phone) instead of the default single-select. */
  kind?: 'contacts'
}

export type SupportContact = { id: string; name: string; relationship: string; phone: string }

export type BirthPrefAnswers = Partial<Record<TopicId, string>>
export type BirthPrefsData = { answers: BirthPrefAnswers; supportContacts: SupportContact[] }

export const RELATIONSHIP_OPTIONS: TopicOption[] = [
  { id: 'partner', icon: 'heart-outline', label: 'Partner', summary: 'Partner' },
  { id: 'family', icon: 'people-outline', label: 'Family', summary: 'Family' },
  { id: 'doula', icon: 'leaf-outline', label: 'Doula', summary: 'Doula' },
  { id: 'other', icon: 'person-outline', label: 'Other', summary: 'Other' },
]

export const TOPICS: Topic[] = [
  {
    id: 'environment',
    icon: 'leaf-outline',
    navLabel: 'Environment',
    question: 'What kind of environment helps you feel calm?',
    subtitle: "Think about lighting, sound, and who's around you.",
    options: [
      { id: 'calm-quiet', icon: 'moon-outline', label: 'Calm, low-light if possible', summary: 'Calm, low-light if possible' },
      { id: 'music', icon: 'musical-notes-outline', label: 'Music or sounds I choose', summary: 'Music or sounds I choose' },
      { id: 'doesnt-matter', icon: 'sunny-outline', label: "Doesn't matter much to me", summary: "Doesn't matter much to me" },
      { id: 'not-sure', icon: 'help-circle-outline', label: 'Not sure yet', summary: 'Not sure yet' },
    ],
    tips: ['Who do you want in the room?', 'Do you want dim lighting or bright?', 'Quiet space, or okay with chatter?'],
  },
  {
    id: 'pain-relief',
    icon: 'medkit-outline',
    navLabel: 'Pain relief',
    question: 'What kind of pain relief approach feels most like you?',
    subtitle: "You don't need to decide everything now — this just helps you reflect.",
    options: [
      { id: 'know-options', icon: 'book-outline', label: "I'd like to know all my options", summary: 'Open to options, unsure about epidural' },
      { id: 'open-epidural', icon: 'leaf-outline', label: 'Open to epidural', summary: 'Open to epidural' },
      { id: 'avoid-epidural', icon: 'close-circle-outline', label: 'Prefer to avoid epidural if possible', summary: 'Prefer to avoid epidural' },
      { id: 'not-sure', icon: 'help-circle-outline', label: 'Not sure yet', summary: 'Not sure yet' },
    ],
  },
  {
    id: 'movement',
    icon: 'walk-outline',
    navLabel: 'Movement & positions',
    question: 'How do you feel about moving around during labor?',
    subtitle: 'Positions and movement can help with comfort and progress.',
    options: [
      { id: 'freedom', icon: 'walk-outline', label: 'Freedom to move and change positions', summary: 'Wants freedom to move' },
      { id: 'limited-ok', icon: 'body-outline', label: 'Comfortable with monitoring that limits movement', summary: 'Okay with limited movement' },
      { id: 'guidance', icon: 'compass-outline', label: "Open to my care team's guidance", summary: "Open to care team's guidance" },
      { id: 'not-sure', icon: 'help-circle-outline', label: 'Not sure yet', summary: 'Not sure yet' },
    ],
  },
  {
    id: 'support-people',
    icon: 'people-outline',
    navLabel: 'Support people',
    question: 'Who would you like with you during labor and birth?',
    subtitle: 'Add anyone you want your care team and hospital to know about, with a way to reach them.',
    kind: 'contacts',
    options: RELATIONSHIP_OPTIONS,
    tips: ['Who helps you feel calm?', 'Who can advocate for you?', 'Do you want quiet or active support?'],
  },
  {
    id: 'monitoring',
    icon: 'pulse-outline',
    navLabel: 'Monitoring & interventions',
    question: 'How do you feel about monitoring and interventions?',
    subtitle: 'Think about how closely you want your labor monitored.',
    options: [
      { id: 'continuous', icon: 'pulse-outline', label: 'Continuous monitoring feels reassuring', summary: 'Prefers continuous monitoring' },
      { id: 'intermittent', icon: 'time-outline', label: 'Prefer intermittent monitoring if possible', summary: 'Prefers intermittent monitoring' },
      { id: 'care-team', icon: 'medical-outline', label: "Open to my care team's recommendation", summary: "Open to care team's call" },
      { id: 'not-sure', icon: 'help-circle-outline', label: 'Not sure yet', summary: 'Not sure yet' },
    ],
  },
  {
    id: 'after-birth',
    icon: 'heart-outline',
    navLabel: 'After birth',
    question: 'What matters most to you right after birth?',
    subtitle: 'The first moments can look different ways — what feels right to you?',
    options: [
      { id: 'skin-to-skin', icon: 'heart-outline', label: 'Skin-to-skin as soon as possible', summary: 'Skin-to-skin if possible' },
      { id: 'delayed-cord', icon: 'infinite-outline', label: 'Delayed cord clamping', summary: 'Delayed cord clamping' },
      { id: 'guide', icon: 'compass-outline', label: 'Let my care team guide the first steps', summary: "Care team's lead" },
      { id: 'not-sure', icon: 'help-circle-outline', label: 'Not sure yet', summary: 'Not sure yet' },
    ],
  },
  {
    id: 'feeding',
    icon: 'nutrition-outline',
    navLabel: 'Feeding',
    question: 'How are you thinking about feeding?',
    subtitle: 'This is just a starting point — babies change the plan often!',
    options: [
      { id: 'breast', icon: 'leaf-outline', label: 'Breastfeeding if possible', summary: 'Breastfeeding if possible' },
      { id: 'combo', icon: 'swap-horizontal-outline', label: 'Combination feeding', summary: 'Combination feeding' },
      { id: 'formula', icon: 'water-outline', label: 'Formula feeding', summary: 'Formula feeding' },
      { id: 'deciding', icon: 'help-circle-outline', label: 'Still deciding', summary: 'Still deciding' },
    ],
  },
]

export function topicById(id: TopicId): Topic {
  return TOPICS.find(t => t.id === id)!
}

export function optionFor(topic: Topic, optionId: string | undefined): TopicOption | undefined {
  return topic.options.find(o => o.id === optionId)
}

export function relationshipOption(id: string): TopicOption | undefined {
  return RELATIONSHIP_OPTIONS.find(o => o.id === id)
}

const EMPTY: BirthPrefsData = { answers: {}, supportContacts: [] }

export async function loadBirthPrefs(): Promise<BirthPrefsData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return EMPTY
  try {
    const parsed = JSON.parse(raw)
    return { answers: parsed.answers ?? {}, supportContacts: parsed.supportContacts ?? [] }
  } catch {
    return EMPTY
  }
}

async function saveBirthPrefs(data: BirthPrefsData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export async function saveBirthPrefAnswer(data: BirthPrefsData, topicId: TopicId, optionId: string): Promise<BirthPrefsData> {
  const next = { ...data, answers: { ...data.answers, [topicId]: optionId } }
  await saveBirthPrefs(next)
  return next
}

export async function saveSupportContacts(data: BirthPrefsData, contacts: SupportContact[]): Promise<BirthPrefsData> {
  const next = { ...data, supportContacts: contacts }
  await saveBirthPrefs(next)
  return next
}

/** Whether a topic has enough input to count as explored on the hub/progress bar. */
export function isTopicDone(data: BirthPrefsData, topic: Topic): boolean {
  return topic.kind === 'contacts' ? data.supportContacts.length > 0 : !!data.answers[topic.id]
}

export async function clearBirthPrefsData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}
