import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { colors, spacing, radius } from '../../lib/theme'
import { BabyMark, FetusIllustration, MoodFace } from '../../components/illustrations'
import { gestationalAge, formatDate, formatDateRange } from '../../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, computeCareItems, type CareItemWithCustom } from '../../lib/carePlan'

type Mood = 'happy' | 'calm' | 'okay' | 'tired' | 'anxious'

const MOODS: { key: Mood; label: string; color: string }[] = [
  { key: 'happy', label: 'Happy', color: colors.moodHappy },
  { key: 'calm', label: 'Calm', color: colors.moodCalm },
  { key: 'okay', label: 'Okay', color: colors.moodOkay },
  { key: 'tired', label: 'Tired', color: colors.moodTired },
  { key: 'anxious', label: 'Anxious', color: colors.moodAnxious },
]

const QUICK_LINKS = [
  { id: 'braindump', title: 'Brain\ndump', bg: colors.cream, kind: 'bulb' as const, route: '/brain-dump' },
  { id: 'health', title: 'Health &\nwellness', bg: colors.sage, kind: 'leaf' as const, route: '/(tabs)/health' },
  { id: 'appointments', title: 'Appointments\n& tests', bg: colors.lavender, kind: 'calendar' as const, route: '/(tabs)/plan' },
] as const

export default function HomeScreen() {
  const [mood, setMood] = useState<Mood | null>(null)
  const [items, setItems] = useState<CareItemWithCustom[]>(DEFAULT_CARE_ITEMS)
  const [lmp, setLmp] = useState<Date>(TODAY)
  const router = useRouter()
  const age = gestationalAge(lmp, TODAY)

  useFocusEffect(useCallback(() => {
    loadCareItems().then(setItems)
    loadLMP().then(setLmp)
  }, []))

  const computed = computeCareItems(items, lmp, TODAY)
  const nextItem = computed
    .filter(i => i.status !== 'scheduled' && i.status !== 'done')
    .sort((a, b) => a.bookBy.getTime() - b.bookBy.getTime())[0]

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BabyMark size={34} />
            <Text style={styles.appName}>Bumpling</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekCard}>
          <View style={styles.weekCardLeft}>
            <Text style={styles.weekTitle}>Week {age.weeks} • Day {age.days}</Text>
            <Text style={styles.weekSubtitle}>Your little bumpling is growing beautifully this week.</Text>
            <View style={styles.divider} />
            <View style={styles.tipRow}>
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={styles.tipText}>
                This week: tiny fingers are forming and movement is increasing.
              </Text>
            </View>
          </View>
          <FetusIllustration size={108} />
        </View>

        {nextItem && (
          <>
            <Text style={styles.sectionTitle}>Needs your attention</Text>
            <TouchableOpacity
              style={styles.attentionCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/appointment/${nextItem.id}`)}
            >
              <View style={styles.iconChip}>
                <Ionicons name="calendar-outline" size={20} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attentionTitle}>{nextItem.title}</Text>
                <Text style={styles.attentionMeta}>
                  {nextItem.status === 'actionable'
                    ? `Book by ${formatDate(nextItem.bookBy)}`
                    : `Target dates: ${formatDateRange(nextItem.windowStart, nextItem.windowEnd)}`}
                </Text>
              </View>
              <Text style={styles.viewPlan}>View</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}

        <Text style={[styles.sectionTitle, styles.moodHeading]}>How are you feeling today?</Text>
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
                <MoodFace mood={m.key} size={24} color={m.color} />
                <Text style={styles.moodLabel}>{m.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.quickRow}>
          {QUICK_LINKS.map(q => (
            <TouchableOpacity
              key={q.id}
              style={[styles.quickCard, { backgroundColor: q.bg }]}
              activeOpacity={0.8}
              onPress={() => router.push(q.route as any)}
            >
              {q.kind === 'bulb' && <Ionicons name="bulb-outline" size={22} color={colors.creamDeep} />}
              {q.kind === 'leaf' && <Ionicons name="leaf-outline" size={22} color={colors.sageDeep} />}
              {q.kind === 'calendar' && <Ionicons name="calendar-outline" size={22} color={colors.lavenderDeep} />}
              <View style={styles.quickCardBottom}>
                <Text style={styles.quickCardTitle}>{q.title}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 40 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  appName:     { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  bellBtn:     { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  weekCard:     { flexDirection: 'row', backgroundColor: colors.peach, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.lg, alignItems: 'center', gap: spacing.xs },
  weekCardLeft: { flex: 1 },
  weekTitle:    { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  weekSubtitle: { fontSize: 13.5, color: colors.textPrimary, opacity: 0.7, marginTop: 6, lineHeight: 19 },
  divider:      { width: 36, height: 3, borderRadius: 2, backgroundColor: colors.primary, marginVertical: spacing.sm },
  tipRow:       { flexDirection: 'row', gap: 6 },
  tipText:      { flex: 1, fontSize: 12.5, color: colors.textPrimary, opacity: 0.75, lineHeight: 18 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },

  attentionCard:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.lg },
  iconChip:       { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  attentionTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  attentionMeta:  { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
  viewPlan:       { fontSize: 12.5, fontWeight: '600', color: colors.primary },

  moodHeading: { marginBottom: spacing.sm },
  moodRow:     { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  moodBtn:     { flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  moodLabel:   { fontSize: 11, fontWeight: '600', color: colors.textPrimary },

  quickRow:         { flexDirection: 'row', gap: spacing.sm },
  quickCard:        { flex: 1, borderRadius: radius.lg, padding: spacing.sm, minHeight: 96, justifyContent: 'space-between' },
  quickCardBottom:  { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  quickCardTitle:   { fontSize: 13.5, fontWeight: '700', color: colors.textPrimary, lineHeight: 17 },
})
