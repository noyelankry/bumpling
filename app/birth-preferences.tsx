import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { goBack } from '../lib/navigation'
import {
  TOPICS, RELATIONSHIP_OPTIONS, loadBirthPrefs, saveBirthPrefAnswer, saveSupportContacts, isTopicDone,
  relationshipOption, type BirthPrefsData, type TopicId, type SupportContact,
} from '../lib/birthPrefs'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const EMPTY_PREFS: BirthPrefsData = { answers: {}, supportContacts: [] }
const EMPTY_DRAFT = { name: '', relationship: 'partner', phone: '' }

export default function BirthPreferencesScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ topic?: TopicId }>()
  const [prefs, setPrefs] = useState<BirthPrefsData>(EMPTY_PREFS)
  const [loaded, setLoaded] = useState(false)
  const [step, setStep] = useState(0)
  const [pending, setPending] = useState<string | undefined>(undefined)
  const [contacts, setContacts] = useState<SupportContact[]>([])
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  useEffect(() => {
    loadBirthPrefs().then(loadedPrefs => {
      setPrefs(loadedPrefs)
      const initialIndex = params.topic
        ? TOPICS.findIndex(t => t.id === params.topic)
        : TOPICS.findIndex(t => !isTopicDone(loadedPrefs, t))
      const index = initialIndex >= 0 ? initialIndex : 0
      setStep(index)
      setPending(loadedPrefs.answers[TOPICS[index].id])
      setContacts(loadedPrefs.supportContacts)
      setLoaded(true)
    })
  }, [])

  if (!loaded) return <SafeAreaView style={styles.container} />

  const topic = TOPICS[step]
  const isContacts = topic.kind === 'contacts'
  const isFirst = step === 0
  const isLast = step === TOPICS.length - 1

  function goToStep(index: number, nextPrefs: BirthPrefsData) {
    setStep(index)
    setPending(nextPrefs.answers[TOPICS[index].id])
    setContacts(nextPrefs.supportContacts)
    setFormOpen(false)
    setEditingContactId(null)
    setDraft(EMPTY_DRAFT)
  }

  function back() {
    if (isFirst) goBack(router, '/prepare-for-birth')
    else goToStep(step - 1, prefs)
  }

  async function next() {
    let current = prefs
    if (isContacts) {
      current = await saveSupportContacts(prefs, contacts)
    } else if (pending) {
      current = await saveBirthPrefAnswer(prefs, topic.id, pending)
    }
    setPrefs(current)
    if (isLast) router.replace('/birth-preferences-summary')
    else goToStep(step + 1, current)
  }

  function askDoctorLater() {
    if (isLast) router.replace('/birth-preferences-summary')
    else goToStep(step + 1, prefs)
  }

  function openAddForm() {
    setEditingContactId(null)
    setDraft(EMPTY_DRAFT)
    setFormOpen(true)
  }

  function openEditForm(contact: SupportContact) {
    setEditingContactId(contact.id)
    setDraft({ name: contact.name, relationship: contact.relationship, phone: contact.phone })
    setFormOpen(true)
  }

  function removeContact(id: string) {
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  function saveDraft() {
    if (!draft.name.trim()) return
    if (editingContactId) {
      setContacts(prev => prev.map(c => c.id === editingContactId ? { ...c, ...draft, name: draft.name.trim(), phone: draft.phone.trim() } : c))
    } else {
      setContacts(prev => [...prev, { id: `contact-${Date.now()}`, name: draft.name.trim(), relationship: draft.relationship, phone: draft.phone.trim() }])
    }
    setFormOpen(false)
    setEditingContactId(null)
    setDraft(EMPTY_DRAFT)
  }

  const nextDisabled = isContacts ? false : !pending

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={back} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Birth preferences</Text>
          <Text style={styles.headerSub}>Topic {step + 1} of {TOPICS.length}</Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.progressRow}>
        {TOPICS.map((t, i) => (
          <View
            key={t.id}
            style={[
              styles.progressSegment,
              i < step && styles.progressSegmentDone,
              i === step && styles.progressSegmentCurrent,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.questionCard}>
          <View style={styles.questionIconChip}>
            <Ionicons name={topic.icon as IoniconsName} size={24} color={colors.lavenderDeep} />
          </View>
          <Text style={styles.questionTitle}>{topic.question}</Text>
          <Text style={styles.questionSub}>{topic.subtitle}</Text>
        </View>

        {isContacts ? (
          <>
            {contacts.length > 0 && (
              <View style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
                {contacts.map(contact => {
                  const rel = relationshipOption(contact.relationship)
                  return (
                    <View key={contact.id} style={styles.contactCard}>
                      <View style={styles.contactIconChip}>
                        <Ionicons name={(rel?.icon ?? 'person-outline') as IoniconsName} size={18} color={colors.lavenderDeep} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactMeta}>{rel?.label ?? contact.relationship}{contact.phone ? ` · ${contact.phone}` : ''}</Text>
                      </View>
                      <TouchableOpacity onPress={() => openEditForm(contact)} hitSlop={8} style={{ marginRight: 4 }}>
                        <Ionicons name="pencil-outline" size={17} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeContact(contact.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={17} color={colors.urgent} />
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            )}

            {formOpen ? (
              <View style={styles.formCard}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={draft.name}
                  onChangeText={v => setDraft(d => ({ ...d, name: v }))}
                  placeholder="Their name"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.formLabel, { marginTop: spacing.sm }]}>Relationship</Text>
                <View style={styles.chipRow}>
                  {RELATIONSHIP_OPTIONS.map(opt => {
                    const selected = draft.relationship === opt.id
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setDraft(d => ({ ...d, relationship: opt.id }))}
                      >
                        <Ionicons name={opt.icon as IoniconsName} size={14} color={selected ? '#fff' : colors.textSecondary} />
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                <Text style={[styles.formLabel, { marginTop: spacing.sm }]}>Phone</Text>
                <TextInput
                  style={styles.formInput}
                  value={draft.phone}
                  onChangeText={v => setDraft(d => ({ ...d, phone: v }))}
                  placeholder="Their phone number"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />

                <View style={styles.formFooterRow}>
                  <TouchableOpacity style={styles.formCancelBtn} onPress={() => { setFormOpen(false); setEditingContactId(null) }}>
                    <Text style={styles.formCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.formSaveBtn, !draft.name.trim() && styles.nextBtnDisabled]} disabled={!draft.name.trim()} onPress={saveDraft}>
                    <Text style={styles.formSaveBtnText}>{editingContactId ? 'Save changes' : 'Add person'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addPersonBtn} onPress={openAddForm}>
                <Ionicons name="add" size={18} color={colors.primaryDark} />
                <Text style={styles.addPersonBtnText}>Add a person</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
            {topic.options.map(option => {
              const selected = pending === option.id
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionRow, selected && styles.optionRowSelected]}
                  activeOpacity={0.7}
                  onPress={() => setPending(option.id)}
                >
                  <View style={[styles.optionIconChip, selected && styles.optionIconChipSelected]}>
                    <Ionicons name={option.icon as IoniconsName} size={18} color={selected ? colors.primary : colors.textSecondary} />
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {topic.tips && (
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeaderRow}>
              <Ionicons name="bulb-outline" size={16} color={colors.lavenderDeep} />
              <Text style={styles.tipsTitle}>Helpful to think about</Text>
            </View>
            {topic.tips.map(tip => (
              <View key={tip} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {!isContacts && (
          <TouchableOpacity style={styles.laterLink} onPress={askDoctorLater}>
            <Text style={styles.laterLinkText}>Ask my doctor later</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footerRow}>
          {!isFirst && (
            <TouchableOpacity style={styles.backBtn} onPress={back}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, nextDisabled && styles.nextBtnDisabled]}
            disabled={nextDisabled}
            onPress={next}
          >
            <Text style={styles.nextBtnText}>{isLast ? 'Finish' : 'Next'}</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary },
  headerSub:   { fontSize: 11, color: colors.textSecondary, marginTop: 1 },

  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  progressSegment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
  progressSegmentDone: { backgroundColor: colors.sageDeep },
  progressSegmentCurrent: { backgroundColor: colors.lavenderDeep },

  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 56 },

  questionCard:     { backgroundColor: colors.lavender, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.md },
  questionIconChip: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  questionTitle:    { fontFamily: fonts.headline, fontSize: 19, color: colors.textPrimary, lineHeight: 25, marginBottom: 6 },
  questionSub:      { fontSize: 13, color: colors.textPrimary, opacity: 0.7, lineHeight: 18 },

  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1.5, borderColor: colors.border },
  optionRowSelected: { borderColor: colors.primary, backgroundColor: colors.peach },
  optionIconChip: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.neutralChip, alignItems: 'center', justifyContent: 'center' },
  optionIconChipSelected: { backgroundColor: colors.card },
  optionLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },

  contactCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  contactIconChip: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  contactName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  contactMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  addPersonBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.lg, paddingVertical: 13, marginBottom: spacing.md },
  addPersonBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },

  formCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  formLabel: { fontSize: 11.5, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
  formInput: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.neutralChip, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
  chipTextSelected: { color: '#fff' },
  formFooterRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  formCancelBtn: { flex: 1, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border },
  formCancelBtnText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  formSaveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  formSaveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  tipsCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  tipsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs },
  tipsTitle: { fontFamily: fonts.headline, fontSize: 13.5, color: colors.textPrimary },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 5 },
  tipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lavenderDeep, marginTop: 7 },
  tipText: { flex: 1, fontSize: 12.5, color: colors.textSecondary, lineHeight: 17 },

  laterLink: { alignItems: 'center', paddingVertical: spacing.sm },
  laterLinkText: { fontSize: 13.5, fontWeight: '700', color: colors.primaryDark },

  footerRow: { flexDirection: 'row', gap: spacing.sm },
  backBtn: { flex: 1, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border },
  backBtnText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  nextBtn: { flex: 2, flexDirection: 'row', gap: 6, backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  nextBtnDisabled: { opacity: 0.45 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
