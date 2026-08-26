import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../../lib/theme'
import { BabyMark } from '../../components/illustrations'
import DateField from '../../components/DateField'
import { gestationalAge } from '../../lib/pregnancy'
import { saveLMP } from '../../lib/carePlan'

export default function LmpScreen() {
  const router = useRouter()
  const [date, setDate] = useState<Date | null>(null)
  const [error, setError] = useState(false)

  const today = new Date()
  const preview = date ? gestationalAge(date, today) : null

  function continueOn() {
    if (!date) { setError(true); return }
    saveLMP(date).then(() => router.replace('/(tabs)'))
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

          <DateField
            value={date}
            onChange={d => { setDate(d); setError(false) }}
            placeholder="Select a date"
            maximumDate={today}
          />
          {error && (
            <Text style={styles.errorText}>Pick the date your last period started.</Text>
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

  errorText: { fontSize: 12.5, color: colors.urgent, marginTop: 6, textAlign: 'center' },

  previewCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.sage, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.md },
  previewText: { fontSize: 13.5, fontWeight: '600', color: colors.textPrimary },

  disclaimer:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: spacing.md },
  disclaimerText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  continueBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.lg },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
