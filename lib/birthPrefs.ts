// Birth-preferences guided flow: one question per topic, answered at the
// user's own pace, rendered into a shareable PDF birth plan at the end.
import { supabase } from './supabase'
import { currentPregnancyId } from './carePlan'

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

// The 'birthPrefs' namespace's option labels are addressed by dynamically
// built keys (topic + option id), which i18next's literal-union key typing
// can't verify statically, and whose generated overload set isn't
// structurally assignable from a simpler function type either — `any`
// sidesteps that without losing real type-checking anywhere else `t` is
// used directly (the useTranslation() call sites that produce this value).
type BirthPrefsT = any

export function getRelationshipOptions(t: BirthPrefsT): TopicOption[] {
  return [
    { id: 'partner', icon: 'heart-outline', label: t('relationship.partner'), summary: t('relationship.partner') },
    { id: 'family', icon: 'people-outline', label: t('relationship.family'), summary: t('relationship.family') },
    { id: 'doula', icon: 'leaf-outline', label: t('relationship.doula'), summary: t('relationship.doula') },
    { id: 'other', icon: 'person-outline', label: t('relationship.other'), summary: t('relationship.other') },
  ]
}

export function getTopics(t: BirthPrefsT): Topic[] {
  return [
    {
      id: 'environment',
      icon: 'leaf-outline',
      navLabel: t('environment.navLabel'),
      question: t('environment.question'),
      subtitle: t('environment.subtitle'),
      options: [
        { id: 'calm-quiet', icon: 'moon-outline', ...splitLS(t, 'environment', 'calmQuiet') },
        { id: 'music', icon: 'musical-notes-outline', ...splitLS(t, 'environment', 'music') },
        { id: 'doesnt-matter', icon: 'sunny-outline', ...splitLS(t, 'environment', 'doesntMatter') },
        { id: 'not-sure', icon: 'help-circle-outline', ...splitLS(t, 'environment', 'notSure') },
      ],
      tips: t('environment.tips', { returnObjects: true }) as string[],
    },
    {
      id: 'pain-relief',
      icon: 'medkit-outline',
      navLabel: t('painRelief.navLabel'),
      question: t('painRelief.question'),
      subtitle: t('painRelief.subtitle'),
      options: [
        { id: 'know-options', icon: 'book-outline', ...splitLS(t, 'painRelief', 'knowOptions') },
        { id: 'open-epidural', icon: 'leaf-outline', ...splitLS(t, 'painRelief', 'openEpidural') },
        { id: 'avoid-epidural', icon: 'close-circle-outline', ...splitLS(t, 'painRelief', 'avoidEpidural') },
        { id: 'not-sure', icon: 'help-circle-outline', ...splitLS(t, 'painRelief', 'notSure') },
      ],
    },
    {
      id: 'movement',
      icon: 'walk-outline',
      navLabel: t('movement.navLabel'),
      question: t('movement.question'),
      subtitle: t('movement.subtitle'),
      options: [
        { id: 'freedom', icon: 'walk-outline', ...splitLS(t, 'movement', 'freedom') },
        { id: 'limited-ok', icon: 'body-outline', ...splitLS(t, 'movement', 'limitedOk') },
        { id: 'guidance', icon: 'compass-outline', ...splitLS(t, 'movement', 'guidance') },
        { id: 'not-sure', icon: 'help-circle-outline', ...splitLS(t, 'movement', 'notSure') },
      ],
    },
    {
      id: 'support-people',
      icon: 'people-outline',
      navLabel: t('supportPeople.navLabel'),
      question: t('supportPeople.question'),
      subtitle: t('supportPeople.subtitle'),
      kind: 'contacts',
      options: getRelationshipOptions(t),
      tips: t('supportPeople.tips', { returnObjects: true }) as string[],
    },
    {
      id: 'monitoring',
      icon: 'pulse-outline',
      navLabel: t('monitoring.navLabel'),
      question: t('monitoring.question'),
      subtitle: t('monitoring.subtitle'),
      options: [
        { id: 'continuous', icon: 'pulse-outline', ...splitLS(t, 'monitoring', 'continuous') },
        { id: 'intermittent', icon: 'time-outline', ...splitLS(t, 'monitoring', 'intermittent') },
        { id: 'care-team', icon: 'medical-outline', ...splitLS(t, 'monitoring', 'careTeam') },
        { id: 'not-sure', icon: 'help-circle-outline', ...splitLS(t, 'monitoring', 'notSure') },
      ],
    },
    {
      id: 'after-birth',
      icon: 'heart-outline',
      navLabel: t('afterBirth.navLabel'),
      question: t('afterBirth.question'),
      subtitle: t('afterBirth.subtitle'),
      options: [
        { id: 'skin-to-skin', icon: 'heart-outline', ...splitLS(t, 'afterBirth', 'skinToSkin') },
        { id: 'delayed-cord', icon: 'infinite-outline', ...splitLS(t, 'afterBirth', 'delayedCord') },
        { id: 'guide', icon: 'compass-outline', ...splitLS(t, 'afterBirth', 'guide') },
        { id: 'not-sure', icon: 'help-circle-outline', ...splitLS(t, 'afterBirth', 'notSure') },
      ],
    },
    {
      id: 'feeding',
      icon: 'nutrition-outline',
      navLabel: t('feeding.navLabel'),
      question: t('feeding.question'),
      subtitle: t('feeding.subtitle'),
      options: [
        { id: 'breast', icon: 'leaf-outline', ...splitLS(t, 'feeding', 'breast') },
        { id: 'combo', icon: 'swap-horizontal-outline', ...splitLS(t, 'feeding', 'combo') },
        { id: 'formula', icon: 'water-outline', ...splitLS(t, 'feeding', 'formula') },
        { id: 'deciding', icon: 'help-circle-outline', ...splitLS(t, 'feeding', 'deciding') },
      ],
    },
  ]
}

function splitLS(t: BirthPrefsT, topicKey: string, optionKey: string): { label: string; summary: string } {
  return { label: t(`${topicKey}.options.${optionKey}.label`), summary: t(`${topicKey}.options.${optionKey}.summary`) }
}

export function optionFor(topic: Topic, optionId: string | undefined): TopicOption | undefined {
  return topic.options.find(o => o.id === optionId)
}

export function relationshipOption(options: TopicOption[], id: string): TopicOption | undefined {
  return options.find(o => o.id === id)
}

const EMPTY: BirthPrefsData = { answers: {}, supportContacts: [] }

export async function loadBirthPrefs(): Promise<BirthPrefsData> {
  const pregnancyId = await currentPregnancyId()
  if (!pregnancyId) return EMPTY
  const { data } = await supabase.from('birth_preferences').select('answers,support_contacts').eq('pregnancy_id', pregnancyId).maybeSingle()
  if (!data) return EMPTY
  return { answers: data.answers ?? {}, supportContacts: data.support_contacts ?? [] }
}

async function saveBirthPrefs(data: BirthPrefsData): Promise<void> {
  const pregnancyId = await currentPregnancyId()
  if (!pregnancyId) return
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return
  await supabase.from('birth_preferences').upsert({
    pregnancy_id: pregnancyId,
    user_id: userId,
    answers: data.answers,
    support_contacts: data.supportContacts,
  })
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

// No-op now — data is server-side and cascade-deleted on account deletion, not local.
export async function clearBirthPrefsData(): Promise<void> {}
