import { useCallback, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { BabyMark } from '../components/illustrations'
import { supabase } from '../lib/supabase'
import { clearCarePlanData } from '../lib/carePlan'
import { DEV_BYPASS_KEY } from '../lib/devBypass'
import { goBack } from '../lib/navigation'
import { clearHealthData } from './(tabs)/health'
import { clearBrainDumpData } from '../lib/brainDump'
import { type Partner, loadPartner, savePartner, clearPartnerData } from '../lib/partner'
import { clearBirthPrefsData } from '../lib/birthPrefs'
import { loadMomPhone, saveMomPhone, clearMomContactData } from '../lib/momContact'

type Profile = { full_name: string; username: string }

export default function ProfileScreen() {
  const router = useRouter()
  const back = () => goBack(router, '/(tabs)')
  const [form, setForm] = useState<Profile>({ full_name: '', username: '' })
  const [phone, setPhone] = useState('')
  const [partner, setPartner] = useState<Partner>({ name: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [snapshot, setSnapshot] = useState<{ form: Profile; phone: string; partner: Partner } | null>(null)

  useFocusEffect(useCallback(() => { loadProfile(); loadPartner().then(setPartner); loadMomPhone().then(setPhone) }, []))

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
    // Partner info and mom's phone are local-only (AsyncStorage, see
    // lib/partner.ts / lib/momContact.ts) — they save regardless of Supabase
    // session state, unlike the profile fields below which need a signed-in
    // user to write to.
    await savePartner(partner)
    await saveMomPhone(phone.trim())
    const { data } = await supabase.auth.getClaims()
    if (data?.claims) {
      const { error } = await supabase.from('profiles').update({
        full_name:  form.full_name || null,
        username:   form.username || null,
        updated_at: new Date().toISOString(),
      }).eq('id', data.claims.sub)
      if (error) { setSaving(false); Alert.alert('Error', error.message); return }
    }
    setSaving(false)
    setEditing(false)
  }

  function toggleEdit() {
    if (editing) {
      if (snapshot) { setForm(snapshot.form); setPhone(snapshot.phone); setPartner(snapshot.partner) }
      setEditing(false)
    } else {
      setSnapshot({ form, phone, partner })
      setEditing(true)
    }
  }

  function signOut() {
    const doSignOut = async () => {
      await supabase.auth.signOut()
      await Promise.all([
        clearCarePlanData(),
        clearHealthData(),
        clearBrainDumpData(),
        clearPartnerData(),
        clearBirthPrefsData(),
        clearMomContactData(),
        AsyncStorage.removeItem(DEV_BYPASS_KEY),
      ])
      router.replace('/(auth)/login')
    }
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
  const setPartnerField = (k: keyof Partner) => (v: string) => setPartner(p => ({ ...p, [k]: v }))

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity onPress={back} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 26 }} />
        </View>

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

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.fieldInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Your phone number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              editable={editing}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Partner</Text>
        <Text style={styles.sectionHint}>Used to share appointment details — add their email to invite them along.</Text>

        <View style={[styles.fieldsCard, editing && styles.fieldsCardEditing]}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Partner's name</Text>
            <TextInput
              style={styles.fieldInput}
              value={partner.name}
              onChangeText={setPartnerField('name')}
              placeholder="Their name"
              placeholderTextColor={colors.textSecondary}
              editable={editing}
            />
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Partner's email</Text>
            <TextInput
              style={styles.fieldInput}
              value={partner.email}
              onChangeText={setPartnerField('email')}
              placeholder="their@email.com"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={editing}
            />
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
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 24 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, marginBottom: spacing.xs },
  headerTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary },

  heroCard:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.peach, borderRadius: radius.xl, padding: spacing.sm, marginBottom: spacing.md },
  avatar:      { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cameraBtn:   { position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  profileName: { fontFamily: fonts.headline, fontSize: 18, color: colors.textPrimary },
  profileUsername: { fontSize: 13, color: colors.textPrimary, opacity: 0.6, marginTop: 2 },
  heroMascot:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroHeart:   { position: 'absolute', top: -3, right: -5 },

  sectionLabel:    { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs, marginTop: spacing.xs },
  sectionHint:     { fontSize: 12, color: colors.textSecondary, marginTop: -4, marginBottom: spacing.xs, lineHeight: 16 },
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

  saveBtn:     { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.md },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  logoutRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: spacing.xs },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.urgent },
})
