import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../lib/theme'
import { parseDate } from '../lib/pregnancy'
import { loadCareItems, loadLMP, scheduleItem, addCustomItem } from '../lib/carePlan'

export default function AddItemScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string; title?: string; date?: string; time?: string; prepNote?: string }>()
  const isEditing = !!params.id

  const [title, setTitle] = useState(params.title ?? '')
  const [dateText, setDateText] = useState(params.date ? formatForInput(new Date(params.date)) : '')
  const [time, setTime] = useState(params.time ?? '')
  const [prepNote, setPrepNote] = useState(params.prepNote ?? '')
  const [saving, setSaving] = useState(false)

  function formatForInput(d: Date) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  async function save() {
    if (!title.trim()) return Alert.alert('Add a title', 'What is this appointment for?')
    const date = parseDate(dateText.trim())
    if (!date) return Alert.alert('Add a date', 'Try something like "Sep 12".')

    setSaving(true)
    const current = await loadCareItems()
    if (isEditing && params.id) {
      await scheduleItem(current, params.id, { title: title.trim(), date, timeLabel: time.trim() || undefined, prepNote: prepNote.trim() || undefined })
    } else {
      const lmp = await loadLMP()
      await addCustomItem(current, lmp, { title: title.trim(), date, timeLabel: time.trim() || undefined, prepNote: prepNote.trim() || undefined })
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
              <TextInput
                style={styles.input}
                value={dateText}
                onChangeText={setDateText}
                placeholder="e.g. Sep 12"
                placeholderTextColor={colors.textSecondary}
              />
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

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            <Text style={styles.saveBtnText}>{isEditing ? 'Save' : 'Add to plan'}</Text>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 40, paddingTop: spacing.xs },

  row: { flexDirection: 'row', gap: spacing.sm },

  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input:      { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary },
  multiline:  { minHeight: 70, textAlignVertical: 'top' },

  saveBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.xs },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
