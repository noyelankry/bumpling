import { useState } from 'react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedHealthData, setAgreedHealthData] = useState(false)
  const [agreedAge, setAgreedAge] = useState(false)

  const canSignUp = mode === 'signin' || (agreedTerms && agreedHealthData && agreedAge)

  async function submit() {
    if (!canSignUp) return
    setLoading(true)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) Alert.alert(error.message)
      setLoading(false)
      return
    }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      Alert.alert(error.message)
      setLoading(false)
      return
    }
    if (data.user && data.session) {
      await supabase.from('consent_logs').insert([
        { user_id: data.user.id, document: 'terms', version: TERMS_VERSION },
        { user_id: data.user.id, document: 'privacy', version: PRIVACY_VERSION },
        { user_id: data.user.id, document: 'health_data', version: HEALTH_CONSENT_VERSION },
        { user_id: data.user.id, document: 'age_attestation', version: TERMS_VERSION },
      ])
    }
    setLoading(false)
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

          <View style={styles.form}>
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
          </View>

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
