import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { goBack } from '../lib/navigation'
import { formatDate } from '../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, computeCareItems, type CareItemWithCustom } from '../lib/carePlan'
import { type EntryCategory, loadEntries, addEntry, SUGGESTED_TAGS } from '../lib/brainDump'

type Section = 'details' | 'appointment' | 'tags' | null

export default function AddBrainDumpScreen() {
  const router = useRouter()
  const back = () => goBack(router, '/(tabs)/brain-dump')
  const params = useLocalSearchParams<{ text?: string; category?: string }>()

  const [text, setText] = useState(params.text ?? '')
  const [category, setCategory] = useState<EntryCategory>(params.category === 'doctor' ? 'doctor' : 'personal')
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
  }, []))

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

  function pickAppointment(id: string, title: string) {
    if (appointmentId === id) {
      setAppointmentId(undefined)
      setAppointmentTitle(undefined)
    } else {
      setAppointmentId(id)
      setAppointmentTitle(title)
    }
  }

  async function save() {
    const trimmed = text.trim()
    if (!trimmed || saving) return
    setSaving(true)
    const entries = await loadEntries()
    await addEntry(entries, {
      text: trimmed,
      category,
      details,
      tags,
      linkedAppointmentId: appointmentId,
      linkedAppointmentTitle: appointmentTitle,
    })
    setSaving(false)
    back()
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        <View style={styles.header}>
          <TouchableOpacity onPress={back} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={save} hitSlop={8} disabled={!text.trim() || saving}>
            <Text style={[styles.saveText, !text.trim() && styles.saveTextDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.addCard}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.textSecondary}
              multiline
              autoFocus={!params.text}
            />
            <View style={styles.addRow}>
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeChip, category === 'personal' && styles.typeChipActive]}
                  onPress={() => setCategory('personal')}
                >
                  <Ionicons name="bulb-outline" size={14} color={category === 'personal' ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.typeChipText, category === 'personal' && styles.typeChipTextActive]}>Thought</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeChip, category === 'doctor' && styles.typeChipActive]}
                  onPress={() => setCategory('doctor')}
                >
                  <Ionicons name="medical-outline" size={14} color={category === 'doctor' ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.typeChipText, category === 'doctor' && styles.typeChipTextActive]}>Ask doctor</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.addBtn, !text.trim() && styles.addBtnDisabled]}
                onPress={save}
                disabled={!text.trim() || saving}
                accessibilityLabel="Save entry"
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <OptionRow
            icon="reader-outline"
            label="Add details (optional)"
            open={openSection === 'details'}
            summary={details.trim() || undefined}
            onPress={() => toggleSection('details')}
          >
            <TextInput
              style={styles.detailsInput}
              value={details}
              onChangeText={setDetails}
              placeholder="Anything else worth remembering"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </OptionRow>

          <OptionRow
            icon="calendar-outline"
            label="Add to next appointment"
            open={openSection === 'appointment'}
            summary={appointmentTitle}
            onPress={() => toggleSection('appointment')}
          >
            {upcomingAppointments.length === 0 ? (
              <Text style={styles.emptyOptionText}>No upcoming appointments yet.</Text>
            ) : (
              <View style={styles.appointmentList}>
                {upcomingAppointments.map(item => {
                  const selected = appointmentId === item.id
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.appointmentRow, selected && styles.appointmentRowSelected]}
                      onPress={() => pickAppointment(item.id, item.title)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.appointmentTitle}>{item.title}</Text>
                        <Text style={styles.appointmentDate}>
                          {item.status === 'scheduled' && item.scheduledAt ? formatDate(item.scheduledAt) : `Book by ${formatDate(item.bookBy)}`}
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
            label="Add tag"
            open={openSection === 'tags'}
            summary={tags.length > 0 ? tags.join(', ') : undefined}
            onPress={() => toggleSection('tags')}
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
                    <Text style={[styles.tagChipText, selected && styles.tagChipTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </OptionRow>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function OptionRow({ icon, label, open, summary, onPress, children }: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  open: boolean
  summary?: string
  onPress: () => void
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
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {open && <View style={styles.optionBody}>{children}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  cancelText: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
  saveText:   { fontSize: 15, color: colors.primary, fontWeight: '700' },
  saveTextDisabled: { opacity: 0.4 },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56, paddingTop: spacing.xs },

  addCard: { backgroundColor: colors.lavender, borderRadius: radius.xl, padding: spacing.sm, marginBottom: spacing.md },
  input:   { fontSize: 17, color: colors.textPrimary, minHeight: 90, textAlignVertical: 'top', marginBottom: spacing.sm },
  addRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  typeToggle:      { flexDirection: 'row', gap: 8, flex: 1 },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card },
  typeChipActive:  { backgroundColor: colors.primary },
  typeChipText:    { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },

  addBtn:         { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs },
  addBtnDisabled: { opacity: 0.4 },

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
})
