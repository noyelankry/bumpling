import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../../lib/theme'
import { BabyMark } from '../../components/illustrations'
import { parseDate, gestationalAge } from '../../lib/pregnancy'
import { saveLMP } from '../../lib/carePlan'

export default function LmpScreen() {
  const router = useRouter()
  const [dateText, setDateText] = useState('')
  const [error, setError] = useState(false)

  const today = new Date()
  const parsed = parseDate(dateText.trim())
  const valid = !!parsed && parsed.getTime() <= today.getTime()
  const preview = valid ? gestationalAge(parsed!, today) : null

  function continueOn() {
    if (!valid || !parsed) { setError(true); return }
    saveLMP(parsed).then(() => router.replace('/(tabs)'))
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
        <View style={styles.inner}>

          <View style={styles.logoArea}>
            <BabyMark size={44} />
          </View>

          <Text style={styles.title}>When did your last period start?</Text>
          <Text style={styles.subtitle}>
            We use the first day of your last period to estimate your due date and suggest the right test windows for you.
          </Text>

          <TextInput
            style={[styles.input, error && !valid && styles.inputError]}
            value={dateText}
            onChangeText={t => { setDateText(t); setError(false) }}
            placeholder="e.g. Jun 7, 2026"
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />
          {error && !valid && (
            <Text style={styles.errorText}>Enter a valid past date, like "Jun 7, 2026".</Text>
          )}

          {preview && (
            <View style={styles.previewCard}>
              <Ionicons name="calendar-outline" size={16} color={colors.sageDeep} />
              <Text style={styles.previewText}>That puts you at about Week {preview.weeks} + {preview.days} today.</Text>
            </View>
          )}

          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.disclaimerText}>
              This is a general estimate to help you plan ahead — always confirm dates and test timing with your doctor.
            </Text>
          </View>

          <TouchableOpacity style={styles.continueBtn} onPress={continueOn} activeOpacity={0.85}>
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner:     { paddingHorizontal: spacing.md },

  logoArea: { alignItems: 'center', marginBottom: spacing.lg },

  title:    { fontSize: 24, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', lineHeight: 30 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 20 },

  input:      { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.textPrimary, textAlign: 'center' },
  inputError: { borderColor: colors.urgent },
  errorText:  { fontSize: 12.5, color: colors.urgent, marginTop: 6, textAlign: 'center' },

  previewCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.sage, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.md },
  previewText: { fontSize: 13.5, fontWeight: '600', color: colors.textPrimary },

  disclaimer:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: spacing.md },
  disclaimerText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  continueBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.lg },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
