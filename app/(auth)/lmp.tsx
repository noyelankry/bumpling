import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { BabyMark } from '../../components/illustrations'
import DateField from '../../components/DateField'
import { addDays, gestationalAge } from '../../lib/pregnancy'
import { saveLMP } from '../../lib/carePlan'
import { useLanguage } from '../../lib/i18n/LanguageProvider'

// Care-plan chart tracks post-term monitoring out to week 41; 43 gives a bit of slack.
const MAX_WEEKS_BACK = 43

type ErrorKind = 'missing' | 'tooOld' | 'saveFailed'

export default function LmpScreen() {
  const router = useRouter()
  const { t } = useTranslation('lmp')
  const { isRTL } = useLanguage()
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
    setError(null)
    saveLMP(date)
      .then(() => router.replace('/(auth)/catch-up'))
      .catch(err => { console.error('saveLMP failed:', err); setError('saveFailed') })
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
              <BabyMark size={110} />
              <View style={[styles.heartAccent, isRTL && styles.heartAccentRTL]}>
                <Ionicons name="heart" size={18} color={colors.primary} />
              </View>
            </View>
          </View>

          <Text style={styles.title}>{t('title')}</Text>
          <Text style={styles.subtitle}>{t('subtitle')}</Text>

          <DateField
            value={date}
            onChange={handleChange}
            placeholder={t('datePlaceholder')}
            maximumDate={today}
            minimumDate={earliestLmp}
          />
          {error === 'missing' && (
            <Text style={styles.errorText}>{t('errorMissing')}</Text>
          )}
          {error === 'tooOld' && (
            <Text style={styles.errorText}>{t('errorTooOld', { weeks: MAX_WEEKS_BACK })}</Text>
          )}
          {error === 'saveFailed' && (
            <Text style={styles.errorText}>{t('errorSaveFailed')}</Text>
          )}

          {preview && (
            <View style={styles.previewCard}>
              <Ionicons name="calendar-outline" size={16} color={colors.sageDeep} />
              <Text style={styles.previewText}>{t('weekPreview', { weeks: preview.weeks, days: preview.days })}</Text>
            </View>
          )}

          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.disclaimerText}>{t('disclaimer')}</Text>
          </View>

          <TouchableOpacity style={styles.continueBtn} onPress={continueOn} activeOpacity={0.85}>
            <Text style={styles.continueBtnText}>{t('continue')}</Text>
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
  blobTopLeftRTL:  { left: undefined, right: -BLOB * 0.55 },
  blobBottomLeft:  { position: 'absolute', bottom: -BLOB * 0.5, left: -BLOB * 0.5, width: BLOB * 0.75, height: BLOB * 0.75, borderRadius: BLOB * 0.375, backgroundColor: colors.peach },
  blobBottomLeftRTL: { left: undefined, right: -BLOB * 0.5 },
  blobBottomRight: { position: 'absolute', bottom: -BLOB * 0.55, right: -BLOB * 0.55, width: BLOB, height: BLOB, borderRadius: BLOB / 2, backgroundColor: colors.peach },
  blobBottomRightRTL: { right: undefined, left: -BLOB * 0.55 },

  logoArea:    { alignItems: 'center', marginBottom: spacing.md },
  mascotWrap:  { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  heartAccent: { position: 'absolute', top: 2, right: -4 },
  heartAccentRTL: { right: undefined, left: -4 },

  title:    { fontFamily: fonts.headlineBold, fontSize: 26, color: colors.textPrimary, textAlign: 'center', lineHeight: 32 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 20 },

  errorText: { fontSize: 12.5, color: colors.urgent, marginTop: 6, textAlign: 'center' },

  previewCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.sage, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.md },
  previewText: { fontSize: 13.5, fontWeight: '600', color: colors.textPrimary },

  disclaimer:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: spacing.md },
  disclaimerText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  continueBtn:     { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg, shadowColor: colors.textPrimary, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
