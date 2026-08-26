import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, spacing, radius } from '../../lib/theme'
import { BabyMark, BellyMark, FetusIllustration, MoodFace } from '../../components/illustrations'

type Mood = 'happy' | 'calm' | 'okay' | 'tired' | 'anxious'

const MOODS: { key: Mood; label: string; color: string }[] = [
  { key: 'happy', label: 'Happy', color: colors.moodHappy },
  { key: 'calm', label: 'Calm', color: colors.moodCalm },
  { key: 'okay', label: 'Okay', color: colors.moodOkay },
  { key: 'tired', label: 'Tired', color: colors.moodTired },
  { key: 'anxious', label: 'Anxious', color: colors.moodAnxious },
]

const UPCOMING = [
  { id: 'nipt', title: 'NIPT', date: 'May 22, 2025', icon: 'flask-outline' as const, chip: colors.lavender, iconColor: colors.lavenderDeep },
  { id: 'nuchal', title: 'Nuchal translucency', date: 'May 29, 2025', icon: 'gift-outline' as const, chip: colors.cream, iconColor: colors.creamDeep },
]

const QUICK_LINKS = [
  { id: 'weekly', title: 'Weekly\npregnancy', bg: colors.peach, kind: 'belly' as const },
  { id: 'health', title: 'Health &\nwellness', bg: colors.sage, kind: 'leaf' as const },
  { id: 'appointments', title: 'Appointments\n& tests', bg: colors.lavender, kind: 'calendar' as const },
]

export default function HomeScreen() {
  const [mood, setMood] = useState<Mood | null>(null)

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
            <Text style={styles.weekTitle}>Week 11 • Day 3</Text>
            <Text style={styles.weekSubtitle}>Your little bumpling is growing beautifully this week.</Text>
            <View style={styles.divider} />
            <View style={styles.tipRow}>
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={styles.tipText}>
                This week: tiny fingers are forming and movement is increasing.
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.85}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.weekBtn}
              >
                <Text style={styles.weekBtnText}>See this week</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <FetusIllustration size={108} />
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Coming up</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.listCard}>
          {UPCOMING.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.listRow, i > 0 && styles.listRowDivider]}
              activeOpacity={0.7}
            >
              <View style={[styles.iconChip, { backgroundColor: item.chip }]}>
                <Ionicons name={item.icon} size={18} color={item.iconColor} />
              </View>
              <Text style={styles.listRowTitle}>{item.title}</Text>
              <Text style={styles.listRowDate}>{item.date}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

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
            <TouchableOpacity key={q.id} style={[styles.quickCard, { backgroundColor: q.bg }]} activeOpacity={0.8}>
              {q.kind === 'belly' && <BellyMark size={22} color={colors.primaryDark} />}
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
  tipRow:       { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  tipText:      { flex: 1, fontSize: 12.5, color: colors.textPrimary, opacity: 0.75, lineHeight: 18 },
  weekBtn:      { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.pill },
  weekBtnText:  { color: colors.textOnPrimary, fontWeight: '700', fontSize: 13.5 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  sectionTitle:     { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  seeAll:           { fontSize: 13, fontWeight: '600', color: colors.primary },

  listCard:        { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden' },
  listRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  listRowDivider:   { borderTopWidth: 1, borderTopColor: colors.border },
  iconChip:         { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  listRowTitle:     { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  listRowDate:      { fontSize: 12.5, color: colors.textSecondary, marginRight: 2 },

  moodHeading: { marginBottom: spacing.sm },
  moodRow:     { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  moodBtn:     { flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  moodLabel:   { fontSize: 11, fontWeight: '600', color: colors.textPrimary },

  quickRow:         { flexDirection: 'row', gap: spacing.sm },
  quickCard:        { flex: 1, borderRadius: radius.lg, padding: spacing.sm, minHeight: 96, justifyContent: 'space-between' },
  quickCardBottom:  { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  quickCardTitle:   { fontSize: 13.5, fontWeight: '700', color: colors.textPrimary, lineHeight: 17 },
})
