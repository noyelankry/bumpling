import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { goBack } from '../lib/navigation'
import { formatDate } from '../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, computeCareItems, getItemTitle, type CareItemWithCustom } from '../lib/carePlan'
import { type Entry, type EntryKind, loadEntries, updateEntry, removeEntry, SUGGESTED_TAGS } from '../lib/brainDump'
import { useDirectionalIcon } from '../lib/i18n/useDirectionalIcon'
import { useLanguage } from '../lib/i18n/LanguageProvider'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']
type Section = 'details' | 'appointment' | 'tags' | null

export default function EditBrainDumpScreen() {
  const router = useRouter()
  const { t } = useTranslation('editBrainDump')
  const { t: tTag } = useTranslation('brainDump')
  const { back: backIcon, forward } = useDirectionalIcon()
  const { isRTL } = useLanguage()
  const KIND_OPTIONS: { kind: EntryKind; icon: IoniconsName; label: string }[] = [
    { kind: 'thought', icon: 'bulb-outline', label: t('kindThought') },
    { kind: 'doctor', icon: 'medical-outline', label: t('kindDoctor') },
  ]
  const tagLabel = (tag: string): string =>
    SUGGESTED_TAGS.includes(tag.toLowerCase()) ? tTag(`tag.${tag.toLowerCase()}` as 'tag.sleep') : tag
  const back = () => goBack(router, '/(tabs)/brain-dump')
  const { id } = useLocalSearchParams<{ id: string }>()

  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [text, setText] = useState('')
  const [kind, setKind] = useState<EntryKind>('thought')
  const [details, setDetails] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [appointmentId, setAppointmentId] = useState<string | undefined>()
  const [appointmentTitle, setAppointmentTitle] = useState<string | undefined>()
  const [sharedWithPartner, setSharedWithPartner] = useState(false)
  const [openSection, setOpenSection] = useState<Section>(null)
  const [saving, setSaving] = useState(false)

  const [careItems, setCareItems] = useState<CareItemWithCustom[]>(DEFAULT_CARE_ITEMS)
  const [lmp, setLmp] = useState<Date>(TODAY)

  useFocusEffect(useCallback(() => {
    loadCareItems().then(setCareItems)
    loadLMP().then(setLmp)
    loadEntries().then(all => {
      setEntries(all)
      const entry = all.find(e => e.id === id)
      if (entry) {
        setText(entry.text)
        setKind(entry.kind)
        setDetails(entry.details ?? '')
        setTags(entry.tags)
        setAppointmentId(entry.linkedAppointmentId)
        setAppointmentTitle(entry.linkedAppointmentTitle)
        setSharedWithPartner(entry.sharedWithPartner)
      }
      setLoaded(true)
    })
  }, [id]))

  const upcomingAppointments = useMemo(() => {
    return computeCareItems(careItems, lmp, TODAY)
      .filter(i => i.status !== 'done')
      .sort((a, b) => (a.scheduledAt ?? a.bookBy).getTime() - (b.scheduledAt ?? b.bookBy).getTime())
      .slice(0, 6)
  }, [careItems, lmp])

  function toggleSection(section: Exclude<Section, null>) {
    setOpenSection(s => s === section ? null : section)
  }

  function toggleTag(tag: string) {
    setTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])
  }

  function pickAppointment(appId: string, title: string) {
    if (appointmentId === appId) {
      setAppointmentId(undefined)
      setAppointmentTitle(undefined)
    } else {
      setAppointmentId(appId)
      setAppointmentTitle(title)
    }
  }

  async function save() {
    const trimmed = text.trim()
    if (!trimmed || saving || !id) return
    setSaving(true)
    await updateEntry(entries, id, {
      text: trimmed,
      kind,
      details,
      tags,
      linkedAppointmentId: appointmentId,
      linkedAppointmentTitle: appointmentTitle,
      sharedWithPartner,
    })
    setSaving(false)
    back()
  }

  function confirmDelete() {
    if (!id) return
    const doDelete = async () => { await removeEntry(entries, id); back() }
    if (Platform.OS === 'web') {
      if (window.confirm(t('deleteEntryTitle'))) doDelete()
      return
    }
    Alert.alert(t('deleteEntryTitle'), '', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: doDelete },
    ])
  }

  if (!loaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={back} hitSlop={8}>
            <Ionicons name={backIcon} size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!entries.some(e => e.id === id)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={back} hitSlop={8}>
            <Ionicons name={backIcon} size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('notFound')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={back} hitSlop={8}>
            <Ionicons name={backIcon} size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.pageTitle}>{t('editEntry')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              value={text}
              onChangeText={setText}
              placeholder={t('placeholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </View>
          <View style={styles.typeToggle}>
            {KIND_OPTIONS.map(opt => {
              const active = kind === opt.kind
              return (
                <TouchableOpacity
                  key={opt.kind}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => setKind(opt.kind)}
                >
                  <Ionicons name={opt.icon} size={13} color={active ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={styles.list}>
            <OptionRow
              icon="reader-outline"
              label={t('addDetails')}
              open={openSection === 'details'}
              summary={details.trim() || undefined}
              onPress={() => toggleSection('details')}
              forwardIcon={forward}
            >
              <TextInput
                style={[styles.detailsInput, isRTL && styles.inputRTL]}
                value={details}
                onChangeText={setDetails}
                placeholder={t('detailsPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </OptionRow>

            <OptionRow
              icon="calendar-outline"
              label={t('addToNextAppointment')}
              open={openSection === 'appointment'}
              summary={appointmentTitle}
              onPress={() => toggleSection('appointment')}
              forwardIcon={forward}
            >
              {upcomingAppointments.length === 0 ? (
                <Text style={styles.emptyOptionText}>{t('noUpcomingAppointments')}</Text>
              ) : (
                <View style={styles.appointmentList}>
                  {upcomingAppointments.map(item => {
                    const selected = appointmentId === item.id
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.appointmentRow, selected && styles.appointmentRowSelected]}
                        onPress={() => pickAppointment(item.id, getItemTitle(item))}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.appointmentTitle}>{getItemTitle(item)}</Text>
                          <Text style={styles.appointmentDate}>
                            {item.status === 'scheduled' && item.scheduledAt ? formatDate(item.scheduledAt) : t('bookBy', { date: formatDate(item.bookBy) })}
                          </Text>
                        </View>
                        {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </OptionRow>

            <OptionRow
              icon="pricetag-outline"
              label={t('addTag')}
              open={openSection === 'tags'}
              summary={tags.length > 0 ? tags.map(tagLabel).join(', ') : undefined}
              onPress={() => toggleSection('tags')}
              forwardIcon={forward}
            >
              <View style={styles.tagGrid}>
                {SUGGESTED_TAGS.map(tag => {
                  const selected = tags.includes(tag)
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, selected && styles.tagChipActive]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text style={[styles.tagChipText, selected && styles.tagChipTextActive]}>{tagLabel(tag)}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </OptionRow>

            <TouchableOpacity style={styles.optionRow} onPress={() => setSharedWithPartner(v => !v)} activeOpacity={0.7}>
              <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>{t('shareWithPartner')}</Text>
                {sharedWithPartner && <Text style={styles.optionSummary}>{t('shareWithPartnerOn')}</Text>}
              </View>
              <Ionicons
                name={sharedWithPartner ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={sharedWithPartner ? colors.sageDeep : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.saveBtn, !text.trim() && styles.saveBtnDisabled]} onPress={save} disabled={!text.trim() || saving}>
            <Text style={styles.saveBtnText}>{t('save')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={15} color={colors.urgent} />
            <Text style={styles.deleteBtnText}>{t('deleteEntry')}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function OptionRow({ icon, label, open, summary, onPress, forwardIcon, children, last }: {
  icon: IoniconsName
  label: string
  open: boolean
  summary?: string
  onPress: () => void
  forwardIcon: IoniconsName
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <View style={!last && styles.optionWrap}>
      <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name={icon} size={18} color={colors.textSecondary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.optionLabel}>{label}</Text>
          {!!summary && !open && <Text style={styles.optionSummary} numberOfLines={1}>{summary}</Text>}
        </View>
        <Ionicons name={open ? 'chevron-down' : forwardIcon} size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {open && <View style={styles.optionBody}>{children}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs, paddingTop: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  titleBlock: { paddingHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.sm },
  pageTitle:  { fontFamily: fonts.headlineBold, fontSize: 26, color: colors.textPrimary, lineHeight: 31 },

  notFound:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  notFoundText: { fontSize: 14, color: colors.textSecondary },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56, paddingTop: spacing.xs },

  inputRow: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.xl, paddingHorizontal: 16, paddingVertical: 14, marginBottom: spacing.sm },
  input:    { fontSize: 16, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top', padding: 0, textAlign: 'left' },
  inputRTL: { textAlign: 'right' },

  typeToggle:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  typeChipActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText:    { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },

  list:       { borderTopWidth: 1, borderTopColor: colors.border, marginBottom: spacing.md },
  optionWrap: { borderBottomWidth: 1, borderBottomColor: colors.border },
  optionRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 13 },
  optionLabel:   { fontSize: 15, color: colors.textPrimary },
  optionSummary: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  optionBody: { paddingBottom: spacing.sm },

  detailsInput: { fontSize: 14, color: colors.textPrimary, minHeight: 60, textAlignVertical: 'top', backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm, textAlign: 'left' },

  emptyOptionText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  appointmentList: { gap: 6 },
  appointmentRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.background },
  appointmentRowSelected: { backgroundColor: colors.peach },
  appointmentTitle: { fontSize: 13.5, fontWeight: '600', color: colors.textPrimary },
  appointmentDate:  { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },

  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip:        { paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  tagChipActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  tagChipText:        { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
  tagChipTextActive:  { color: '#fff' },

  saveBtn:     { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, marginTop: spacing.xs },
  deleteBtnText: { fontSize: 13.5, fontWeight: '700', color: colors.urgent },
})
