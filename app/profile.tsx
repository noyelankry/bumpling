import { useCallback, useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useNavigation } from '@react-navigation/native'
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
import { isValidEmail, isValidPhoneNumber } from '../lib/validation'
import { splitPhone, joinPhone, DEFAULT_PHONE_COUNTRY, type PhoneCountry } from '../lib/phoneCountries'
import PhoneCountryPicker from '../components/PhoneCountryPicker'

type Profile = { full_name: string; username: string }

export default function ProfileScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const { t } = useTranslation('profile')
  const { language, isRTL, setLanguage } = useLanguage()
  const { back: backIcon, forward } = useDirectionalIcon()
  const back = () => goBack(router, '/(tabs)')
  const [form, setForm] = useState<Profile>({ full_name: '', username: '' })
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>(DEFAULT_PHONE_COUNTRY)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [partner, setPartner] = useState<Partner>({ name: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // The last-saved values, so fields can just always be editable — no edit-mode
  // toggle — while still only showing "Save changes" once something actually differs.
  const [saved, setSaved] = useState<{ form: Profile; phoneCountry: PhoneCountry; phoneNumber: string; partner: Partner } | null>(null)
  const phoneError = phoneNumber.trim() !== '' && !isValidPhoneNumber(phoneNumber)
  const partnerEmailError = partner.email.trim() !== '' && !isValidEmail(partner.email)
  const isDirty = !!saved && (
    saved.form.full_name !== form.full_name || saved.form.username !== form.username ||
    saved.phoneCountry.iso !== phoneCountry.iso || saved.phoneNumber !== phoneNumber ||
    saved.partner.name !== partner.name || saved.partner.email !== partner.email
  )
  const canSave = isDirty && !phoneError && !partnerEmailError

  // Catches every way this screen can be left with unsaved changes — the
  // header back button, the iOS swipe-back gesture, Android's hardware back —
  // since all of them remove this screen via the same navigator action that
  // `beforeRemove` observes, not just the one button we render ourselves.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!isDirty) return
      e.preventDefault()
      const leave = () => navigation.dispatch(e.data.action)
      if (Platform.OS === 'web') {
        if (window.confirm(t('unsavedChangesConfirmWeb'))) leave()
      } else {
        Alert.alert(t('unsavedChangesTitle'), t('unsavedChangesBody'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('discard'), style: 'destructive', onPress: leave },
        ])
      }
    })
    return unsubscribe
  }, [navigation, isDirty, t])

  // Browser tab close / refresh / outside-app navigation isn't a React
  // Navigation event at all — only the browser's own beforeunload covers it.
  useEffect(() => {
    if (Platform.OS !== 'web') return
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  useFocusEffect(useCallback(() => {
    let cancelled = false
    ;(async () => {
      const [p, ph] = await Promise.all([loadPartner(), loadMomPhone()])
      let f: Profile = { full_name: '', username: '' }
      const { data } = await supabase.auth.getClaims()
      if (data?.claims) {
        const { data: row } = await supabase.from('profiles').select('*').eq('id', data.claims.sub).single()
        if (row) f = { full_name: row.full_name ?? '', username: row.username ?? '' }
      }
      if (cancelled) return
      const { country, number } = splitPhone(ph)
      setPartner(p)
      setPhoneCountry(country)
      setPhoneNumber(number)
      setForm(f)
      setSaved({ form: f, phoneCountry: country, phoneNumber: number, partner: p })
    })()
    return () => { cancelled = true }
  }, []))

  async function save() {
    setSaving(true)
    // Partner info and mom's phone are local-only (AsyncStorage, see
    // lib/partner.ts / lib/momContact.ts) — they save regardless of Supabase
    // session state, unlike the profile fields below which need a signed-in
    // user to write to.
    await savePartner(partner)
    await saveMomPhone(joinPhone(phoneCountry, phoneNumber))
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
    setSaved({ form, phoneCountry, phoneNumber, partner })
  }

  async function deleteAccount() {
    setDeleting(true)
    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      setDeleting(false)
      Alert.alert(t('error'), error.message)
      return
    }
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

  function confirmDeleteAccount() {
    if (Platform.OS === 'web') {
      if (window.confirm(t('deleteAccountConfirmWeb'))) deleteAccount()
    } else {
      Alert.alert(t('deleteAccountTitle'), t('deleteAccountConfirm'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('deleteAccountTitle'), style: 'destructive', onPress: deleteAccount },
      ])
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
      <View style={styles.blobBottomLeft} pointerEvents="none" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={back} hitSlop={8}>
            <Ionicons name={backIcon} size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroWrap}>
          <View style={styles.avatar}>
            <BabyMark size={60} />
            <TouchableOpacity style={[styles.cameraBtn, isRTL && styles.cameraBtnRTL]} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={14} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.pageTitle} numberOfLines={1}>{form.full_name || t('addYourName')}</Text>
          <Text style={styles.profileUsername}>{form.username ? `@${form.username}` : t('usernamePlaceholder')}</Text>
        </View>

        <Text style={styles.sectionLabel}>{t('basicInfo')}</Text>
        <View style={styles.list}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('fullName')}</Text>
            <TextInput
              style={[styles.fieldInput, isRTL && styles.fieldInputRTL]}
              value={form.full_name}
              onChangeText={set('full_name')}
              placeholder={t('fullNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

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
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('phone')}</Text>
            <View style={styles.phoneRow}>
              <PhoneCountryPicker value={phoneCountry} onChange={setPhoneCountry} label={t('phoneCountryLabel')} />
              <TextInput
                style={[styles.fieldInput, styles.phoneInput, isRTL && styles.fieldInputRTL]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder={t('phonePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
            {phoneError && <Text style={styles.fieldError}>{t('phoneInvalid')}</Text>}
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('partner')}</Text>
        <Text style={styles.sectionHint}>{t('partnerHint')}</Text>

        <View style={styles.list}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('partnerName')}</Text>
            <TextInput
              style={[styles.fieldInput, isRTL && styles.fieldInputRTL]}
              value={partner.name}
              onChangeText={setPartnerField('name')}
              placeholder={t('partnerNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

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
            />
            {partnerEmailError && <Text style={styles.fieldError}>{t('emailInvalid')}</Text>}
          </View>
        </View>

        {isDirty && (
          <TouchableOpacity style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} onPress={save} disabled={saving || !canSave}>
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

        <View style={styles.list}>
          <TouchableOpacity style={styles.subRow} onPress={replayOnboarding} activeOpacity={0.6}>
            <Text style={styles.subRowTitle}>{t('viewOnboardingAgain')}</Text>
            <Ionicons name={forward} size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.subRow} onPress={() => router.push('/change-password')} activeOpacity={0.6}>
            <Text style={styles.subRowTitle}>{t('changePassword')}</Text>
            <Ionicons name={forward} size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.subRow} onPress={() => router.push('/legal')} activeOpacity={0.6}>
            <Text style={styles.subRowTitle}>{t('aboutAndLegal')}</Text>
            <Ionicons name={forward} size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.subRow} onPress={signOut} activeOpacity={0.6}>
            <Text style={[styles.subRowTitle, styles.urgentText]}>{t('logOut')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          <TouchableOpacity style={styles.subRow} onPress={confirmDeleteAccount} activeOpacity={0.6} disabled={deleting}>
            {deleting
              ? <ActivityIndicator color={colors.urgent} size="small" />
              : <Text style={[styles.subRowTitle, styles.urgentText]}>{t('deleteAccount')}</Text>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background, position: 'relative', overflow: 'hidden' },

  // Same corner-wash as Brain Dump — top-right only, for the same reason:
  // a bottom one would sit behind the floating tab bar's own shapes.
  // Inset from the bottom (positive, not negative) rather than hanging off
  // the edge — that's what caused the Brain Dump glitch: a shape clipped
  // right at the boundary next to the floating tab bar's own curves reads
  // as a rendering bug. Kept fully inside the container and only clipped
  // on the left, it's a clean half-circle with no boundary interaction.
  blobBottomLeft: { position: 'absolute', bottom: 50, left: -160, width: 300, height: 300, borderRadius: 150, backgroundColor: colors.lavender, opacity: 0.3 },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56 },

  header:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: -spacing.xs, paddingTop: spacing.xs },
  backBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  heroWrap:    { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
  avatar:      { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  cameraBtn:   { position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  cameraBtnRTL: { right: undefined, left: -2 },
  pageTitle:   { fontFamily: fonts.headlineBold, fontSize: 22, color: colors.textPrimary, textAlign: 'center' },
  profileUsername: { fontSize: 13.5, color: colors.textSecondary, marginTop: 3, textAlign: 'center' },

  sectionLabel: { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.lg, marginBottom: 4 },
  sectionHint:  { fontSize: 12.5, color: colors.textSecondary, lineHeight: 17, marginBottom: 4 },

  list:         { borderTopWidth: 1, borderTopColor: colors.border },
  fieldRow:     { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldLabel:   { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary, marginBottom: 3 },
  fieldInput:   { fontSize: 16, color: colors.textPrimary, padding: 0, textAlign: 'left' },
  fieldInputRTL: { textAlign: 'right' },
  usernameInputRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  usernamePrefix:   { fontSize: 16, color: colors.textSecondary },
  usernameInput:    { flex: 1 },
  phoneRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phoneInput:  { flex: 1 },
  fieldError:  { fontSize: 12, color: colors.urgent, marginTop: 4 },

  saveBtn:     { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  languageRow: { flexDirection: 'row', gap: spacing.lg, paddingVertical: 4 },
  langOption:  { paddingVertical: 8 },
  langOptionActive: {},
  langOptionText:   { fontSize: 14.5, fontWeight: '600', color: colors.textSecondary },
  langOptionTextActive: { color: colors.textPrimary, fontWeight: '700' },

  subRow:      { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subRowTitle: { fontSize: 15, color: colors.textPrimary },
  urgentText:  { color: colors.urgent },
})
