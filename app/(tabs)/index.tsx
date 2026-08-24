import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors, spacing, radius } from '../../lib/theme'

type GoalProfile = {
  id: string
  name: string
  phase: string
  calories_limit: number
  protein_target: number
  fiber_target: number
  carbs_limit: number | null
  fat_limit: number | null
  duration_weeks: number | null
}

type DailyTotals = {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

function toISO(d: Date) {
  return d.toISOString().split('T')[0]
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function MacroBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = Math.min(current / target, 1)
  return (
    <View style={styles.macroBarRow}>
      <Text style={styles.macroBarLabel}>{label}</Text>
      <View style={styles.macroBarTrack}>
        <View style={[styles.macroBarFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroBarValue}>{current} / {target} g</Text>
    </View>
  )
}

function CalorieRing({ current, limit }: { current: number; limit: number }) {
  return (
    <View style={styles.ringContainer}>
      <View style={styles.ring}>
        <Text style={styles.ringCalories}>{current}</Text>
        <Text style={styles.ringLimit}>/ {limit}</Text>
        <Text style={styles.ringUnit}>kcal</Text>
      </View>
    </View>
  )
}

export default function HomeScreen() {
  const [name, setName] = useState('')
  const [fullName, setFullName] = useState('')
  const [activeGoal, setActiveGoal] = useState<GoalProfile | null>(null)
  const [logged, setLogged] = useState<DailyTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
  const router = useRouter()

  useFocusEffect(useCallback(() => { loadData() }, []))

  async function loadData() {
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) return
    const userId = data.claims.sub

    const [profileRes, goalRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', userId).single(),
      supabase.from('goal_profiles').select('*').eq('user_id', userId).eq('is_active', true).single(),
      supabase.from('food_logs').select('calories,protein_g,carbs_g,fat_g,fiber_g')
        .eq('user_id', userId).eq('logged_date', toISO(new Date())),
    ])

    if (profileRes.data?.full_name) {
      setFullName(profileRes.data.full_name)
      setName(profileRes.data.full_name.split(' ')[0])
    }
    if (goalRes.data) setActiveGoal(goalRes.data)
    if (logsRes.data) {
      const totals = logsRes.data.reduce(
        (acc, l) => ({
          calories: acc.calories + (l.calories ?? 0),
          protein:  acc.protein  + (l.protein_g ?? 0),
          carbs:    acc.carbs    + (l.carbs_g   ?? 0),
          fat:      acc.fat      + (l.fat_g     ?? 0),
          fiber:    acc.fiber    + (l.fiber_g   ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      )
      setLogged(totals)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>BUMPLING</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity>
              <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
              <Text style={styles.avatarText}>
                {fullName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.greeting}>{greeting()}{name ? `, ${name}!` : '!'}</Text>
        <Text style={styles.greetingSub}>Stay consistent, progress follows.</Text>

        {/* Daily Progress Card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Daily Progress</Text>
          <View style={styles.progressBody}>
            <CalorieRing
              current={logged.calories}
              limit={activeGoal?.calories_limit ?? 2100}
            />
            <View style={styles.barsContainer}>
              <MacroBar label="Protein" current={logged.protein} target={activeGoal?.protein_target ?? 150} color={colors.protein} />
              <MacroBar label="Carbs"   current={logged.carbs}   target={activeGoal?.carbs_limit ?? 250}   color={colors.carbs} />
              <MacroBar label="Fats"    current={logged.fat}     target={activeGoal?.fat_limit ?? 70}      color={colors.fat} />
              <MacroBar label="Fiber"   current={logged.fiber}   target={activeGoal?.fiber_target ?? 30}   color={colors.fiber} />
            </View>
          </View>
        </View>

        {/* Steps + Water */}
        <View style={styles.trackersRow}>
          <View style={styles.trackerCard}>
            <Ionicons name="footsteps-outline" size={20} color={colors.primary} />
            <Text style={styles.trackerLabel}>Steps</Text>
            <Text style={styles.trackerValue}>7,842 <Text style={styles.trackerTarget}>/ 10,000</Text></Text>
          </View>
          <View style={styles.trackerCard}>
            <Ionicons name="water-outline" size={20} color="#60A5FA" />
            <Text style={styles.trackerLabel}>Water</Text>
            <Text style={styles.trackerValue}>5 <Text style={styles.trackerTarget}>/ 8 cups</Text></Text>
          </View>
        </View>

        {/* Active Goal */}
        {activeGoal ? (
          <View style={styles.goalCard}>
            <Ionicons name="flag-outline" size={22} color={colors.primary} />
            <View style={styles.goalInfo}>
              <Text style={styles.goalCardLabel}>Active Goal</Text>
              <Text style={styles.goalName}>{activeGoal.name}</Text>
              {activeGoal.duration_weeks && (
                <Text style={styles.goalWeek}>Week 1 of {activeGoal.duration_weeks}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.viewGoalBtn} onPress={() => router.push('/(tabs)/goals')}>
              <Text style={styles.viewGoalText}>View Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.goalCard} onPress={() => router.push('/(tabs)/goals')}>
            <Ionicons name="flag-outline" size={22} color={colors.textSecondary} />
            <View style={styles.goalInfo}>
              <Text style={styles.goalName}>No active goal</Text>
              <Text style={styles.goalCardLabel}>Tap to create one</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: colors.background },
  scroll:           { paddingHorizontal: spacing.md, paddingBottom: 40 },

  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  appName:          { fontSize: 22, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  headerRight:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatarBtn:        { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:       { fontSize: 13, fontWeight: '700', color: '#fff' },

  greeting:         { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.sm },
  greetingSub:      { fontSize: 14, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },

  progressCard:     { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  progressTitle:    { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: spacing.sm },
  progressBody:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  ringContainer:    { alignItems: 'center', justifyContent: 'center', width: 90, height: 90 },
  ring:             { width: 88, height: 88, borderRadius: 44, borderWidth: 6, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  ringCalories:     { fontSize: 20, fontWeight: '800', color: '#fff' },
  ringLimit:        { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  ringUnit:         { fontSize: 10, color: 'rgba(255,255,255,0.6)' },

  barsContainer:    { flex: 1, gap: 6 },
  macroBarRow:      { gap: 3 },
  macroBarLabel:    { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  macroBarTrack:    { height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  macroBarFill:     { height: '100%', borderRadius: 3 },
  macroBarValue:    { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'right' },

  trackersRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  trackerCard:      { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, gap: 4 },
  trackerLabel:     { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  trackerValue:     { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  trackerTarget:    { fontSize: 13, fontWeight: '400', color: colors.textSecondary },

  goalCard:         { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalInfo:         { flex: 1 },
  goalCardLabel:    { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  goalName:         { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  goalWeek:         { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  viewGoalBtn:      { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm },
  viewGoalText:     { color: '#fff', fontWeight: '600', fontSize: 13 },
})
