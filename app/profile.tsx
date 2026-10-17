import { useCallback, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { BabyMark } from '../components/illustrations'
import { supabase } from '../lib/supabase'
import { clearCarePlanData } from '../lib/carePlan'
import { DEV_BYPASS_KEY } from '../lib/devBypass'
import { ONBOARDING_KEY } from '../lib/onboarding'
import { goBack } from '../lib/navigation'
import { clearHealthData } from './(tabs)/health'
import { clearBrainDumpData } from '../lib/brainDump'
import { type Partner, loadPartner, savePartner, clearPartnerData } from '../lib/partner'
import { clearBirthPrefsData } from '../lib/birthPrefs'
import { loadMomPhone, saveMomPhone, clearMomContactData } from '../lib/momContact'
import { useLanguage } from '../lib/i18n/LanguageProvider'
import { useDirectionalIcon } from '../lib/i18n/useDirectionalIcon'
import type { Language } from '../lib/i18n/languageStorage'

type Profile = { full_name: string; username: string }

export default function ProfileScreen() {
  const router = useRouter()
  const { t } = useTranslation('profile')
  const { language, isRTL, setLanguage } = useLanguage()
  const { back: backIcon, forward } = useDirectionalIcon()
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
      if (error) { setSaving(false); Alert.alert(t('error'), error.message); return }
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
      if (window.confirm(t('signOutConfirmWeb'))) doSignOut()
    } else {
      Alert.alert(t('signOutTitle'), t('signOutConfirm'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('signOutTitle'), style: 'destructive', onPress: doSignOut },
      ])
    }
  }

  async function replayOnboarding() {
    await AsyncStorage.removeItem(ONBOARDING_KEY)
    router.push('/(auth)/onboarding')
  }

  const set = (k: keyof Profile) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const setPartnerField = (k: keyof Partner) => (v: string) => setPartner(p => ({ ...p, [k]: v }))

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity onPress={back} hitSlop={8}>
            <Ionicons name={backIcon} size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <BabyMark size={52} />
            </View>
            <TouchableOpacity style={[styles.cameraBtn, isRTL && styles.cameraBtnRTL]} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={14} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{form.full_name || t('addYourName')}</Text>
          <Text style={styles.profileUsername}>{form.username ? `@${form.username}` : t('usernamePlaceholder')}</Text>
        </View>

        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>{t('basicInfo')}</Text>
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
            <Text style={styles.fieldLabel}>{t('fullName')}</Text>
            <TextInput
              style={[styles.fieldInput, isRTL && styles.fieldInputRTL]}
              value={form.full_name}
              onChangeText={set('full_name')}
              placeholder={t('fullNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              editable={editing}
            />
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('username')}</Text>
            <View style={styles.usernameInputRow}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                style={[styles.fieldInput, styles.usernameInput, isRTL && styles.fieldInputRTL]}
                value={form.username}
                onChangeText={v => set('username')(v.replace(/^@+/, ''))}
                placeholder={t('usernameFieldPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                editable={editing}
              />
            </View>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('phone')}</Text>
            <TextInput
              style={[styles.fieldInput, isRTL && styles.fieldInputRTL]}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('phonePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              editable={editing}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('partner')}</Text>
        <Text style={styles.sectionHint}>{t('partnerHint')}</Text>

        <View style={[styles.fieldsCard, editing && styles.fieldsCardEditing]}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('partnerName')}</Text>
            <TextInput
              style={[styles.fieldInput, isRTL && styles.fieldInputRTL]}
              value={partner.name}
              onChangeText={setPartnerField('name')}
              placeholder={t('partnerNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              editable={editing}
            />
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('partnerEmail')}</Text>
            <TextInput
              style={[styles.fieldInput, isRTL && styles.fieldInputRTL]}
              value={partner.email}
              onChangeText={setPartnerField('email')}
              placeholder={t('partnerEmailPlaceholder')}
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
              : <Text style={styles.saveBtnText}>{t('saveChanges')}</Text>
            }
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>{t('language')}</Text>
        <View style={styles.languageRow}>
          {(['en', 'he'] as Language[]).map(lang => (
            <TouchableOpacity
              key={lang}
              style={[styles.langOption, language === lang && styles.langOptionActive]}
              onPress={() => setLanguage(lang)}
              activeOpacity={0.7}
            >
              <Text style={[styles.langOptionText, language === lang && styles.langOptionTextActive]}>
                {lang === 'en' ? t('languageEnglish') : t('languageHebrew')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={replayOnboarding} activeOpacity={0.7}>
            <View style={[styles.actionIconChip, { backgroundColor: colors.lavender }]}>
              <Ionicons name="play-outline" size={17} color={colors.lavenderDeep} />
            </View>
            <Text style={styles.actionText}>{t('viewOnboardingAgain')}</Text>
            <Ionicons name={forward} size={17} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.fieldDivider} />

          <TouchableOpacity style={styles.actionRow} onPress={signOut} activeOpacity={0.7}>
            <View style={[styles.actionIconChip, { backgroundColor: colors.urgentBg }]}>
              <Ionicons name="log-out-outline" size={17} color={colors.urgent} />
            </View>
            <Text style={[styles.actionText, styles.actionTextUrgent]}>{t('logOut')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 24 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, marginBottom: spacing.xs },
  headerTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary },

  heroCard:    { alignItems: 'center', backgroundColor: colors.peach, borderRadius: radius.xl, paddingVertical: spacing.lg, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  avatarWrap:  { marginBottom: spacing.sm },
  avatar:      { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  cameraBtn:   { position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  cameraBtnRTL: { right: undefined, left: -2 },
  profileName: { fontFamily: fonts.headline, fontSize: 20, color: colors.textPrimary },
  profileUsername: { fontSize: 13, color: colors.textPrimary, opacity: 0.6, marginTop: 3 },

  sectionLabel:    { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs, marginTop: spacing.xs },
  sectionHint:     { fontSize: 12, color: colors.textSecondary, marginTop: -4, marginBottom: spacing.xs, lineHeight: 16 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editBtn:         { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutralChip, alignItems: 'center', justifyContent: 'center' },

  fieldsCard:        { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  fieldsCardEditing: { marginBottom: spacing.xs },
  fieldRow:     { paddingVertical: spacing.xs },
  fieldDivider: { height: 1, backgroundColor: colors.border },
  fieldLabel:   { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary, marginBottom: 3 },
  fieldInput:   { fontSize: 16, fontWeight: '600', color: colors.textPrimary, padding: 0, textAlign: 'left' },
  fieldInputRTL: { textAlign: 'right' },
  usernameInputRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  usernamePrefix:   { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  usernameInput:    { flex: 1 },

  saveBtn:     { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.md },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  languageRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  langOption:  { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.neutralChip },
  langOptionActive: { backgroundColor: colors.primary },
  langOptionText:   { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  langOptionTextActive: { color: '#fff' },

  actionsCard: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  actionRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  actionIconChip: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionText:        { flex: 1, fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
  actionTextUrgent:  { color: colors.urgent },
})
