import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { ItemIcon } from '../components/ItemIcon'
import { formatDate, formatWeekday } from '../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, computeCareItems, getItemTitle, type CareItemWithCustom } from '../lib/carePlan'
import { goBack } from '../lib/navigation'
import { useDirectionalIcon } from '../lib/i18n/useDirectionalIcon'

const TRIMESTER_META = [
  { chipBg: colors.peach, iconColor: colors.primaryDark },
  { chipBg: colors.sage, iconColor: colors.sageDeep },
  { chipBg: colors.lavender, iconColor: colors.lavenderDeep },
] as const

function metaFor(windowStartWeek: number) {
  const trimester = windowStartWeek < 14 ? 0 : windowStartWeek < 28 ? 1 : 2
  return TRIMESTER_META[trimester]
}

export default function AppointmentsScreen() {
  const router = useRouter()
  const { t } = useTranslation('appointments')
  const { t: tCommon } = useTranslation('common')
  const { back: backIcon, forward } = useDirectionalIcon()
  const back = () => goBack(router, '/(tabs)/plan')
  const [items, setItems] = useState<CareItemWithCustom[]>(DEFAULT_CARE_ITEMS)
  const [lmp, setLmp] = useState<Date>(TODAY)
  // Avoids flashing DEFAULT_CARE_ITEMS's generic unscheduled state before
  // the real, possibly-scheduled data loads.
  const [loaded, setLoaded] = useState(false)

  useFocusEffect(useCallback(() => {
    Promise.all([loadCareItems(), loadLMP()]).then(([careItems, lmpDate]) => {
      setItems(careItems)
      setLmp(lmpDate)
      setLoaded(true)
    })
  }, []))

  const computed = useMemo(() => computeCareItems(items, lmp, TODAY), [items, lmp])

  const upcoming = computed
    .filter(i => i.status === 'scheduled' || i.status === 'actionable' || i.status === 'future')
    .sort((a, b) => (a.scheduledAt ?? a.windowStart).getTime() - (b.scheduledAt ?? b.windowStart).getTime())

  // Window closed with nothing booked — kept out of `upcoming` so it can't
  // sort to the top on a stale date; surfaced in its own section instead.
  const needsDecision = computed
    .filter(i => i.status === 'missed')
    .sort((a, b) => a.windowStart.getTime() - b.windowStart.getTime())

  const past = computed
    .filter(i => i.status === 'done' || i.status === 'skipped')
    .sort((a, b) => (b.doneAt ?? b.skippedAt ?? b.windowStart).getTime() - (a.doneAt ?? a.skippedAt ?? a.windowStart).getTime())

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={back} hitSlop={8} accessibilityLabel={tCommon('back')}>
          <Ionicons name={backIcon} size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('title')}</Text>
        <TouchableOpacity onPress={() => router.push('/add-item')} hitSlop={8} accessibilityLabel={t('addLabel')}>
          <Ionicons name="add" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {!loaded ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
        <>
        {upcoming.length === 0 && needsDecision.length === 0 && past.length === 0 && (
          <Text style={styles.emptyText}>{t('nothingYet')}</Text>
        )}

        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('upcoming')}</Text>
            <View style={styles.listCard}>
              {upcoming.map((item, i) => {
                const meta = metaFor(item.windowStartWeek)
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.row, i > 0 && styles.rowDivider]}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/appointment/${item.id}`)}
                  >
                    <View style={[styles.iconChip, { backgroundColor: meta.chipBg }]}>
                      <ItemIcon id={item.id} size={18} color={meta.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{getItemTitle(item)}</Text>
                      <Text style={styles.rowMeta}>
                        {item.status === 'scheduled' && item.scheduledAt ? formatWeekday(item.scheduledAt) : t('weekLabel', { weeks: Math.round(item.windowStartWeek) })}
                      </Text>
                    </View>
                    <Ionicons name={forward} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

        {needsDecision.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('needsDecision')}</Text>
            <View style={styles.listCard}>
              {needsDecision.map((item, i) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.row, i > 0 && styles.rowDivider]}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/appointment/${item.id}`)}
                >
                  <View style={[styles.iconChip, { backgroundColor: colors.neutralChip }]}>
                    <ItemIcon id={item.id} size={18} color={colors.neutralChipDeep} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{getItemTitle(item)}</Text>
                    <Text style={styles.rowMeta}>{t('windowPassed')}</Text>
                  </View>
                  <Ionicons name={forward} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {past.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('past')}</Text>
            <View style={styles.listCard}>
              {past.map((item, i) => {
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.row, i > 0 && styles.rowDivider]}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/appointment/${item.id}`)}
                  >
                    <View style={[styles.iconChip, { backgroundColor: colors.neutralChip }]}>
                      <ItemIcon id={item.id} size={18} color={colors.neutralChipDeep} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{getItemTitle(item)}</Text>
                      <Text style={styles.rowMeta}>
                        {item.status === 'skipped'
                          ? (item.skippedAt ? t('skippedOn', { date: formatDate(item.skippedAt) }) : t('skipped'))
                          : (item.doneAt ? t('doneOn', { date: formatDate(item.doneAt) }) : t('done'))}
                      </Text>
                    </View>
                    <Ionicons name={forward} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}
        </>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary },

  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 56 },
  emptyText: { fontSize: 13.5, color: colors.textSecondary, marginTop: spacing.md },
  loadingState: { paddingVertical: spacing.lg * 2, alignItems: 'center' },

  sectionLabel: { fontFamily: fonts.headline, fontSize: 16, color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.sm },

  listCard: { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  row:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  iconChip:   { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle:   { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary },
  rowMeta:    { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
})
