import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { goBack } from '../lib/navigation'
import { showAlert } from '../lib/alert'
import { useDirectionalIcon } from '../lib/i18n/useDirectionalIcon'
import { useLanguage } from '../lib/i18n/LanguageProvider'

const MIN_LENGTH = 8

export default function ChangePasswordScreen() {
  const router = useRouter()
  const { t } = useTranslation('changePassword')
  const { t: tCommon } = useTranslation('common')
  const { back: backIcon } = useDirectionalIcon()
  const { isRTL } = useLanguage()
  const back = () => goBack(router, '/profile')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  const tooShort = password.length > 0 && password.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = password.length >= MIN_LENGTH && password === confirm

  async function submit() {
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      showAlert(t('error'), error.message)
      return
    }
    showAlert(t('successTitle'), t('successMessage'))
    back()
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={back} hitSlop={8} accessibilityLabel={tCommon('back')}>
          <Ionicons name={backIcon} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.pageTitle}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('newPassword')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              value={password}
              onChangeText={setPassword}
              placeholder={t('newPasswordPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {tooShort && <Text style={styles.fieldError}>{t('tooShort', { count: MIN_LENGTH })}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('confirmPassword')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              value={confirm}
              onChangeText={setConfirm}
              placeholder={t('confirmPasswordPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>
          {mismatch && <Text style={styles.fieldError}>{t('mismatch')}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, (!canSubmit || saving) && styles.primaryBtnDisabled]}
          onPress={submit}
          disabled={!canSubmit || saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{t('submit')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs, paddingTop: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  titleBlock: { paddingHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.md },
  pageTitle:  { fontFamily: fonts.headlineBold, fontSize: 26, color: colors.textPrimary, lineHeight: 31 },
  subtitle:   { fontSize: 13.5, color: colors.textSecondary, marginTop: 4, lineHeight: 19 },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56, gap: spacing.md },

  inputGroup: { gap: 6 },
  label:      { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  inputRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.xl, paddingHorizontal: 16, paddingVertical: 14 },
  input:      { flex: 1, fontSize: 15, color: colors.textPrimary, padding: 0, textAlign: 'left' },
  inputRTL:   { textAlign: 'right' },
  fieldError: { fontSize: 12, color: colors.urgent },

  primaryBtn:         { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.xs },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
})
