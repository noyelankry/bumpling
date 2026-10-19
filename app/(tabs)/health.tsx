import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { MoodFace, BabyMark, FetusIllustration } from '../../components/illustrations'
import { useAutoScrollEnabled } from '../../lib/useAutoScrollEnabled'
import { gestationalAge } from '../../lib/pregnancy'
import { getDateLocale } from '../../lib/i18n/dateLocale'
import { useDirectionalIcon } from '../../lib/i18n/useDirectionalIcon'
import { TODAY, loadLMP, currentPregnancyId } from '../../lib/carePlan'
import { supabase } from '../../lib/supabase'

// No-op now — data is server-side and cascade-deleted on account deletion, not local.
export async function clearHealthData(): Promise<void> {}

// Stored values stay these fixed English keys regardless of display
// language — same pattern as care-item ids — so a saved check-in never goes
// stale if the user switches language later. Display labels are resolved
// through t('symptom.<key>') / t('mood.<key>') at render time.
const SYMPTOMS = [
  'nausea', 'fatigue', 'headache', 'backache',
  'heartburn', 'swelling', 'cramping', 'insomnia',
] as const

type Mood = 'happy' | 'calm' | 'okay' | 'tired' | 'anxious'

const MOOD_KEYS: { key: Mood; color: string }[] = [
  { key: 'happy', color: colors.moodHappy },
  { key: 'calm', color: colors.moodCalm },
  { key: 'okay', color: colors.moodOkay },
  { key: 'tired', color: colors.moodTired },
  { key: 'anxious', color: colors.moodAnxious },
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
  return new Date(dateKey + 'T00:00:00').toLocaleDateString(getDateLocale(), { month: 'short', day: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(getDateLocale(), { hour: 'numeric', minute: '2-digit' })
}

export default function HealthScreen() {
  const router = useRouter()
  const { t } = useTranslation('health')
  const { forward } = useDirectionalIcon()
  const MOODS = MOOD_KEYS.map(m => ({ ...m, label: t(`mood.${m.key}`) }))
  // Case-insensitive so a legacy capitalized symptom saved before this
  // translation existed still resolves to its label instead of showing raw.
  const symptomLabel = (s: string): string =>
    (SYMPTOMS as readonly string[]).includes(s.toLowerCase()) ? t(`symptom.${s.toLowerCase()}` as 'symptom.nausea') : s
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

  useFocusEffect(useCallback(() => { load(); loadLMP().then(setLmp) }, []))

  async function load() {
    const { data: claims } = await supabase.auth.getClaims()
    const userId = claims?.claims?.sub
    if (!userId) { setCheckIns([]); return }
    const { data: rows } = await supabase.from('health_logs').select('*').eq('user_id', userId).order('log_date', { ascending: false })
    const all: CheckIn[] = (rows ?? []).map(row => ({
      date: row.log_date,
      mood: row.mood,
      symptoms: row.symptoms ?? [],
      note: row.note ?? '',
      weight: row.weight ?? '',
      bloodPressure: row.blood_pressure ?? '',
      loggedAt: row.logged_at,
    }))
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
    const message = t('photoTrackingComingSoon')
    if (Platform.OS === 'web') {
      window.alert(message)
    } else {
      Alert.alert(t('comingSoonTitle'), message)
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
    const { data: claims } = await supabase.auth.getClaims()
    const userId = claims?.claims?.sub
    if (userId) {
      const pregnancyId = await currentPregnancyId()
      await supabase.from('health_logs').upsert({
        user_id: userId,
        pregnancy_id: pregnancyId,
        log_date: entry.date,
        mood: entry.mood,
        symptoms: entry.symptoms,
        note: entry.note || null,
        weight: entry.weight || null,
        blood_pressure: entry.bloodPressure || null,
        logged_at: entry.loggedAt,
      }, { onConflict: 'user_id,log_date' })
    }
    const others = checkIns.filter(c => c.date !== entry.date)
    const next = [entry, ...others].sort((a, b) => b.date.localeCompare(a.date))
    setCheckIns(next)
    setSavedAt(entry.loggedAt)
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
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')} accessibilityLabel={t('profileLabel')}>
              <Ionicons name="person-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('title')}</Text>
            <Text style={styles.heroSubtitle}>{t('heroSubtitle', { weeks: age.weeks, days: age.days })}</Text>
          </View>
          <FetusIllustration size={92} />
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>{t('howFeeling')}</Text>
          {!!savedAt && <Text style={styles.loggedText}>{t('loggedAt', { time: formatTime(savedAt) })}</Text>}
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
          <Text style={styles.sectionLabel}>{t('symptoms')}</Text>
          <TouchableOpacity onPress={() => setSymptomsOpen(v => !v)} activeOpacity={0.7} style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>{symptomsOpen ? t('hide') : t('viewAll')}</Text>
            <Ionicons name={symptomsOpen ? 'chevron-up' : forward} size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.chipRow}>
          {symptoms.map(s => (
            <View key={s} style={styles.symptomPill}>
              <Text style={styles.symptomPillText}>{symptomLabel(s)}</Text>
              <TouchableOpacity onPress={() => toggleSymptom(s)} hitSlop={6}>
                <Ionicons name="close" size={13} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addSymptomBtn} onPress={() => setSymptomsOpen(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={14} color={colors.textPrimary} />
            <Text style={styles.addSymptomText}>{t('addSymptom')}</Text>
          </TouchableOpacity>
        </View>

        {symptomsOpen && (
          <View style={styles.chipRow}>
            {unpickedSymptoms.length === 0 ? (
              <Text style={styles.emptyText}>{t('allSymptomsAdded')}</Text>
            ) : unpickedSymptoms.map(s => (
              <TouchableOpacity key={s} style={styles.pickerChip} onPress={() => toggleSymptom(s)} activeOpacity={0.8}>
                <Text style={styles.pickerChipText}>{symptomLabel(s)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.list}>
          <TouchableOpacity style={styles.navRow} onPress={() => setVitalsOpen(v => !v)} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={styles.navRowTitle}>{t('trackWeight')}</Text>
              <Text style={styles.navRowSub}>{weight || t('optional')}</Text>
            </View>
            <Ionicons name={vitalsOpen ? 'chevron-down' : forward} size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {vitalsOpen && (
            <View style={styles.vitalsRow}>
              <View style={styles.vitalField}>
                <Text style={styles.fieldLabel}>{t('weight')}</Text>
                <TextInput
                  style={styles.vitalInput}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder={t('weightPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.vitalField}>
                <Text style={styles.fieldLabel}>{t('bloodPressure')}</Text>
                <TextInput
                  style={styles.vitalInput}
                  value={bloodPressure}
                  onChangeText={setBloodPressure}
                  placeholder={t('bloodPressurePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.navRow} onPress={photoTrackingComingSoon} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={styles.navRowTitle}>{t('preferPhotos')}</Text>
              <Text style={styles.navRowSub}>{t('trackWithPhotos')}</Text>
            </View>
            <Ionicons name={forward} size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>{savedAt ? t('updateCheckIn') : t('saveCheckIn')}</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, styles.historyLabel]}>{t('recentCheckIns')}</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>{t('noCheckInsYet')}</Text>
        ) : (
          <View style={styles.list}>
            {history.map(c => {
              const moodMeta = c.mood ? MOODS.find(m => m.key === c.mood) : undefined
              return (
                <View key={c.date} style={styles.historyRow}>
                  <Text style={styles.historyDateText}>{formatDay(c.date)}</Text>
                  {!!moodMeta && <MoodFace mood={moodMeta.key} size={16} color={moodMeta.color} />}
                  <View style={{ flex: 1 }}>
                    {c.symptoms.length > 0 && (
                      <Text style={styles.historySymptoms}>{c.symptoms.map(symptomLabel).join(', ')}</Text>
                    )}
                    {(c.weight || c.bloodPressure) && (
                      <Text style={styles.historyVitals}>
                        {[c.weight, c.bloodPressure].filter(Boolean).join('  ·  ')}
                      </Text>
                    )}
                    {!!c.note && <Text style={styles.historyNote} numberOfLines={1}>{c.note}</Text>}
                    {c.symptoms.length === 0 && !c.weight && !c.bloodPressure && !c.note && !moodMeta && (
                      <Text style={styles.historySymptoms}>{t('feelingGood')}</Text>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  appName: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  profileBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginBottom: spacing.lg },
  title: { fontFamily: fonts.headlineBold, fontSize: 30, color: colors.textPrimary },
  heroSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionLabel: { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  historyLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  loggedText: { fontSize: 11.5, color: colors.sageDeep, fontWeight: '600' },

  moodRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  moodBtn: { flex: 1, alignItems: 'center', gap: 6 },
  moodIconChip: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  moodLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },

  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },

  symptomPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.neutralChip },
  symptomPillText: { fontSize: 12.5, fontWeight: '600', color: colors.textPrimary },

  addSymptomBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  addSymptomText: { fontSize: 12.5, fontWeight: '600', color: colors.textPrimary },

  pickerChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  pickerChipText: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },

  list: { borderTopWidth: 1, borderTopColor: colors.border, marginBottom: spacing.md },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  navRowTitle: { fontSize: 15, color: colors.textPrimary },
  navRowSub: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },

  vitalsRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  vitalField: { flex: 1, gap: 5 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  vitalInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.textPrimary },

  saveBtn: { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  emptyText: { fontSize: 13.5, color: colors.textSecondary },

  historyRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyDateText: { width: 52, fontSize: 12.5, fontWeight: '700', color: colors.textPrimary },
  historySymptoms: { fontSize: 13.5, fontWeight: '600', color: colors.textPrimary },
  historyVitals: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  historyNote: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
})
