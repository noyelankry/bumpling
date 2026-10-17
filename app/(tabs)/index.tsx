import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { BabyMark, FetusIllustration } from '../../components/illustrations'
import { gestationalAge, formatDate } from '../../lib/pregnancy'
import { getDateLocale } from '../../lib/i18n/dateLocale'
import { useDirectionalIcon } from '../../lib/i18n/useDirectionalIcon'
import { useLanguage } from '../../lib/i18n/LanguageProvider'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, computeCareItems, getItemTitle, type CareItemWithCustom } from '../../lib/carePlan'
import { useAutoScrollEnabled } from '../../lib/useAutoScrollEnabled'
import { type Entry, loadEntries, formatRelativeTime } from '../../lib/brainDump'

export default function HomeScreen() {
  const { t } = useTranslation('home')
  const { isRTL } = useLanguage()
  const { forward } = useDirectionalIcon()
  const [items, setItems] = useState<CareItemWithCustom[]>(DEFAULT_CARE_ITEMS)
  const [lmp, setLmp] = useState<Date>(TODAY)
  const [brainDumpEntries, setBrainDumpEntries] = useState<Entry[]>([])
  const router = useRouter()
  const autoScroll = useAutoScrollEnabled()
  const age = gestationalAge(lmp, TODAY)

  useFocusEffect(useCallback(() => {
    loadCareItems().then(setItems)
    loadLMP().then(setLmp)
    loadEntries().then(setBrainDumpEntries)
  }, []))

  const computed = computeCareItems(items, lmp, TODAY)
  const nextItem = computed
    .filter(i => i.status !== 'scheduled' && i.status !== 'done')
    .sort((a, b) => a.bookBy.getTime() - b.bookBy.getTime())[0]

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={autoScroll.scrollEnabled}
        onLayout={autoScroll.onLayout}
        onContentSizeChange={autoScroll.onContentSizeChange}
      >

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BabyMark size={34} />
            <Text style={styles.appName}>Bumpling</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')} accessibilityLabel={t('profileLabel')}>
              <Ionicons name="person-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
              <View style={[styles.bellDot, isRTL && styles.bellDotRTL]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weekRow}>
          <View style={styles.weekTextCol}>
            <Text style={styles.eyebrow}>{t('pregnant')}</Text>
            <Text style={styles.heroNumber}>{age.weeks}</Text>
            <Text style={styles.heroWeeksLabel}>{t('week', { count: age.weeks })}</Text>
            <View style={[styles.heroDaysLine, isRTL && styles.heroDaysLineRTL]}>
              <Text>
                <Text style={styles.heroDaysAccent}>+{age.days}</Text>
                <Text style={styles.heroDaysText}> {t('day', { count: age.days })}</Text>
              </Text>
            </View>
          </View>
          <FetusIllustration size={190} />
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="sparkles-outline" size={16} color={colors.lavenderDeep} style={{ marginTop: 2 }} />
          <Text style={styles.tipText}>
            <Text style={styles.tipTextBold}>{t('weeklyTipLabel')}</Text>
            {t('weeklyTip')}
          </Text>
        </View>

        {nextItem && (
          <TouchableOpacity
            style={styles.nextUpCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/appointment/${nextItem.id}`)}
          >
            <View style={styles.nextUpTopRow}>
              <View style={styles.iconChip}>
                <Ionicons name="calendar-outline" size={20} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>{t('nextUp')}</Text>
                <Text style={styles.nextUpTitle}>{getItemTitle(nextItem)}</Text>
                {nextItem.status === 'actionable' && (
                  <Text style={styles.bookBy}>{t('bookBy', { date: formatDate(nextItem.bookBy) })}</Text>
                )}
              </View>
              <View style={styles.chevronBtn}>
                <Ionicons name={forward} size={18} color={colors.textPrimary} />
              </View>
            </View>

            <View style={styles.nextUpDivider} />

            <View style={styles.nextUpMetaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>
                  {(nextItem.status === 'scheduled' && nextItem.scheduledAt ? nextItem.scheduledAt : nextItem.bookBy)
                    .toLocaleDateString(getDateLocale(), { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>{nextItem.location || t('careProvider')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {brainDumpEntries.length > 0 && (
          <TouchableOpacity
            style={styles.brainDumpCard}
            activeOpacity={0.7}
            onPress={() => router.push('/brain-dump')}
          >
            <View style={styles.iconChipLavender}>
              <Ionicons name="bulb-outline" size={20} color={colors.lavenderDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brainDumpTitle}>{t('thingsOnMind', { count: brainDumpEntries.length })}</Text>
              <Text style={styles.brainDumpSub}>{t('lastAdded', { time: formatRelativeTime(brainDumpEntries[0].createdAt) })}</Text>
            </View>
            <Ionicons name={forward} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.md, paddingTop: 28, paddingBottom: 56 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  appName:     { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  profileBtn:  { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  bellBtn:     { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot:     { position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.background },
  bellDotRTL:  { right: undefined, left: 6 },

  eyebrow:       { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },

  weekRow:       { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.md },
  weekTextCol:   { flex: 1 },

  heroNumber:     { fontFamily: fonts.headlineBold, fontSize: 96, color: colors.textPrimary, lineHeight: 92, marginTop: 4 },
  heroWeeksLabel: { fontFamily: fonts.headline, fontSize: 20, color: colors.textPrimary, marginTop: -10 },
  heroDaysLine:   { marginTop: 4, alignSelf: 'flex-start', marginLeft: 30 },
  heroDaysLineRTL: { marginLeft: 0, marginRight: 30 },
  heroDaysAccent: { fontFamily: fonts.headline, fontSize: 23, color: colors.primaryDark },
  heroDaysText:   { fontFamily: fonts.headline, fontSize: 20, color: colors.primaryDark },


  tipCard: { flexDirection: 'row', gap: 10, backgroundColor: colors.lavender, borderRadius: radius.xl, padding: spacing.sm, marginBottom: spacing.sm, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: 13.5, color: colors.textPrimary, opacity: 0.8, lineHeight: 19 },
  tipTextBold: { fontWeight: '700', opacity: 1 },

  iconChip: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  iconChipLavender: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },

  brainDumpCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  brainDumpTitle: { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary },
  brainDumpSub:   { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  nextUpCard:    { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  nextUpTopRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nextUpTitle:   { fontFamily: fonts.headline, fontSize: 18, color: colors.textPrimary, marginTop: 3, lineHeight: 22 },
  bookBy:        { fontSize: 12.5, fontWeight: '600', color: colors.urgent, marginTop: 4 },
  chevronBtn:    { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },

  nextUpDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },

  nextUpMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaItem:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaDivider:   { width: 1, height: 12, backgroundColor: colors.border },
  metaText:      { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
})
