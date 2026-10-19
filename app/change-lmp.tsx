import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../lib/theme'
import DateField from '../components/DateField'
import { addDays, gestationalAge } from '../lib/pregnancy'
import { loadLMP, saveLMP } from '../lib/carePlan'
import { goBack } from '../lib/navigation'
import { useDirectionalIcon } from '../lib/i18n/useDirectionalIcon'

const MAX_WEEKS_BACK = 43

export default function ChangeLmpScreen() {
  const router = useRouter()
  const { t } = useTranslation('changeLmp')
  const { back: backIcon } = useDirectionalIcon()
  const back = () => goBack(router, '/profile')
  const [date, setDate] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)

  const today = new Date()
  const earliestLmp = addDays(today, -MAX_WEEKS_BACK * 7)
  const preview = date ? gestationalAge(date, today) : null

  useEffect(() => { loadLMP().then(setDate) }, [])

  async function submit() {
    if (!date) return
    setSaving(true)
    try {
      await saveLMP(date)
      if (Platform.OS === 'web') {
        window.alert(t('successMessage'))
      } else {
        Alert.alert(t('successTitle'), t('successMessage'))
      }
      back()
    } catch (err) {
      console.error('saveLMP failed:', err)
      Alert.alert(t('error'), t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={back} hitSlop={8}>
          <Ionicons name={backIcon} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.pageTitle}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <DateField
          value={date}
          onChange={setDate}
          placeholder={t('datePlaceholder')}
          maximumDate={today}
          minimumDate={earliestLmp}
        />

        {preview && (
          <View style={styles.previewCard}>
            <Ionicons name="calendar-outline" size={16} color={colors.sageDeep} />
            <Text style={styles.previewText}>{t('weekPreview', { weeks: preview.weeks, days: preview.days })}</Text>
          </View>
        )}

        <View style={styles.warning}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.warningText}>{t('warning')}</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, (!date || saving) && styles.primaryBtnDisabled]}
          onPress={submit}
          disabled={!date || saving}
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

  previewCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.sage, borderRadius: radius.md, padding: spacing.sm },
  previewText: { fontSize: 13.5, fontWeight: '600', color: colors.textPrimary },

  warning:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  warningText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  primaryBtn:         { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.xs },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
})
