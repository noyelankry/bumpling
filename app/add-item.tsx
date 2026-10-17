import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../lib/theme'
import DateField from '../components/DateField'
import { formatDateRange } from '../lib/pregnancy'
import { loadCareItems, loadLMP, scheduleItem, addCustomItem } from '../lib/carePlan'
import { addAppointmentToCalendar } from '../lib/calendar'
import { goBack } from '../lib/navigation'
import { useDirectionalIcon } from '../lib/i18n/useDirectionalIcon'
import { useLanguage } from '../lib/i18n/LanguageProvider'

export default function AddItemScreen() {
  const router = useRouter()
  const { t } = useTranslation('addItem')
  const { t: tBusiness } = useTranslation('business')
  const { back: backIcon } = useDirectionalIcon()
  const { isRTL } = useLanguage()
  const back = () => goBack(router, '/(tabs)/plan')
  const params = useLocalSearchParams<{ id?: string; title?: string; date?: string; time?: string; location?: string; prepNote?: string; windowStart?: string; windowEnd?: string }>()
  const isEditing = !!params.id
  const windowStart = params.windowStart ? new Date(params.windowStart) : null
  const windowEnd = params.windowEnd ? new Date(params.windowEnd) : null

  const [title, setTitle] = useState(params.title ?? '')
  const [date, setDate] = useState<Date | null>(params.date ? new Date(params.date) : null)
  const [time, setTime] = useState(params.time ?? '')
  const [location, setLocation] = useState(params.location ?? '')
  const [prepNote, setPrepNote] = useState(params.prepNote ?? '')
  const [addToCalendar, setAddToCalendar] = useState(false)
  const [saving, setSaving] = useState(false)

  const outsideWindow = !!(date && windowStart && windowEnd && (date.getTime() < windowStart.getTime() || date.getTime() > windowEnd.getTime()))

  async function save() {
    if (!title.trim()) return Alert.alert(t('missingTitleTitle'), t('missingTitleBody'))
    if (!date) return Alert.alert(t('missingDateTitle'), t('missingDateBody'))

    setSaving(true)
    const current = await loadCareItems()
    const details = { title: title.trim(), date, timeLabel: time.trim() || undefined, location: location.trim() || undefined, prepNote: prepNote.trim() || undefined }
    if (isEditing && params.id) {
      await scheduleItem(current, params.id, details)
    } else {
      const lmp = await loadLMP()
      await addCustomItem(current, lmp, details)
    }

    if (addToCalendar) {
      const result = await addAppointmentToCalendar({
        title: details.title,
        date: details.date,
        timeLabel: details.timeLabel,
        location: details.location,
        notes: details.prepNote,
      }, tBusiness)
      if (!result.ok) {
        setSaving(false)
        // The appointment itself is already saved — only the calendar step failed.
        Alert.alert(t('couldntAddToCalendar'), result.message, [{ text: t('ok'), onPress: back }])
        return
      }
    }

    setSaving(false)
    back()
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
          <Text style={styles.pageTitle}>{isEditing ? t('scheduleAppointment') : t('addAppointment')}</Text>
          {!isEditing && <Text style={styles.pageSubtitle}>{t('addSubtitle')}</Text>}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Field label={t('titleLabel')}>
            <View style={styles.inputRow}>
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                value={title}
                onChangeText={setTitle}
                placeholder={t('titlePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                editable={!isEditing}
              />
            </View>
          </Field>

          <Field label={t('dateLabel')} style={{ zIndex: 10 }}>
            <DateField value={date} onChange={setDate} placeholder={t('datePlaceholder')} />
          </Field>

          {outsideWindow && windowStart && windowEnd && (
            <View style={styles.warningRow}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.urgent} />
              <Text style={styles.warningText}>
                {t('outsideWindow', { range: formatDateRange(windowStart, windowEnd) })}
              </Text>
            </View>
          )}

          <Field label={t('timeLabel')}>
            <View style={styles.inputRow}>
              <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                value={time}
                onChangeText={setTime}
                placeholder={t('timePlaceholder')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </Field>

          <Field label={t('locationLabel')}>
            <View style={styles.inputRow}>
              <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                value={location}
                onChangeText={setLocation}
                placeholder={t('locationPlaceholder')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </Field>

          <Field label={t('notesLabel')}>
            <View style={[styles.inputRow, styles.multilineRow]}>
              <Ionicons name="reader-outline" size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, styles.multiline, isRTL && styles.inputRTL]}
                value={prepNote}
                onChangeText={setPrepNote}
                placeholder={t('notesPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </View>
          </Field>

          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.calendarRow} onPress={() => setAddToCalendar(v => !v)} activeOpacity={0.7}>
              <View style={[styles.checkbox, addToCalendar && styles.checkboxChecked]}>
                {addToCalendar && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.calendarRowText}>{t('addToCalendar')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            <Text style={styles.saveBtnText}>{isEditing ? t('save') : t('addToPlan')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={back} disabled={saving}>
            <Text style={styles.skipBtnText}>{t('skipForNow')}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.fieldGroup, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs, paddingTop: spacing.md },
  backBtn:   { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  titleBlock:   { paddingHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.sm },
  pageTitle:    { fontFamily: fonts.headlineBold, fontSize: 26, color: colors.textPrimary, lineHeight: 31 },
  pageSubtitle: { fontSize: 13.5, color: colors.textSecondary, marginTop: 4, lineHeight: 19 },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56, paddingTop: spacing.xs },

  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },

  inputRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.xl, paddingHorizontal: 16, paddingVertical: 14 },
  multilineRow: { alignItems: 'flex-start' },
  input:        { flex: 1, fontSize: 15, color: colors.textPrimary, padding: 0, textAlign: 'left' },
  inputRTL:     { textAlign: 'right' },
  multiline:    { minHeight: 60, textAlignVertical: 'top' },

  warningRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: colors.urgentBg, borderRadius: radius.md, padding: spacing.sm, marginTop: -4, marginBottom: spacing.md },
  warningText: { flex: 1, fontSize: 12.5, color: colors.urgent, lineHeight: 18 },

  calendarRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  checkbox:        { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  calendarRowText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  saveBtn:     { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.xs },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  skipBtn:     { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  skipBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13.5 },
})
