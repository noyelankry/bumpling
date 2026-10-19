import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { DEV_BYPASS_KEY, allowDevBypass } from '../lib/devBypass'
import { useLanguage } from '../lib/i18n/LanguageProvider'
import { TERMS_VERSION, PRIVACY_VERSION, HEALTH_CONSENT_VERSION } from '../lib/legal'
import { redeemInvite, PARTNER_REDEEM_FLAG } from '../lib/partnerInvite'
import { BabyMark } from './illustrations'

function Checkbox({ checked, onPress, children }: { checked: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <TouchableOpacity style={styles.checkboxRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={styles.checkboxText}>{children}</Text>
    </TouchableOpacity>
  )
}

export default function Auth() {
  const { t } = useTranslation('auth')
  const { isRTL } = useLanguage()
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedHealthData, setAgreedHealthData] = useState(false)
  const [agreedAge, setAgreedAge] = useState(false)
  const [confirmationPending, setConfirmationPending] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  const canSignUp = mode === 'signin' || (agreedTerms && agreedHealthData && agreedAge && usernameStatus === 'available')

  useEffect(() => {
    if (mode !== 'signup') return
    const trimmed = username.trim()
    if (trimmed.length === 0) { setUsernameStatus('idle'); return }
    if (trimmed.length < 3 || !/^[a-zA-Z0-9_]+$/.test(trimmed)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    const handle = setTimeout(async () => {
      const { data, error } = await supabase.rpc('username_available', { check_username: trimmed })
      setUsernameStatus(error ? 'idle' : data ? 'available' : 'taken')
    }, 400)
    return () => clearTimeout(handle)
  }, [username, mode])

  // RLS requires a real session to write here, so a signup that doesn't
  // return one immediately (email confirmation pending) can't record consent
  // yet — this runs again on the first successful sign-in to backfill it.
  async function writeConsentIfMissing(userId: string) {
    const { data: existing } = await supabase.from('consent_logs').select('id').eq('user_id', userId).limit(1)
    if (existing && existing.length > 0) return
    await supabase.from('consent_logs').insert([
      { user_id: userId, document: 'terms', version: TERMS_VERSION },
      { user_id: userId, document: 'privacy', version: PRIVACY_VERSION },
      { user_id: userId, document: 'health_data', version: HEALTH_CONSENT_VERSION },
      { user_id: userId, document: 'age_attestation', version: TERMS_VERSION },
    ])
  }

  const PENDING_INVITE_KEY = 'bumpling_pending_invite_code'

  // Handles both a code typed this submit and one stashed earlier (see the
  // confirmation-pending branch below) — only surfaces an error for a code
  // the user just typed; a stashed one could legitimately be expired/used.
  // Returns whether a redemption actually succeeded, so the caller can
  // navigate straight to the partner view rather than racing the root
  // layout's own auth-state-driven redirect (which can run before this
  // pregnancy_members insert lands, and won't automatically re-check once
  // it's already sent someone to the wrong screen).
  async function redeemCodeIfPresent(): Promise<boolean> {
    const typed = inviteCode.trim()
    const code = typed || (await AsyncStorage.getItem(PENDING_INVITE_KEY)) || ''
    if (!code) return false
    const result = await redeemInvite(code)
    await AsyncStorage.removeItem(PENDING_INVITE_KEY)
    if (result.ok) {
      setInviteCode('')
      return true
    }
    if (typed) Alert.alert(t('error'), t('inviteCodeInvalid'))
    return false
  }

  function goToPartnerHome() {
    if (Platform.OS === 'web') window.alert(t('inviteJoined'))
    else Alert.alert(t('inviteJoinedTitle'), t('inviteJoined'))
    router.replace('/partner-home')
  }

  async function submit() {
    if (!canSignUp) return
    setLoading(true)
    // Set before the auth call itself — the root layout's own redirect
    // effect can fire the instant a session appears (via onAuthStateChange),
    // which races this function's own await chain. While this flag is set,
    // that effect skips itself entirely instead of possibly routing to the
    // LMP screen a beat before this function's own navigation corrects it.
    const hasInviteIntent = !!(inviteCode.trim() || (await AsyncStorage.getItem(PENDING_INVITE_KEY)))
    if (hasInviteIntent) await AsyncStorage.setItem(PARTNER_REDEEM_FLAG, 'true')
    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { Alert.alert(error.message); setLoading(false); return }
        if (data.user) await writeConsentIfMissing(data.user.id)
        const joined = await redeemCodeIfPresent()
        setLoading(false)
        if (joined) goToPartnerHome()
        return
      }
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username: username.trim() } } })
      if (error) {
        Alert.alert(error.message)
        setLoading(false)
        return
      }
      if (data.user && data.session) {
        await writeConsentIfMissing(data.user.id)
        const joined = await redeemCodeIfPresent()
        setLoading(false)
        if (joined) goToPartnerHome()
        return
      }
      // No immediate session (email confirmation pending) — stash the code
      // so it can be redeemed on the first real sign-in, once a session exists.
      if (inviteCode.trim()) await AsyncStorage.setItem(PENDING_INVITE_KEY, inviteCode.trim())
      setConfirmationPending(true)
      setLoading(false)
    } finally {
      if (hasInviteIntent) await AsyncStorage.removeItem(PARTNER_REDEEM_FLAG)
    }
  }

  async function devSkip() {
    await AsyncStorage.setItem(DEV_BYPASS_KEY, 'true')
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.blobTopLeft, isRTL && styles.blobTopLeftRTL]} />
      <View style={[styles.blobBottomLeft, isRTL && styles.blobBottomLeftRTL]} />
      <View style={[styles.blobBottomRight, isRTL && styles.blobBottomRightRTL]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.logoArea}>
            <View style={styles.mascotWrap}>
              <BabyMark size={130} />
              <View style={[styles.heartAccent, isRTL && styles.heartAccentRTL]}>
                <Ionicons name="heart" size={22} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.logoText}>BUMPLING</Text>
            <Text style={styles.logoSub}>
              {mode === 'signin' ? t('welcomeBack') : t('createAccount')}
            </Text>
          </View>

          {confirmationPending && (
            <View style={styles.form}>
              <View style={styles.confirmationBox}>
                <Ionicons name="mail-outline" size={32} color={colors.primary} />
                <Text style={styles.confirmationTitle}>{t('checkEmailTitle')}</Text>
                <Text style={styles.confirmationBody}>{t('checkEmailBody', { email })}</Text>
              </View>
              <TouchableOpacity style={styles.switchMode} onPress={() => { setConfirmationPending(false); setMode('signin') }}>
                <Text style={styles.switchModeText}>
                  <Text style={styles.switchModeLink}>{t('backToSignIn')}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!confirmationPending && (
          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('username')}</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.usernamePrefix}>@</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={v => setUsername(v.replace(/^@+/, ''))}
                    placeholder={t('usernamePlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                  />
                </View>
                {usernameStatus === 'checking' && <Text style={styles.usernameHint}>{t('usernameChecking')}</Text>}
                {usernameStatus === 'available' && <Text style={[styles.usernameHint, styles.usernameOk]}>{t('usernameAvailable')}</Text>}
                {usernameStatus === 'taken' && <Text style={[styles.usernameHint, styles.usernameBad]}>{t('usernameTaken')}</Text>}
                {usernameStatus === 'invalid' && <Text style={[styles.usernameHint, styles.usernameBad]}>{t('usernameInvalid')}</Text>}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('email')}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('emailPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('password')}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('passwordPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('inviteCodeLabel')}</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={inviteCode}
                    onChangeText={v => setInviteCode(v.toUpperCase())}
                    placeholder={t('inviteCodePlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="characters"
                  />
                </View>
                <Text style={styles.usernameHint}>{t('inviteCodeHint')}</Text>
              </View>
            )}

            {mode === 'signup' && (
              <View style={styles.consentGroup}>
                <Checkbox checked={agreedTerms} onPress={() => setAgreedTerms(v => !v)}>
                  {t('consent.termsPrefix')}
                  <Text style={styles.consentLink} onPress={() => router.push('/terms-of-service')}>{t('consent.termsLink')}</Text>
                  {t('consent.termsAnd')}
                  <Text style={styles.consentLink} onPress={() => router.push('/privacy-policy')}>{t('consent.privacyLink')}</Text>
                </Checkbox>
                <Checkbox checked={agreedHealthData} onPress={() => setAgreedHealthData(v => !v)}>
                  {t('consent.healthData')}
                </Checkbox>
                <Checkbox checked={agreedAge} onPress={() => setAgreedAge(v => !v)}>
                  {t('consent.ageAttestation')}
                </Checkbox>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.primaryBtn, (loading || !canSignUp) && styles.primaryBtnDisabled]}
              onPress={submit}
              disabled={loading || !canSignUp}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>{mode === 'signin' ? t('signIn') : t('signUp')}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchMode} onPress={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}>
              <Text style={styles.switchModeText}>
                {mode === 'signin' ? t('noAccount') : t('haveAccount')}
                <Text style={styles.switchModeLink}>
                  {mode === 'signin' ? t('signUp') : t('signIn')}
                </Text>
              </Text>
            </TouchableOpacity>

            {mode === 'signin' && (
              <TouchableOpacity style={styles.switchMode} onPress={() => setMode('signup')}>
                <Text style={styles.switchModeText}>
                  <Text style={styles.switchModeLink}>{t('haveInviteCode')}</Text>
                </Text>
              </TouchableOpacity>
            )}

            {/* TODO: Sign in with Apple / Google — see BACKEND.md Section 13. Needs an Apple Developer account first; Apple is then required alongside Google per App Store Guideline 4.8. */}
          </View>
          )}

          {allowDevBypass && (
            <TouchableOpacity style={styles.devSkip} onPress={devSkip}>
              <Text style={styles.devSkipText}>{t('devSkip')}</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const BLOB = 240

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, position: 'relative', overflow: 'hidden' },
  confirmationBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  usernamePrefix: { fontSize: 16, color: colors.textSecondary },
  usernameHint: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  usernameOk: { color: colors.sageDeep },
  usernameBad: { color: colors.urgent },
  confirmationTitle: { fontFamily: fonts.headlineBold, fontSize: 20, color: colors.textPrimary, textAlign: 'center' },
  confirmationBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.sm },
  scroll:    { flexGrow: 1, paddingHorizontal: spacing.md, justifyContent: 'center', paddingVertical: spacing.lg },

  blobTopLeft:     { position: 'absolute', top: -BLOB * 0.55, left: -BLOB * 0.55, width: BLOB, height: BLOB, borderRadius: BLOB / 2, backgroundColor: colors.peach },
  blobTopLeftRTL:  { left: undefined, right: -BLOB * 0.55 },
  blobBottomLeft:  { position: 'absolute', bottom: -BLOB * 0.5, left: -BLOB * 0.5, width: BLOB * 0.75, height: BLOB * 0.75, borderRadius: BLOB * 0.375, backgroundColor: colors.peach },
  blobBottomLeftRTL: { left: undefined, right: -BLOB * 0.5 },
  blobBottomRight: { position: 'absolute', bottom: -BLOB * 0.55, right: -BLOB * 0.55, width: BLOB, height: BLOB, borderRadius: BLOB / 2, backgroundColor: colors.peach },
  blobBottomRightRTL: { right: undefined, left: -BLOB * 0.55 },

  logoArea:    { alignItems: 'center', marginBottom: spacing.lg },
  mascotWrap:  { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  heartAccent: { position: 'absolute', top: 4, right: -6 },
  heartAccentRTL: { right: undefined, left: -6 },
  logoText:    { fontFamily: fonts.headlineBold, fontSize: 38, color: colors.primary, letterSpacing: 1 },
  logoSub:     { fontFamily: fonts.headline, fontSize: 18, color: colors.textSecondary, marginTop: 4 },

  form:       { gap: spacing.md },
  inputGroup: { gap: 6 },
  label:      { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  inputRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.xl, paddingHorizontal: 16, paddingVertical: 14 },
  input:      { flex: 1, fontSize: 15, color: colors.textPrimary, padding: 0 },

  consentGroup: { gap: spacing.xs },
  checkboxRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox:        { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxText:    { flex: 1, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },
  consentLink:     { color: colors.primary, fontWeight: '700' },

  primaryBtn:         { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.xs, shadowColor: colors.textPrimary, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchMode:         { alignItems: 'center', paddingVertical: spacing.xs },
  switchModeText:     { fontSize: 14, color: colors.textSecondary },
  switchModeLink:     { color: colors.primary, fontWeight: '700' },
  devSkip:            { alignItems: 'center', marginTop: spacing.lg },
  devSkipText:        { fontSize: 12, color: colors.textSecondary, textDecorationLine: 'underline' },
})
