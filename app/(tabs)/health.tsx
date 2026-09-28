import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { MoodFace, BabyMark, FetusIllustration } from '../../components/illustrations'
import { useNavVisibility } from '../../lib/navVisibility'
import { useAutoScrollEnabled } from '../../lib/useAutoScrollEnabled'
import { gestationalAge } from '../../lib/pregnancy'
import { TODAY, loadLMP } from '../../lib/carePlan'

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
  const [lmp, setLmp] = useState<Date>(TODAY)
  const [mood, setMood] = useState<Mood | null>(null)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [symptomsOpen, setSymptomsOpen] = useState(false)
  const [weight, setWeight] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [vitalsOpen, setVitalsOpen] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const age = gestationalAge(lmp, TODAY)

  // The nav's scroll-collapse behavior is Plan-only (see RadialTabBar) — this
  // screen rarely has enough content to benefit, and forcing it here caused
  // persistent jank. Force-expand on focus so a collapsed state carried over
  // from Plan doesn't linger when the user switches tabs.
  useFocusEffect(useCallback(() => { load(); loadLMP().then(setLmp); expand() }, [expand]))

  async function load() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    const all: CheckIn[] = raw ? JSON.parse(raw) : []
    setCheckIns(all)
    const today = all.find(c => c.date === todayKey())
    if (today) {
      setMood(today.mood ?? null)
      setSymptoms(today.symptoms)
      setWeight(today.weight)
      setBloodPressure(today.bloodPressure)
      setSavedAt(today.loggedAt)
    }
  }

  function toggleSymptom(s: string) {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function photoTrackingComingSoon() {
    const message = "Photo tracking will be available once we add backend support for storing photos."
    if (Platform.OS === 'web') {
      window.alert(message)
    } else {
      Alert.alert('Coming soon', message)
    }
  }

  async function save() {
    const entry: CheckIn = {
      date: todayKey(),
      mood,
      symptoms,
      note: '',
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
  const unpickedSymptoms = SYMPTOMS.filter(s => !symptoms.includes(s))

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={autoScroll.scrollEnabled}
        onLayout={autoScroll.onLayout}
        onContentSizeChange={autoScroll.onContentSizeChange}
      >

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BabyMark size={34} />
            <Text style={styles.appName}>Bumpling</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Health</Text>
            <Text style={styles.heroSubtitle}>Today · Week {age.weeks} + {age.days}</Text>
          </View>
          <FetusIllustration size={110} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>How are you feeling today?</Text>
            {!!savedAt && <Text style={styles.loggedText}>Logged at {formatTime(savedAt)}</Text>}
          </View>

          <View style={styles.moodRow}>
            {MOODS.map(m => {
              const selected = mood === m.key
              return (
                <TouchableOpacity
                  key={m.key}
                  style={styles.moodBtn}
                  onPress={() => setMood(m.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.moodIconChip, { backgroundColor: `${m.color}1F` }, selected && { borderColor: m.color, borderWidth: 2 }]}>
                    <MoodFace mood={m.key} size={22} color={m.color} />
                  </View>
                  <Text style={[styles.moodLabel, selected && { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.cardTitle}>Symptoms</Text>
            <TouchableOpacity onPress={() => setSymptomsOpen(v => !v)} activeOpacity={0.7} style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>{symptomsOpen ? 'Hide' : 'View all'}</Text>
              <Ionicons name={symptomsOpen ? 'chevron-up' : 'chevron-forward'} size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.chipRow}>
            {symptoms.map(s => (
              <View key={s} style={styles.symptomPill}>
                <Text style={styles.symptomPillText}>{s}</Text>
                <TouchableOpacity onPress={() => toggleSymptom(s)} hitSlop={6}>
                  <Ionicons name="close" size={14} color={colors.urgent} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addSymptomBtn} onPress={() => setSymptomsOpen(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={14} color={colors.textPrimary} />
              <Text style={styles.addSymptomText}>Add symptom</Text>
            </TouchableOpacity>
          </View>

          {symptomsOpen && (
            <View style={styles.chipRow}>
              {unpickedSymptoms.length === 0 ? (
                <Text style={styles.emptyText}>All symptoms added.</Text>
              ) : unpickedSymptoms.map(s => (
                <TouchableOpacity key={s} style={styles.pickerChip} onPress={() => toggleSymptom(s)} activeOpacity={0.8}>
                  <Text style={styles.pickerChipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.navRow} onPress={() => setVitalsOpen(v => !v)} activeOpacity={0.7}>
            <View style={styles.navRowIcon}>
              <Ionicons name="body-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navRowTitle}>Track weight</Text>
              <Text style={styles.navRowSub}>{weight || 'optional'}</Text>
            </View>
            <Ionicons name={vitalsOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {vitalsOpen && (
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
          )}

          <TouchableOpacity style={styles.navRow} onPress={photoTrackingComingSoon} activeOpacity={0.7}>
            <View style={styles.navRowIcon}>
              <Ionicons name="camera-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navRowTitle}>I prefer photos!</Text>
              <Text style={styles.navRowSub}>Track with photos</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>{savedAt ? "Update today's check-in" : "Save today's check-in"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Recent check-ins</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>Your check-ins will show up here.</Text>
        ) : (
          <View style={{ gap: spacing.xs }}>
            {history.map(c => {
              const moodMeta = c.mood ? MOODS.find(m => m.key === c.mood) : undefined
              return (
                <View key={c.date} style={styles.historyRow}>
                  <View style={styles.historyDateChip}>
                    <Text style={styles.historyDateText}>{formatDay(c.date)}</Text>
                  </View>
                  {!!moodMeta && (
                    <View style={styles.historyMoodChip}>
                      <MoodFace mood={moodMeta.key} size={16} color={moodMeta.color} />
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
                    {c.symptoms.length === 0 && !c.weight && !c.bloodPressure && !c.note && !moodMeta && (
                      <Text style={styles.historySymptoms}>Feeling good</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.md, paddingTop: 28, paddingBottom: 56 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  appName: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  bellBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot: { position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.background },

  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  title: { fontFamily: fonts.headline, fontSize: 34, color: colors.textPrimary },
  heroSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginTop: -28, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary },
  loggedText: { fontSize: 11.5, color: colors.sageDeep, fontWeight: '600' },

  moodRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  moodBtn: { flex: 1, alignItems: 'center', gap: 6 },
  moodIconChip: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  moodLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },

  symptomPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.urgentBg },
  symptomPillText: { fontSize: 13, fontWeight: '600', color: colors.urgent },

  addSymptomBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  addSymptomText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },

  pickerChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  pickerChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  navRowIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  navRowTitle: { fontSize: 14.5, fontWeight: '700', color: colors.textPrimary },
  navRowSub: { fontSize: 12.5, color: colors.textSecondary, marginTop: 1 },

  vitalsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  vitalField: { flex: 1, gap: 5 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  vitalInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.textPrimary },

  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', marginTop: spacing.xs },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  sectionLabel: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary, marginBottom: spacing.xs },
  emptyText: { fontSize: 13.5, color: colors.textSecondary },

  historyRow: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  historyDateChip: { width: 56, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.background, alignItems: 'center' },
  historyDateText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  historyMoodChip: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  historySymptoms: { fontSize: 13.5, fontWeight: '600', color: colors.textPrimary },
  historyVitals: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  historyNote: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
})
