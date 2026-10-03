import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { BabyMark, FetusIllustration } from '../../components/illustrations'
import { formatDateRange, formatWeekday, computeCareItems } from '../../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, markBookedDone, getItemTitle, type CareItemWithCustom } from '../../lib/carePlan'
import { useDirectionalIcon } from '../../lib/i18n/useDirectionalIcon'
import { useLanguage } from '../../lib/i18n/LanguageProvider'

export default function BookedScreen() {
  const router = useRouter()
  const { t } = useTranslation('booked')
  const { isRTL } = useLanguage()
  const { arrowForward } = useDirectionalIcon()
  const [items, setItems] = useState<CareItemWithCustom[]>(DEFAULT_CARE_ITEMS)
  const [lmp, setLmp] = useState<Date | null>(null)

  useFocusEffect(useCallback(() => {
    loadCareItems().then(setItems)
    loadLMP().then(setLmp)
  }, []))

  const remaining = useMemo(() => {
    if (!lmp) return []
    return computeCareItems(items, lmp, TODAY)
      .filter(i => i.status !== 'done')
      .sort((a, b) => {
        const da = a.status === 'scheduled' && a.scheduledAt ? a.scheduledAt : a.windowStart
        const db = b.status === 'scheduled' && b.scheduledAt ? b.scheduledAt : b.windowStart
        return da.getTime() - db.getTime()
      })
  }, [items, lmp])

  const bookedCount = remaining.filter(i => i.status === 'scheduled').length

  async function continueOn() {
    await markBookedDone()
    router.replace('/(tabs)')
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
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.sageDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{t('heroCount', { booked: bookedCount, total: remaining.length })}</Text>
            <Text style={styles.heroSub}>{t('heroSub')}</Text>
          </View>
          <View style={[styles.heroIllustration, isRTL && styles.heroIllustrationRTL]} pointerEvents="none">
            <FetusIllustration size={100} />
          </View>
        </View>

        <View style={styles.listCard}>
          {remaining.map((item, i) => {
            const isBooked = item.status === 'scheduled' && item.scheduledAt
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.row, i > 0 && styles.rowDivider, isBooked && styles.rowChecked]}
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/add-item',
                  params: isBooked
                    ? {
                        id: item.id,
                        title: getItemTitle(item),
                        date: item.scheduledAt!.toISOString(),
                        time: item.scheduledTimeLabel ?? '',
                        location: item.location ?? '',
                        prepNote: item.prepNote ?? '',
                        windowStart: item.windowStart.toISOString(),
                        windowEnd: item.windowEnd.toISOString(),
                      }
                    : { id: item.id, title: getItemTitle(item), windowStart: item.windowStart.toISOString(), windowEnd: item.windowEnd.toISOString() },
                })}
              >
                <View style={[styles.checkbox, isBooked && styles.checkboxChecked]}>
                  {isBooked && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{getItemTitle(item)}</Text>
                  {isBooked ? (
                    <Text style={styles.rowMetaBooked}>
                      {t('bookedWeekday', { weekday: formatWeekday(item.scheduledAt!) })}{item.scheduledTimeLabel ? ` · ${item.scheduledTimeLabel}` : ''}
                      {item.location ? ` · ${item.location}` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.rowMeta}>{t('targetDates', { range: formatDateRange(item.windowStart, item.windowEnd) })}</Text>
                  )}
                </View>
                <Text style={styles.rowAction}>{isBooked ? t('edit') : t('addDate')}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity style={styles.continueBtn} onPress={continueOn}>
          <Text style={styles.continueBtnText}>{bookedCount > 0 ? t('continueWithCount', { count: bookedCount }) : t('continue')}</Text>
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

  listCard:     { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, overflow: 'hidden' },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.sm },
  rowDivider:   { borderTopWidth: 1, borderTopColor: colors.border },
  rowChecked:   { backgroundColor: colors.peach },
  checkbox:        { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
  rowMeta:  { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowMetaBooked: { fontSize: 12, color: colors.sageDeep, fontWeight: '600', marginTop: 2 },
  rowAction: { fontSize: 12.5, fontWeight: '700', color: colors.primary },

  continueBtn:     { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
