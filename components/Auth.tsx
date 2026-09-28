import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { DEV_BYPASS_KEY } from '../lib/devBypass'
import { BabyMark } from './illustrations'

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit() {
    setLoading(true)
    const fn = mode === 'signin'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error } = await fn
    if (error) Alert.alert(error.message)
    setLoading(false)
  }

  async function devSkip() {
    await AsyncStorage.setItem(DEV_BYPASS_KEY, 'true')
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>

        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <BabyMark size={36} />
          </View>
          <Text style={styles.logoText}>BUMPLING</Text>
          <Text style={styles.logoSub}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@address.com"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>{mode === 'signin' ? 'Sign in' : 'Sign up'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchMode} onPress={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}>
            <Text style={styles.switchModeText}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.switchModeLink}>
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {__DEV__ && (
          <TouchableOpacity style={styles.devSkip} onPress={devSkip}>
            <Text style={styles.devSkipText}>Skip sign-in (dev only)</Text>
          </TouchableOpacity>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.background },
  inner:              { flex: 1, paddingHorizontal: spacing.md, justifyContent: 'center' },
  logoArea:           { alignItems: 'center', marginBottom: spacing.lg * 1.5 },
  logoIcon:           { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  logoText:           { fontFamily: fonts.headline, fontSize: 28, color: colors.primary, letterSpacing: 2 },
  logoSub:            { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  form:               { gap: spacing.md },
  inputGroup:         { gap: 6 },
  label:              { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  input:              { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: colors.textPrimary },
  passwordRow:        { position: 'relative' },
  passwordInput:      { paddingRight: 48 },
  eyeBtn:             { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  primaryBtn:         { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', marginTop: spacing.xs },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchMode:         { alignItems: 'center', paddingVertical: spacing.xs },
  switchModeText:     { fontSize: 14, color: colors.textSecondary },
  switchModeLink:     { color: colors.primary, fontWeight: '700' },
  devSkip:            { alignItems: 'center', marginTop: spacing.lg },
  devSkipText:        { fontSize: 12, color: colors.textSecondary, textDecorationLine: 'underline' },
})
