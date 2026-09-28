import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { BabyMark } from '../../components/illustrations'
import DateField from '../../components/DateField'
import { addDays, gestationalAge } from '../../lib/pregnancy'
import { saveLMP } from '../../lib/carePlan'

// Care-plan chart tracks post-term monitoring out to week 41; 43 gives a bit of slack.
const MAX_WEEKS_BACK = 43

type ErrorKind = 'missing' | 'tooOld'

export default function LmpScreen() {
  const router = useRouter()
  const [date, setDate] = useState<Date | null>(null)
  const [error, setError] = useState<ErrorKind | null>(null)

  const today = new Date()
  const earliestLmp = addDays(today, -MAX_WEEKS_BACK * 7)
  const preview = date ? gestationalAge(date, today) : null

  function handleChange(d: Date) {
    setDate(d)
    setError(d < earliestLmp ? 'tooOld' : null)
  }

  function continueOn() {
    if (!date) { setError('missing'); return }
    if (date < earliestLmp) { setError('tooOld'); return }
    saveLMP(date).then(() => router.replace('/(auth)/catch-up'))
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomLeft} />
      <View style={styles.blobBottomRight} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.logoArea}>
            <View style={styles.mascotWrap}>
              <BabyMark size={110} />
              <View style={styles.heartAccent}>
                <Ionicons name="heart" size={18} color={colors.primary} />
              </View>
            </View>
          </View>

          <Text style={styles.title}>When did your last period start?</Text>
          <Text style={styles.subtitle}>
            We use the first day of your last period to estimate your due date and suggest the right test windows for you.
          </Text>

          <DateField
            value={date}
            onChange={handleChange}
            placeholder="Select a date"
            maximumDate={today}
            minimumDate={earliestLmp}
          />
          {error === 'missing' && (
            <Text style={styles.errorText}>Pick the date your last period started.</Text>
          )}
          {error === 'tooOld' && (
            <Text style={styles.errorText}>That's more than {MAX_WEEKS_BACK} weeks ago — outside a typical pregnancy. Double-check the date.</Text>
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
  blobBottomLeft:  { position: 'absolute', bottom: -BLOB * 0.5, left: -BLOB * 0.5, width: BLOB * 0.75, height: BLOB * 0.75, borderRadius: BLOB * 0.375, backgroundColor: colors.peach },
  blobBottomRight: { position: 'absolute', bottom: -BLOB * 0.55, right: -BLOB * 0.55, width: BLOB, height: BLOB, borderRadius: BLOB / 2, backgroundColor: colors.peach },

  logoArea:    { alignItems: 'center', marginBottom: spacing.md },
  mascotWrap:  { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  heartAccent: { position: 'absolute', top: 2, right: -4 },

  title:    { fontFamily: fonts.headline, fontSize: 26, color: colors.textPrimary, textAlign: 'center', lineHeight: 32 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 20 },

  errorText: { fontSize: 12.5, color: colors.urgent, marginTop: 6, textAlign: 'center' },

  previewCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.sage, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.md },
  previewText: { fontSize: 13.5, fontWeight: '600', color: colors.textPrimary },

  disclaimer:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: spacing.md },
  disclaimerText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  continueBtn:     { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg, shadowColor: colors.textPrimary, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
