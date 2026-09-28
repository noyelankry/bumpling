import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fonts } from '../lib/theme'
import DateField from '../components/DateField'
import { formatDateRange } from '../lib/pregnancy'
import { loadCareItems, loadLMP, scheduleItem, addCustomItem } from '../lib/carePlan'
import { addAppointmentToCalendar } from '../lib/calendar'

export default function AddItemScreen() {
  const router = useRouter()
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
    if (!title.trim()) return Alert.alert('Add a title', 'What is this appointment for?')
    if (!date) return Alert.alert('Add a date', 'Pick a date for this appointment.')

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
      })
      if (!result.ok) {
        setSaving(false)
        // The appointment itself is already saved — only the calendar step failed.
        Alert.alert("Couldn't add to calendar", result.message, [{ text: 'OK', onPress: () => router.back() }])
        return
      }
    }

    setSaving(false)
    router.back()
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Schedule appointment' : 'Add appointment'}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Field label="Title">
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Dentist checkup"
              placeholderTextColor={colors.textSecondary}
              editable={!isEditing}
            />
          </Field>

          <View style={styles.row}>
            <Field label="Date" style={{ flex: 1 }}>
              <DateField value={date} onChange={setDate} placeholder="Select a date" />
            </Field>
            <Field label="Time (optional)" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="e.g. 10:30 AM"
                placeholderTextColor={colors.textSecondary}
              />
            </Field>
          </View>

          {outsideWindow && windowStart && windowEnd && (
            <View style={styles.warningRow}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.urgent} />
              <Text style={styles.warningText}>
                That's outside the recommended window ({formatDateRange(windowStart, windowEnd)}). Doctors' schedules don't always line up — you can still save it.
              </Text>
            </View>
          )}

          <Field label="Doctor / location (optional)">
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Dr. Cohen, Sunshine Clinic"
              placeholderTextColor={colors.textSecondary}
            />
          </Field>

          <Field label="Notes (optional)">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={prepNote}
              onChangeText={setPrepNote}
              placeholder="e.g. No fasting needed, bring insurance card"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </Field>

          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.calendarRow} onPress={() => setAddToCalendar(v => !v)} activeOpacity={0.7}>
              <Ionicons
                name={addToCalendar ? 'checkbox' : 'square-outline'}
                size={20}
                color={addToCalendar ? colors.primary : colors.textSecondary}
              />
              <Text style={styles.calendarRowText}>Add to my calendar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            <Text style={styles.saveBtnText}>{isEditing ? 'Save' : 'Add to plan'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => router.back()} disabled={saving}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
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
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56, paddingTop: 28 },

  row: { flexDirection: 'row', gap: spacing.sm },

  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input:      { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary },
  multiline:  { minHeight: 70, textAlignVertical: 'top' },

  warningRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: colors.urgentBg, borderRadius: radius.md, padding: spacing.sm, marginTop: -4, marginBottom: spacing.md },
  warningText: { flex: 1, fontSize: 12.5, color: colors.urgent, lineHeight: 18 },

  calendarRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  calendarRowText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  saveBtn:     { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', marginTop: spacing.xs },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  skipBtn:     { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  skipBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13.5 },
})
