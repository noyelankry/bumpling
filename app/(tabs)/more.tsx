import { useCallback, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { supabase } from '../../lib/supabase'
import { useNavVisibility } from '../../lib/navVisibility'
import { useAutoScrollEnabled } from '../../lib/useAutoScrollEnabled'

type Profile = { full_name: string; username: string }

function initials(name: string) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export default function MoreScreen() {
  const router = useRouter()
  const { onScroll, expand } = useNavVisibility()
  const autoScroll = useAutoScrollEnabled()
  const [email, setEmail] = useState('')
  const [form, setForm] = useState<Profile>({ full_name: '', username: '' })
  const [saving, setSaving] = useState(false)

  useFocusEffect(useCallback(() => { loadProfile() }, []))

  async function loadProfile() {
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) return
    setEmail(data.claims.email ?? '')
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
    if (error) Alert.alert('Error', error.message)
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={autoScroll.scrollEnabled}
        onLayout={autoScroll.onLayout}
        onContentSizeChange={autoScroll.onContentSizeChange}
        onScroll={onScroll}
        scrollEventThrottle={80}
        onTouchStart={expand}
      >

        <Text style={styles.title}>Profile</Text>

        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(form.full_name)}</Text>
          </View>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        <Text style={styles.sectionLabel}>Basic info</Text>
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput
              style={styles.input}
              value={form.full_name}
              onChangeText={set('full_name')}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={[styles.fieldGroup, styles.fieldGroupLast]}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={form.username}
              onChangeText={set('username')}
              placeholder="@username"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, styles.rowSpaced]} onPress={() => router.push('/brain-dump')} activeOpacity={0.7}>
          <View style={[styles.rowIcon, styles.braindumpIcon]}>
            <Ionicons name="bulb-outline" size={20} color={colors.creamDeep} />
          </View>
          <Text style={styles.rowText}>Brain dump</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={signOut} activeOpacity={0.7}>
          <View style={[styles.rowIcon, styles.signOutIcon]}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          </View>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  scroll:       { paddingHorizontal: spacing.md, paddingBottom: 56 },

  title:        { fontFamily: fonts.headline, fontSize: 28, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },

  avatarSection: { alignItems: 'center', paddingVertical: spacing.md },
  avatar:        { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  avatarText:    { fontSize: 26, fontWeight: '700', color: '#fff' },
  emailText:     { fontSize: 14, color: colors.textSecondary },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs, marginTop: spacing.xs },

  card:             { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  fieldGroup:       { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 4 },
  fieldGroupLast:   { borderBottomWidth: 0 },
  fieldLabel:       { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  input:            { fontSize: 15, color: colors.textPrimary, paddingVertical: 2 },

  saveBtn:      { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.lg },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },

  row:          { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, gap: 12, borderWidth: 1, borderColor: colors.border },
  rowSpaced:    { marginBottom: spacing.xs },
  rowIcon:      { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  braindumpIcon:{ backgroundColor: colors.cream },
  rowText:      { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  signOutIcon:  { backgroundColor: '#FEE2E2' },
  signOutText:  { flex: 1, fontSize: 15, fontWeight: '600', color: '#EF4444' },
})
