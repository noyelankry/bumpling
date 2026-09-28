import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { MoodFace } from '../../components/illustrations'
import { useNavVisibility } from '../../lib/navVisibility'
import { useAutoScrollEnabled } from '../../lib/useAutoScrollEnabled'

const STORAGE_KEY = 'bumpling_health_checkins'

const SYMPTOMS = [
  'Nausea', 'Fatigue', 'Headache', 'Backache',
  'Heartburn', 'Swelling', 'Cramping', 'Insomnia',
] as const

type Mood = 'happy' | 'calm' | 'okay' | 'tired' | 'anxious'

const MOODS: { key: Mood; label: string; color: string }[] = [
  { key: 'happy', label: 'Happy', color: colors.moodHappy },
  { key: 'calm', label: 'Calm', color: colors.moodCalm },
  { key: 'okay', label: 'Okay', color: colors.moodOkay },
  { key: 'tired', label: 'Tired', color: colors.moodTired },
  { key: 'anxious', label: 'Anxious', color: colors.moodAnxious },
]

type CheckIn = {
  date: string // yyyy-mm-dd
  mood: Mood | null
  symptoms: string[]
  note: string
  weight: string
  bloodPressure: string
  loggedAt: string
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

function formatDay(dateKey: string) {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function HealthScreen() {
  const { expand } = useNavVisibility()
  const autoScroll = useAutoScrollEnabled()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [mood, setMood] = useState<Mood | null>(null)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [weight, setWeight] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // The nav's scroll-collapse behavior is Plan-only (see RadialTabBar) — this
  // screen rarely has enough content to benefit, and forcing it here caused
  // persistent jank. Force-expand on focus so a collapsed state carried over
  // from Plan doesn't linger when the user switches tabs.
  useFocusEffect(useCallback(() => { load(); expand() }, [expand]))

  async function load() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    const all: CheckIn[] = raw ? JSON.parse(raw) : []
    setCheckIns(all)
    const today = all.find(c => c.date === todayKey())
    if (today) {
      setMood(today.mood ?? null)
      setSymptoms(today.symptoms)
      setNote(today.note)
      setWeight(today.weight)
      setBloodPressure(today.bloodPressure)
      setSavedAt(today.loggedAt)
    }
  }

  function toggleSymptom(s: string) {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function save() {
    const entry: CheckIn = {
      date: todayKey(),
      mood,
      symptoms,
      note: note.trim(),
      weight: weight.trim(),
      bloodPressure: bloodPressure.trim(),
      loggedAt: new Date().toISOString(),
    }
    const others = checkIns.filter(c => c.date !== entry.date)
    const next = [entry, ...others].sort((a, b) => b.date.localeCompare(a.date))
    setCheckIns(next)
    setSavedAt(entry.loggedAt)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const history = checkIns.filter(c => c.date !== todayKey())

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={autoScroll.scrollEnabled}
        onLayout={autoScroll.onLayout}
        onContentSizeChange={autoScroll.onContentSizeChange}
      >

        <Text style={styles.title}>Health</Text>
        <Text style={styles.subtitle}>A quick way to track how you're feeling for your next appointment.</Text>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>How are you feeling today?</Text>
            {savedAt && <Text style={styles.loggedText}>Logged at {formatTime(savedAt)}</Text>}
          </View>

          <View style={styles.moodRow}>
            {MOODS.map(m => {
              const selected = mood === m.key
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.moodBtn, selected && { borderColor: m.color, backgroundColor: `${m.color}1A` }]}
                  onPress={() => setMood(m.key)}
                  activeOpacity={0.8}
                >
                  <MoodFace mood={m.key} size={22} color={m.color} />
                  <Text style={styles.moodLabel}>{m.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.subLabel}>Any symptoms?</Text>
          <View style={styles.chipRow}>
            {SYMPTOMS.map(s => {
              const active = symptoms.includes(s)
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleSymptom(s)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Anything else to note? (optional)"
            placeholderTextColor={colors.textSecondary}
            multiline
          />

          <View style={styles.vitalsRow}>
            <View style={styles.vitalField}>
              <Text style={styles.fieldLabel}>Weight</Text>
              <TextInput
                style={styles.vitalInput}
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 68 kg"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.vitalField}>
              <Text style={styles.fieldLabel}>Blood pressure</Text>
              <TextInput
                style={styles.vitalInput}
                value={bloodPressure}
                onChangeText={setBloodPressure}
                placeholder="e.g. 118/76"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>{savedAt ? "Update today's check-in" : "Save today's check-in"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Recent check-ins</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>Your check-ins will show up here.</Text>
        ) : (
          <View style={{ gap: spacing.xs }}>
            {history.map(c => (
              <View key={c.date} style={styles.historyRow}>
                <View style={styles.historyDateChip}>
                  <Text style={styles.historyDateText}>{formatDay(c.date)}</Text>
                </View>
                {!!c.mood && (
                  <View style={styles.historyMoodChip}>
                    <MoodFace mood={c.mood} size={16} color={MOODS.find(m => m.key === c.mood)?.color ?? colors.textSecondary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {c.symptoms.length > 0 && (
                    <Text style={styles.historySymptoms}>{c.symptoms.join(', ')}</Text>
                  )}
                  {(c.weight || c.bloodPressure) && (
                    <Text style={styles.historyVitals}>
                      {[c.weight, c.bloodPressure].filter(Boolean).join('  ·  ')}
                    </Text>
                  )}
                  {!!c.note && <Text style={styles.historyNote} numberOfLines={1}>{c.note}</Text>}
                  {c.symptoms.length === 0 && !c.weight && !c.bloodPressure && !c.note && !c.mood && (
                    <Text style={styles.historySymptoms}>Feeling good</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 56 },

  title:    { fontFamily: fonts.headline, fontSize: 28, color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md, lineHeight: 19 },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  cardLabel:     { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  loggedText:    { fontSize: 11.5, color: colors.sageDeep, fontWeight: '600' },

  moodRow:   { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  moodBtn:   { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  moodLabel: { fontSize: 10.5, fontWeight: '600', color: colors.textPrimary },

  subLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  chipActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:      { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive:{ color: '#fff' },

  noteInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.textPrimary, minHeight: 44, textAlignVertical: 'top', marginBottom: spacing.sm },

  vitalsRow:   { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  vitalField:  { flex: 1, gap: 5 },
  fieldLabel:  { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  vitalInput:  { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.textPrimary },

  saveBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },

  sectionLabel: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary, marginBottom: spacing.xs },
  emptyText:    { fontSize: 13.5, color: colors.textSecondary },

  historyRow:      { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  historyDateChip: { width: 56, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.background, alignItems: 'center' },
  historyDateText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  historyMoodChip: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  historySymptoms: { fontSize: 13.5, fontWeight: '600', color: colors.textPrimary },
  historyVitals:   { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  historyNote:     { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
})
