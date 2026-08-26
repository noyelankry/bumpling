import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors, spacing, radius } from '../../lib/theme'

type Phase = 'cutting' | 'maintaining' | 'gaining' | 'custom'

type GoalProfile = {
  id: string
  name: string
  phase: Phase
  calories_limit: number
  protein_target: number
  fiber_target: number
  carbs_limit: number | null
  fat_limit: number | null
  duration_weeks: number | null
  is_active: boolean
  updated_at: string
}

const PHASE_NAME_PLACEHOLDER: Record<Phase, string> = {
  cutting:     'e.g. My 12-Week Cut',
  maintaining: 'e.g. Happy Maintenance',
  gaining:     'e.g. Ready to Bulk',
  custom:      'e.g. My Custom Plan',
}

const PHASES: { value: Phase; label: string }[] = [
  { value: 'cutting',     label: 'Cutting' },
  { value: 'maintaining', label: 'Maintaining' },
  { value: 'gaining',     label: 'Mass Gaining' },
  { value: 'custom',      label: 'Custom' },
]

const PHASE_DEFAULTS: Record<Phase, Partial<GoalProfile>> = {
  cutting:     { protein_target: 130, carbs_limit: 120, fat_limit: 50, fiber_target: 25, duration_weeks: 12 }, // ~1,450 kcal
  maintaining: { protein_target: 130, carbs_limit: 210, fat_limit: 60, fiber_target: 25 },                     // ~1,900 kcal
  gaining:     { protein_target: 130, carbs_limit: 280, fat_limit: 70, fiber_target: 25, duration_weeks: 16 }, // ~2,270 kcal
  custom:      { protein_target: 130, carbs_limit: 210, fat_limit: 60, fiber_target: 25 },                     // ~1,900 kcal
}

const PHASE_DURATION_HINT: Record<Phase, string> = {
  cutting:     'Tip: 8–16 weeks is typical. Longer cuts risk muscle loss.',
  maintaining: '',
  gaining:     'Tip: 12–20 weeks is typical. Longer phases increase fat gain.',
  custom:      '',
}

const emptyForm = {
  name: '', phase: 'cutting' as Phase,
  protein_target: '', fiber_target: '',
  carbs_limit: '', fat_limit: '', duration_weeks: '',
}

function calcCalories(protein: string, carbs: string, fat: string): number {
  const p = parseFloat(protein) || 0
  const c = parseFloat(carbs)  || 0
  const f = parseFloat(fat)    || 0
  return Math.round(p * 4 + c * 4 + f * 9)
}

function calcProgress(profile: GoalProfile) {
  if (!profile.duration_weeks) return null
  const activatedAt = new Date(profile.updated_at)
  const now = new Date()
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - activatedAt.getTime()) / (1000 * 60 * 60 * 24)))
  const totalDays = profile.duration_weeks * 7
  const daysLeft = Math.max(0, totalDays - daysElapsed)
  const weekNumber = Math.min(Math.floor(daysElapsed / 7) + 1, profile.duration_weeks)
  const progress = Math.min(daysElapsed / totalDays, 1)
  return { daysLeft, weekNumber, progress }
}

export default function GoalsScreen() {
  const [profiles, setProfiles] = useState<GoalProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useFocusEffect(useCallback(() => { fetchProfiles() }, []))

  async function fetchProfiles() {
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) return
    const { data: rows, error } = await supabase
      .from('goal_profiles').select('*')
      .eq('user_id', data.claims.sub)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error && rows) setProfiles(rows)
    setLoading(false)
  }

  function openCreateModal() {
    const defaults = PHASE_DEFAULTS['cutting']
    setForm({
      ...emptyForm,
      protein_target: String(defaults.protein_target ?? ''),
      fiber_target:   String(defaults.fiber_target   ?? ''),
      carbs_limit:    String(defaults.carbs_limit    ?? ''),
      fat_limit:      String(defaults.fat_limit      ?? ''),
      duration_weeks: String(defaults.duration_weeks ?? ''),
    })
    setModalVisible(true)
  }

  function onPhaseChange(phase: Phase) {
    const defaults = PHASE_DEFAULTS[phase]
    setForm(f => ({
      ...f, phase,
      protein_target: String(defaults.protein_target ?? f.protein_target),
      fiber_target:   String(defaults.fiber_target   ?? f.fiber_target),
      carbs_limit:    String(defaults.carbs_limit    ?? f.carbs_limit),
      fat_limit:      String(defaults.fat_limit      ?? f.fat_limit),
      duration_weeks: defaults.duration_weeks != null ? String(defaults.duration_weeks) : '',
    }))
  }

  async function saveProfile() {
    if (!form.name.trim()) return Alert.alert('Name required')
    if (!form.carbs_limit || !form.fat_limit) return Alert.alert('Carbs and fat are required to calculate calories')
    setSaving(true)
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) { setSaving(false); return }
    const calories = calcCalories(form.protein_target, form.carbs_limit, form.fat_limit)
    const { error } = await supabase.from('goal_profiles').insert({
      user_id:        data.claims.sub,
      name:           form.name.trim(),
      phase:          form.phase,
      calories_limit: calories,
      protein_target: Number(form.protein_target),
      fiber_target:   Number(form.fiber_target),
      carbs_limit:    Number(form.carbs_limit),
      fat_limit:      Number(form.fat_limit),
      duration_weeks: form.duration_weeks ? Number(form.duration_weeks) : null,
    })
    setSaving(false)
    if (error) return Alert.alert('Error', error.message)
    setModalVisible(false)
    fetchProfiles()
  }

  async function setActive(profile: GoalProfile) {
    const currentActive = profiles.find(p => p.is_active)
    if (!currentActive) { doSetActive(profile); return }

    if (Platform.OS === 'web') {
      if (window.confirm(`"${currentActive.name}" is currently active. Switch to "${profile.name}"?`)) doSetActive(profile)
      return
    }

    Alert.alert(
      'Switch active goal?',
      `"${currentActive.name}" is currently active. Switch to "${profile.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', onPress: () => doSetActive(profile) },
      ]
    )
  }

  async function doSetActive(profile: GoalProfile) {
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) return
    const now = new Date().toISOString()
    await supabase.from('goal_profiles').update({ is_active: false }).eq('user_id', data.claims.sub)
    await supabase.from('goal_profiles').update({ is_active: true, updated_at: now }).eq('id', profile.id)
    fetchProfiles()
  }

  async function deleteProfile(id: string) {
    const doDelete = async () => {
      const { error } = await supabase.from('goal_profiles').delete().eq('id', id)
      if (error) Alert.alert('Could not delete', error.message)
      else fetchProfiles()
    }

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this profile? This cannot be undone.')) doDelete()
      return
    }

    Alert.alert('Delete profile?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ])
  }

  const phaseLabel = (phase: Phase) => PHASES.find(p => p.value === phase)?.label ?? phase
  const activeProfile = profiles.find(p => p.is_active)
  const otherProfiles = profiles.filter(p => !p.is_active)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Goals</Text>
        <TouchableOpacity onPress={openCreateModal}>
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : profiles.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="flag-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>No profiles yet</Text>
          <Text style={styles.emptySubtitle}>Create your first macro goal to get started.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openCreateModal}>
            <Text style={styles.emptyBtnText}>Create goal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {activeProfile && (() => {
            const prog = calcProgress(activeProfile)
            return (
              <View style={styles.activeCard}>
                <View style={styles.activeCardTop}>
                  <View>
                    <Text style={styles.activePhaseLabel}>{phaseLabel(activeProfile.phase)}</Text>
                    <Text style={styles.activeName}>{activeProfile.name}</Text>
                  </View>
                  {prog && (
                    <Text style={styles.activeWeek}>Week {prog.weekNumber} of {activeProfile.duration_weeks}</Text>
                  )}
                </View>

                <Text style={styles.activeMacros}>
                  {activeProfile.calories_limit} kcal
                  {activeProfile.protein_target ? `  ·  ${activeProfile.protein_target}g Protein` : ''}
                  {activeProfile.fiber_target   ? `  ·  ${activeProfile.fiber_target}g Fiber`   : ''}
                </Text>

                {prog && (
                  <>
                    <View style={styles.activeProgressTrack}>
                      <View style={[styles.activeProgressFill, { width: `${prog.progress * 100}%` }]} />
                    </View>
                    <Text style={styles.daysLeft}>{prog.daysLeft} days left</Text>
                  </>
                )}
              </View>
            )
          })()}

          {otherProfiles.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Other Profiles</Text>
              {otherProfiles.map(item => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.phasePill}>
                      <Text style={styles.phasePillText}>{phaseLabel(item.phase)}</Text>
                    </View>
                  </View>
                  <Text style={styles.profileName}>{item.name}</Text>
                  <View style={styles.macroRow}>
                    <MacroChip label="kcal"    value={item.calories_limit} />
                    <MacroChip label="protein" value={`${item.protein_target}g`} />
                    <MacroChip label="fiber"   value={`${item.fiber_target}g`} />
                    {item.carbs_limit != null && <MacroChip label="carbs" value={`${item.carbs_limit}g`} />}
                    {item.fat_limit   != null && <MacroChip label="fat"   value={`${item.fat_limit}g`} />}
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.setActiveBtn} onPress={() => setActive(item)}>
                      <Text style={styles.setActiveBtnText}>Set Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteProfile(item.id)}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Goal Profile</Text>
            <TouchableOpacity onPress={saveProfile} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={styles.saveText}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Field label="Profile name">
              <TextInput
                style={styles.input}
                placeholder={PHASE_NAME_PLACEHOLDER[form.phase]}
                placeholderTextColor={colors.textSecondary}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />
            </Field>

            <Text style={styles.fieldLabel}>Phase</Text>
            <View style={styles.phaseRow}>
              {PHASES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.phaseChip, form.phase === p.value && styles.phaseChipActive]}
                  onPress={() => onPhaseChange(p.value)}
                >
                  <Text style={[styles.phaseChipText, form.phase === p.value && styles.phaseChipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field label="Protein target (g/day)">
              <TextInput style={styles.input} keyboardType="numeric" value={form.protein_target}
                placeholderTextColor={colors.textSecondary}
                onChangeText={v => setForm(f => ({ ...f, protein_target: v }))} />
            </Field>
            <Field label="Carbs limit (g/day)">
              <TextInput style={styles.input} keyboardType="numeric" value={form.carbs_limit}
                placeholderTextColor={colors.textSecondary}
                onChangeText={v => setForm(f => ({ ...f, carbs_limit: v }))} />
            </Field>
            <Field label="Fat limit (g/day)">
              <TextInput style={styles.input} keyboardType="numeric" value={form.fat_limit}
                placeholderTextColor={colors.textSecondary}
                onChangeText={v => setForm(f => ({ ...f, fat_limit: v }))} />
            </Field>
            <Field label="Fiber target (g/day)">
              <TextInput style={styles.input} keyboardType="numeric" value={form.fiber_target}
                placeholderTextColor={colors.textSecondary}
                onChangeText={v => setForm(f => ({ ...f, fiber_target: v }))} />
            </Field>

            <View style={styles.calorieResult}>
              <Text style={styles.calorieResultLabel}>Calculated daily calories</Text>
              <Text style={styles.calorieResultValue}>
                {calcCalories(form.protein_target, form.carbs_limit, form.fat_limit)} kcal
              </Text>
              <Text style={styles.calorieFormula}>
                ({form.protein_target || 0}g × 4) + ({form.carbs_limit || 0}g × 4) + ({form.fat_limit || 0}g × 9)
              </Text>
            </View>

            <Field label="Duration (weeks) — optional">
              <TextInput style={styles.input} keyboardType="numeric" value={form.duration_weeks}
                placeholderTextColor={colors.textSecondary}
                onChangeText={v => setForm(f => ({ ...f, duration_weeks: v }))} />
              {!!PHASE_DURATION_HINT[form.phase] && (
                <Text style={styles.fieldHint}>{PHASE_DURATION_HINT[form.phase]}</Text>
              )}
            </Field>

            <View style={styles.disclaimer}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.disclaimerText}>
                These are general guidelines. For personalised targets, consult a registered dietitian or nutritionist before starting a new phase.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function MacroChip({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.macroChip}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: colors.background },
  header:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title:               { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  scroll:              { paddingHorizontal: spacing.md, paddingBottom: 40 },
  emptyState:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: spacing.sm },
  emptyTitle:          { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  emptySubtitle:       { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  emptyBtn:            { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md, marginTop: spacing.xs },
  emptyBtnText:        { color: '#fff', fontWeight: '700', fontSize: 15 },
  activeCard:          { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  activeCardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  activePhaseLabel:    { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.65)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  activeName:          { fontSize: 20, fontWeight: '700', color: '#fff' },
  activeWeek:          { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  activeMacros:        { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: spacing.sm },
  activeProgressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: spacing.xs },
  activeProgressFill:  { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  daysLeft:            { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  sectionLabel:        { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:                { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  cardTop:             { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  phasePill:           { backgroundColor: colors.background, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  phasePillText:       { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  profileName:         { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  macroRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  macroChip:           { backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm, alignItems: 'center' },
  macroValue:          { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  macroLabel:          { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  cardActions:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setActiveBtn:        { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm },
  setActiveBtnText:    { color: '#fff', fontWeight: '600', fontSize: 13 },
  modal:               { flex: 1, backgroundColor: colors.background },
  modalHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle:          { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  cancelText:          { fontSize: 16, color: colors.textSecondary },
  saveText:            { fontSize: 16, fontWeight: '700', color: colors.primary },
  modalBody:           { padding: spacing.md, gap: 4 },
  fieldGroup:          { marginBottom: spacing.md },
  fieldLabel:          { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input:               { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.textPrimary },
  phaseRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  phaseChip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  phaseChipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  phaseChipText:       { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  phaseChipTextActive: { color: '#fff' },
  fieldHint:           { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  disclaimer:          { flexDirection: 'row', gap: 8, backgroundColor: colors.border + '60', borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md, alignItems: 'flex-start' },
  disclaimerText:      { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  calorieResult:       { backgroundColor: colors.primary + '12', borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', marginBottom: spacing.md },
  calorieResultLabel:  { fontSize: 12, fontWeight: '600', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  calorieResultValue:  { fontSize: 28, fontWeight: '800', color: colors.primary },
  calorieFormula:      { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
})
