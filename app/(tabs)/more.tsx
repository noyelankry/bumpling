import { useCallback, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { BabyMark } from '../../components/illustrations'
import { supabase } from '../../lib/supabase'
import { useNavVisibility } from '../../lib/navVisibility'
import { useAutoScrollEnabled } from '../../lib/useAutoScrollEnabled'

type Profile = { full_name: string; username: string }

export default function MoreScreen() {
  const router = useRouter()
  // The nav's scroll-collapse behavior is Plan-only (see RadialTabBar) — this
  // screen has editable TextInputs, and wiring the collapse handlers into its
  // ScrollView caused the same jank/lost-focus issues Health hit before it
  // dropped them. Force-expand on focus instead so a collapsed state carried
  // over from Plan doesn't linger when the user switches tabs.
  const { expand } = useNavVisibility()
  const autoScroll = useAutoScrollEnabled()
  const [form, setForm] = useState<Profile>({ full_name: '', username: '' })
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [snapshot, setSnapshot] = useState<Profile | null>(null)

  useFocusEffect(useCallback(() => { loadProfile(); expand() }, [expand]))

  async function loadProfile() {
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) return
    const { data: p } = await supabase
      .from('profiles').select('*').eq('id', data.claims.sub).single()
    if (p) {
      setForm({ full_name: p.full_name ?? '', username: p.username ?? '' })
    }
  }

  async function save() {
    setSaving(true)
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) { setSaving(false); return }
    const { error } = await supabase.from('profiles').update({
      full_name:  form.full_name || null,
      username:   form.username || null,
      updated_at: new Date().toISOString(),
    }).eq('id', data.claims.sub)
    setSaving(false)
    if (error) { Alert.alert('Error', error.message); return }
    setEditing(false)
  }

  function toggleEdit() {
    if (editing) {
      if (snapshot) setForm(snapshot)
      setEditing(false)
    } else {
      setSnapshot(form)
      setEditing(true)
    }
  }

  function signOut() {
    const doSignOut = () => supabase.auth.signOut()
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out of Bumpling?')) doSignOut()
    } else {
      Alert.alert('Sign out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: doSignOut },
      ])
    }
  }

  const set = (k: keyof Profile) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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

        <Text style={styles.title}>Profile</Text>

        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color="#fff" />
            <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={14} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{form.full_name || 'Add your name'}</Text>
            <Text style={styles.profileUsername}>{form.username ? `@${form.username}` : '@username'}</Text>
          </View>
          <View style={styles.heroMascot}>
            <BabyMark size={38} />
            <View style={styles.heroHeart}>
              <Ionicons name="heart" size={11} color={colors.lavenderDeep} />
            </View>
          </View>
        </View>

        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>Basic info</Text>
          <TouchableOpacity style={styles.editBtn} onPress={toggleEdit} activeOpacity={0.7}>
            <Ionicons
              name={editing ? 'close' : 'pencil'}
              size={14}
              color={editing ? colors.textSecondary : colors.primaryDark}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.fieldsCard, editing && styles.fieldsCardEditing]}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput
              style={styles.fieldInput}
              value={form.full_name}
              onChangeText={set('full_name')}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
              editable={editing}
            />
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.usernameInputRow}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                style={[styles.fieldInput, styles.usernameInput]}
                value={form.username}
                onChangeText={v => set('username')(v.replace(/^@+/, ''))}
                placeholder="username"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                editable={editing}
              />
            </View>
          </View>
        </View>

        {editing && (
          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save changes</Text>
            }
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>More</Text>

        <TouchableOpacity style={styles.listCard} onPress={() => router.push('/brain-dump')} activeOpacity={0.8}>
          <View style={[styles.fieldIcon, styles.braindumpIcon]}>
            <Ionicons name="bulb-outline" size={18} color={colors.creamDeep} />
          </View>
          <Text style={styles.listCardText}>Brain dump</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutRow} onPress={signOut} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={colors.urgent} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.md, paddingTop: 28, paddingBottom: 24 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  appName:    { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  bellBtn:    { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot:    { position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.background },

  title: { fontFamily: fonts.headline, fontSize: 30, color: colors.textPrimary, marginBottom: spacing.sm },

  heroCard:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.peach, borderRadius: radius.xl, padding: spacing.sm, marginBottom: spacing.md },
  avatar:      { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cameraBtn:   { position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  profileName: { fontFamily: fonts.headline, fontSize: 18, color: colors.textPrimary },
  profileUsername: { fontSize: 13, color: colors.textPrimary, opacity: 0.6, marginTop: 2 },
  heroMascot:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroHeart:   { position: 'absolute', top: -3, right: -5 },

  sectionLabel:    { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs, marginTop: spacing.xs },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editBtn:         { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutralChip, alignItems: 'center', justifyContent: 'center' },

  fieldsCard:        { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  fieldsCardEditing: { marginBottom: spacing.xs },
  fieldRow:     { paddingVertical: spacing.xs },
  fieldDivider: { height: 1, backgroundColor: colors.border },
  fieldLabel:   { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary, marginBottom: 3 },
  fieldInput:   { fontSize: 16, fontWeight: '600', color: colors.textPrimary, padding: 0 },
  usernameInputRow: { flexDirection: 'row', alignItems: 'center' },
  usernamePrefix:   { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  usernameInput:    { flex: 1, marginLeft: 1 },

  listCard:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  listCardText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  fieldIcon:      { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  braindumpIcon: { backgroundColor: colors.cream },

  saveBtn:     { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.md },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  logoutRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: spacing.xs },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.urgent },
})
