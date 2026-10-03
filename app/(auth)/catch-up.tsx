import { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { BabyMark, FetusIllustration } from '../../components/illustrations'
import { formatDateRange, computeCareItems, gestationalAge } from '../../lib/pregnancy'
import { DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, markManyDone, markCatchUpDone, getItemTitle, type CareItemWithCustom } from '../../lib/carePlan'
import { useDirectionalIcon } from '../../lib/i18n/useDirectionalIcon'
import { useLanguage } from '../../lib/i18n/LanguageProvider'

export default function CatchUpScreen() {
  const router = useRouter()
  const { t } = useTranslation('catchUp')
  const { isRTL } = useLanguage()
  const { forward, arrowForward } = useDirectionalIcon()
  const TRIMESTER_LABELS = [t('trimester1'), t('trimester2'), t('trimester3')]
  const trimesterFor = (weeks: number) => TRIMESTER_LABELS[weeks < 14 ? 0 : weeks < 28 ? 1 : 2]
  const [items, setItems] = useState<CareItemWithCustom[]>(DEFAULT_CARE_ITEMS)
  const [lmp, setLmp] = useState<Date | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCareItems().then(setItems)
    loadLMP().then(setLmp)
  }, [])

  const today = new Date()
  const eligible = useMemo(() => {
    if (!lmp) return []
    return computeCareItems(items, lmp, today)
      .filter(i => i.windowStart.getTime() <= today.getTime())
      .sort((a, b) => a.windowStart.getTime() - b.windowStart.getTime())
  }, [items, lmp])

  const trimester = lmp ? trimesterFor(gestationalAge(lmp, today).weeks) : TRIMESTER_LABELS[0]

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function continueOn() {
    setSaving(true)
    if (selected.size > 0) {
      const current = await loadCareItems()
      await markManyDone(current, Array.from(selected))
    }
    await markCatchUpDone()
    router.replace('/(auth)/booked')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View style={styles.backBtn} />
          <View style={styles.headerCenter}>
            <BabyMark size={28} />
            <Text style={styles.appName}>Bumpling</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            <View style={[styles.bellDot, isRTL && styles.bellDotRTL]} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroIconChip}>
            <Ionicons name="calendar-outline" size={20} color={colors.sageDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{trimester}</Text>
            <Text style={styles.heroSub}>{t('thingsToReview', { count: eligible.length })}</Text>
          </View>
          <View style={[styles.heroIllustration, isRTL && styles.heroIllustrationRTL]} pointerEvents="none">
            <FetusIllustration size={100} />
          </View>
        </View>

        {lmp && eligible.length === 0 ? (
          <Text style={styles.emptyText}>{t('nothingYet')}</Text>
        ) : (
          <View style={styles.listCard}>
            {eligible.map((item, i) => {
              const isSelected = selected.has(item.id)
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.row, i > 0 && styles.rowDivider, isSelected && styles.rowChecked]}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{getItemTitle(item)}</Text>
                    <Text style={[styles.rowMeta, isSelected && styles.rowMetaChecked]}>
                      {t('targetDates', { range: formatDateRange(item.windowStart, item.windowEnd) })}
                    </Text>
                  </View>
                  <Ionicons name={forward} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={16} color={colors.textSecondary} />
          <Text style={styles.disclaimerText}>{t('canUpdateAnytime')}</Text>
        </View>

        <TouchableOpacity style={[styles.continueBtn, saving && { opacity: 0.6 }]} onPress={continueOn} disabled={saving}>
          <Text style={styles.continueBtnText}>{selected.size > 0 ? t('saveCompleted') : t('continue')}</Text>
          <Ionicons name={arrowForward} size={18} color="#fff" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.md, paddingTop: 16, paddingBottom: 56 },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appName:      { fontSize: 19, fontWeight: '700', color: colors.textPrimary },
  bellBtn:      { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot:      { position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.background },
  bellDotRTL:   { right: undefined, left: 4 },

  title:    { fontFamily: fonts.headline, fontSize: 28, color: colors.textPrimary, lineHeight: 34 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 20 },

  heroCard:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.sage, borderRadius: radius.xl, padding: spacing.sm, marginBottom: spacing.md, overflow: 'hidden' },
  heroIconChip:  { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  heroTitle:     { fontFamily: fonts.headline, fontSize: 18, color: colors.textPrimary },
  heroSub:       { fontSize: 12.5, color: colors.textPrimary, opacity: 0.65, marginTop: 1 },
  heroIllustration: { position: 'absolute', right: -18, top: -10 },
  heroIllustrationRTL: { right: undefined, left: -18 },

  emptyText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19 },

  listCard:     { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, overflow: 'hidden' },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.sm },
  rowDivider:   { borderTopWidth: 1, borderTopColor: colors.border },
  rowChecked:   { backgroundColor: colors.peach },
  checkbox:        { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
  rowMeta:  { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowMetaChecked: { textDecorationLine: 'line-through' },

  disclaimer:     { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: spacing.md },
  disclaimerText: { flex: 1, fontSize: 12.5, color: colors.textSecondary },

  continueBtn:     { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
