import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
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

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']
type Section = 'details' | 'appointment' | 'tags' | null

export default function EditBrainDumpScreen() {
  const router = useRouter()
  const { t } = useTranslation('editBrainDump')
  const { t: tTag } = useTranslation('brainDump')
  const { forward } = useDirectionalIcon()
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

  if (loaded && !entries.some(e => e.id === id)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={back} hitSlop={8}>
            <Text style={styles.cancelText}>{t('close')}</Text>
          </TouchableOpacity>
          <View />
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
          <TouchableOpacity onPress={back} hitSlop={8}>
            <Text style={styles.cancelText}>{t('cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('editEntry')}</Text>
          <TouchableOpacity onPress={save} hitSlop={8} disabled={!text.trim() || saving}>
            <Text style={[styles.saveText, !text.trim() && styles.saveTextDisabled]}>{t('save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.addCard}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={t('placeholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <View style={styles.typeToggle}>
              {KIND_OPTIONS.map(opt => {
                const active = kind === opt.kind
                return (
                  <TouchableOpacity
                    key={opt.kind}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setKind(opt.kind)}
                  >
                    <Ionicons name={opt.icon} size={14} color={active ? '#fff' : colors.textSecondary} />
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <OptionRow
            icon="reader-outline"
            label={t('addDetails')}
            open={openSection === 'details'}
            summary={details.trim() || undefined}
            onPress={() => toggleSection('details')}
            forwardIcon={forward}
          >
            <TextInput
              style={styles.detailsInput}
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

          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={15} color={colors.urgent} />
            <Text style={styles.deleteBtnText}>{t('deleteEntry')}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function OptionRow({ icon, label, open, summary, onPress, forwardIcon, children }: {
  icon: IoniconsName
  label: string
  open: boolean
  summary?: string
  onPress: () => void
  forwardIcon: IoniconsName
  children: React.ReactNode
}) {
  return (
    <View style={styles.optionWrap}>
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
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  cancelText: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
  headerTitle: { fontFamily: fonts.headline, fontSize: 16, color: colors.textPrimary },
  saveText:   { fontSize: 15, color: colors.primary, fontWeight: '700' },
  saveTextDisabled: { opacity: 0.4 },

  notFound:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  notFoundText: { fontSize: 14, color: colors.textSecondary },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56, paddingTop: spacing.xs },

  addCard: { backgroundColor: colors.lavender, borderRadius: radius.xl, padding: spacing.sm, marginBottom: spacing.md },
  input:   { fontSize: 17, color: colors.textPrimary, minHeight: 90, textAlignVertical: 'top', marginBottom: spacing.sm },

  typeToggle:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card },
  typeChipActive:  { backgroundColor: colors.primary },
  typeChipText:    { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },

  optionWrap: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, overflow: 'hidden' },
  optionRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  optionLabel:   { fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
  optionSummary: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  optionBody: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },

  detailsInput: { fontSize: 14, color: colors.textPrimary, minHeight: 60, textAlignVertical: 'top', backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm },

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

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, marginTop: spacing.xs },
  deleteBtnText: { fontSize: 13.5, fontWeight: '700', color: colors.urgent },
})
