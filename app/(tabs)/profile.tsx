import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors, spacing, radius } from '../../lib/theme'

type Profile = {
  full_name: string
  username: string
  height_cm: string
  weight_kg: string
  age: string
  sex: string
  activity_level: string
}

const SEX_OPTIONS = ['female', 'male', 'other']
const ACTIVITY_OPTIONS = [
  { value: 'sedentary',   label: 'Sedentary',    hint: 'Little or no exercise' },
  { value: 'light',       label: 'Light',         hint: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderate',      hint: '3–5 days/week' },
  { value: 'active',      label: 'Active',        hint: '6–7 days/week' },
  { value: 'very_active', label: 'Very active',   hint: 'Physical job or 2× training' },
]

function initials(name: string) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export default function ProfileScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [form, setForm] = useState<Profile>({
    full_name: '', username: '', height_cm: '',
    weight_kg: '', age: '', sex: '', activity_level: '',
  })
  const [saving, setSaving] = useState(false)

  useFocusEffect(useCallback(() => { loadProfile() }, []))

  async function loadProfile() {
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) return
    setEmail(data.claims.email ?? '')
    const { data: p } = await supabase
      .from('profiles').select('*').eq('id', data.claims.sub).single()
    if (p) {
      setForm({
        full_name:      p.full_name      ?? '',
        username:       p.username       ?? '',
        height_cm:      p.height_cm      ? String(p.height_cm) : '',
        weight_kg:      p.weight_kg      ? String(p.weight_kg) : '',
        age:            p.age            ? String(p.age)        : '',
        sex:            p.sex            ?? '',
        activity_level: p.activity_level ?? '',
      })
    }
  }

  async function save() {
    setSaving(true)
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) { setSaving(false); return }
    const { error } = await supabase.from('profiles').update({
      full_name:      form.full_name      || null,
      username:       form.username       || null,
      height_cm:      form.height_cm      ? Number(form.height_cm) : null,
      weight_kg:      form.weight_kg      ? Number(form.weight_kg) : null,
      age:            form.age            ? Number(form.age)        : null,
      sex:            form.sex            || null,
      activity_level: form.activity_level || null,
      updated_at:     new Date().toISOString(),
    }).eq('id', data.claims.sub)
    setSaving(false)
    if (error) Alert.alert('Error', error.message)
  }

  async function signOut() {
    const doSignOut = async () => { await supabase.auth.signOut() }
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out?')) doSignOut()
      return
    }
    Alert.alert('Sign out?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: doSignOut },
    ])
  }

  const set = (k: keyof Profile) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={styles.saveBtn}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(form.full_name)}</Text>
          </View>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {/* Basic info */}
        <Text style={styles.sectionLabel}>Basic info</Text>
        <View style={styles.card}>
          <Field label="Full name">
            <TextInput style={styles.input} value={form.full_name} onChangeText={set('full_name')}
              placeholder="Your name" placeholderTextColor={colors.textSecondary} />
          </Field>
          <Field label="Username" last>
            <TextInput style={styles.input} value={form.username} onChangeText={set('username')}
              placeholder="@username" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />
          </Field>
        </View>

        {/* Body stats */}
        <Text style={styles.sectionLabel}>Body stats</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>Height (cm)</Text>
              <TextInput style={styles.input} value={form.height_cm} onChangeText={set('height_cm')}
                keyboardType="numeric" placeholder="e.g. 165" placeholderTextColor={colors.textSecondary} />
            </View>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <TextInput style={styles.input} value={form.weight_kg} onChangeText={set('weight_kg')}
                keyboardType="numeric" placeholder="e.g. 62" placeholderTextColor={colors.textSecondary} />
            </View>
          </View>
          <Field label="Age" last>
            <TextInput style={styles.input} value={form.age} onChangeText={set('age')}
              keyboardType="numeric" placeholder="e.g. 30" placeholderTextColor={colors.textSecondary} />
          </Field>
        </View>

        {/* Sex */}
        <Text style={styles.sectionLabel}>Biological sex</Text>
        <View style={styles.chipRow}>
          {SEX_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, form.sex === opt && styles.chipActive]}
              onPress={() => set('sex')(opt)}
            >
              <Text style={[styles.chipText, form.sex === opt && styles.chipTextActive]}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Activity level */}
        <Text style={styles.sectionLabel}>Activity level</Text>
        <View style={styles.card}>
          {ACTIVITY_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.activityRow, i < ACTIVITY_OPTIONS.length - 1 && styles.activityRowBorder]}
              onPress={() => set('activity_level')(opt.value)}
            >
              <View style={styles.activityText}>
                <Text style={styles.activityLabel}>{opt.label}</Text>
                <Text style={styles.activityHint}>{opt.hint}</Text>
              </View>
              {form.activity_level === opt.value
                ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                : <View style={styles.activityEmpty} />
              }
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

function Field({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={[styles.fieldGroup, !last && styles.fieldGroupBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: colors.background },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:             { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  saveBtn:           { fontSize: 16, fontWeight: '700', color: colors.primary },
  scroll:            { paddingHorizontal: spacing.md, paddingBottom: 48 },
  avatarSection:     { alignItems: 'center', paddingVertical: spacing.lg },
  avatar:            { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText:        { fontSize: 28, fontWeight: '700', color: '#fff' },
  emailText:         { fontSize: 14, color: colors.textSecondary },
  sectionLabel:      { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs, marginTop: spacing.sm },
  card:              { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
  row:               { flexDirection: 'row', gap: spacing.sm },
  rowField:          { flex: 1, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldGroup:        { paddingVertical: spacing.sm },
  fieldGroupBorder:  { borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldLabel:        { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  input:             { fontSize: 15, color: colors.textPrimary, paddingVertical: 2 },
  chipRow:           { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  chip:              { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  chipActive:        { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:          { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  chipTextActive:    { color: '#fff' },
  activityRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  activityRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  activityText:      { flex: 1 },
  activityLabel:     { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  activityHint:      { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  activityEmpty:     { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border },
  signOutBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg, padding: spacing.sm },
  signOutText:       { fontSize: 15, fontWeight: '600', color: '#EF4444' },
})
