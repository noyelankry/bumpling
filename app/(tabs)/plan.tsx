import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { BabyMark } from '../../components/illustrations'
import { ItemIcon } from '../../components/ItemIcon'
import { formatDate, formatDateRange, formatWeekday, gestationalAge } from '../../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, computeCareItems, getItemTitle, type CareItemWithCustom } from '../../lib/carePlan'
import { useAutoScrollEnabled } from '../../lib/useAutoScrollEnabled'
import { useDirectionalIcon } from '../../lib/i18n/useDirectionalIcon'
import { useLanguage } from '../../lib/i18n/LanguageProvider'

// Grouped by trimester (derived from the item's own window) rather than a
// per-id table, since the real test chart has 18+ items — a fixed table
// wouldn't scale, and trimester grouping is a genuinely useful visual cue.
const TRIMESTER_META = [
  { chipBg: colors.peach, iconColor: colors.primaryDark, trackColor: colors.peachDeep },
  { chipBg: colors.sage, iconColor: colors.sageDeep, trackColor: colors.sageDeep },
  { chipBg: colors.lavender, iconColor: colors.lavenderDeep, trackColor: colors.lavenderDeep },
] as const

function metaFor(windowStartWeek: number) {
  const trimester = windowStartWeek < 14 ? 0 : windowStartWeek < 28 ? 1 : 2
  return TRIMESTER_META[trimester]
}

type JourneyNodeState = 'done' | 'current' | 'upcoming' | 'milestone'
type JourneyNode = {
  key: string
  label: string
  /** Item id, for ItemIcon's lookup — stable regardless of the active language. */
  iconId: string
  weekLabel: string
  weekValue: number
  state: JourneyNodeState
  linkId?: string
}

// Word-boundary-safe shortener for the journey stepper's tight columns —
// RN Web's native numberOfLines ellipsis truncates mid-word there, which
// reads badly for longer care-item titles like a biochemical screening.
function shortLabel(title: string, maxChars = 16): string {
  if (title.length <= maxChars) return title
  const words = title.split(' ')
  let out = ''
  for (const w of words) {
    const next = out ? `${out} ${w}` : w
    if (next.length > maxChars) break
    out = next
  }
  return (out || title.slice(0, maxChars)) + '…'
}

export default function PlanScreen() {
  const router = useRouter()
  const { t } = useTranslation('plan')
  const { isRTL } = useLanguage()
  const { forward } = useDirectionalIcon()
  const autoScroll = useAutoScrollEnabled()
  const [items, setItems] = useState<CareItemWithCustom[]>(DEFAULT_CARE_ITEMS)
  const [lmp, setLmp] = useState<Date>(TODAY)
  const age = useMemo(() => gestationalAge(lmp, TODAY), [lmp])

  useFocusEffect(useCallback(() => {
    loadCareItems().then(setItems)
    loadLMP().then(setLmp)
  }, []))

  const computed = useMemo(() => computeCareItems(items, lmp, TODAY), [items, lmp])

  const scheduled = computed.filter(i => i.status === 'scheduled')
  // Items whose booking window has fully closed, unscheduled — these no
  // longer have a meaningful "book by" date, so they're surfaced separately
  // (needsDecision below) instead of sorting to the top of "upcoming" forever.
  // Kept out of needsYouCount below: a pile of past, probably-already-done
  // items isn't "urgent" the way a closing booking window is, and counting
  // them in the headline number reads as "you're behind" rather than
  // "nothing's on fire" — exactly the anxious framing we want to avoid.
  const needsDecision = computed.filter(i => i.status === 'missed')
  const upcoming = computed
    .filter(i => i.status === 'actionable' || i.status === 'future')
    .sort((a, b) => a.bookBy.getTime() - b.bookBy.getTime())
  const attention = upcoming.slice(0, 2)
  const needsYouCount = attention.filter(i => i.status === 'actionable').length
  // A small number of stale items is still worth naming individually; a
  // bigger pile (e.g. joining the app mid-pregnancy) reads as overwhelming
  // one-by-one, so it collapses into a single reassuring summary instead.
  const needsDecisionGrouped = needsDecision.length > 2

  // Full chronological list for the "Upcoming appointments" preview below —
  // distinct from `attention`/`scheduled` above, which are split by what
  // action each one needs rather than ordered by when it's actually coming up.
  const allUpcoming = [...scheduled, ...upcoming].sort((a, b) =>
    (a.scheduledAt ?? a.windowStart).getTime() - (b.scheduledAt ?? b.windowStart).getTime()
  )

  // A handful of recognizable milestones rather than every care item — the
  // journey strip is meant as an at-a-glance "where am I" view, not a full
  // list (that's what the sections above and the appointment detail are for).
  const firstUltrasoundItem = computed.find(i => i.id === 'first-ultrasound')
  const ntScanItem = computed.find(i => i.id === 'nuchal-translucency')
  // Same ranking as "What needs your attention" above (by bookBy, most
  // urgent first) rather than raw window order — the earliest *window*
  // is often a long-overdue first-trimester item once further along.
  const nextMajorItem = [...scheduled, ...upcoming]
    .filter(i => i.id !== 'first-ultrasound' && i.id !== 'nuchal-translucency')
    .sort((a, b) => (a.scheduledAt ?? a.bookBy).getTime() - (b.scheduledAt ?? b.bookBy).getTime())[0]

  const journeyNodes = useMemo(() => {
    const nodes: JourneyNode[] = []
    if (firstUltrasoundItem) {
      nodes.push({
        key: firstUltrasoundItem.id,
        label: shortLabel(getItemTitle(firstUltrasoundItem)),
        iconId: firstUltrasoundItem.id,
        weekLabel: t('weekShort', { n: Math.round(firstUltrasoundItem.windowStartWeek) }),
        weekValue: firstUltrasoundItem.windowStartWeek,
        state: firstUltrasoundItem.status === 'done' ? 'done' : 'upcoming',
        linkId: firstUltrasoundItem.id,
      })
    }
    if (ntScanItem) {
      nodes.push({
        key: ntScanItem.id,
        label: t('ntScan'),
        iconId: ntScanItem.id,
        weekLabel: t('weekShort', { n: Math.round(ntScanItem.windowStartWeek) }),
        weekValue: ntScanItem.windowStartWeek,
        state: ntScanItem.status === 'done' ? 'done' : 'upcoming',
        linkId: ntScanItem.id,
      })
    }
    nodes.push({
      key: 'current',
      label: t('weekLabel', { weeks: age.weeks }),
      iconId: '',
      weekLabel: t('hereNow'),
      weekValue: age.weeks + age.days / 7,
      state: 'current',
    })
    if (nextMajorItem) {
      nodes.push({
        key: nextMajorItem.id,
        label: shortLabel(getItemTitle(nextMajorItem)),
        iconId: nextMajorItem.id,
        weekLabel: nextMajorItem.status === 'scheduled' && nextMajorItem.scheduledAt
          ? formatDate(nextMajorItem.scheduledAt)
          : t('weekShort', { n: Math.round(nextMajorItem.windowStartWeek) }),
        weekValue: nextMajorItem.windowStartWeek,
        state: 'upcoming',
        linkId: nextMajorItem.id,
      })
    }
    nodes.push({ key: 'meet-baby', label: t('meetBaby'), iconId: '', weekLabel: t('weekShort', { n: 40 }), weekValue: 40, state: 'milestone' })

    return nodes.sort((a, b) => a.weekValue - b.weekValue)
  }, [firstUltrasoundItem, ntScanItem, nextMajorItem, age])

  const currentNodeIndex = journeyNodes.findIndex(n => n.state === 'current')

  const nextUpMeta = (() => {
    if (!nextMajorItem) return ''
    if (nextMajorItem.status === 'scheduled' && nextMajorItem.scheduledAt) return formatDate(nextMajorItem.scheduledAt)
    if (nextMajorItem.status === 'actionable') return t('bookBy', { date: formatDate(nextMajorItem.bookBy) })
    const days = Math.max(0, Math.round((nextMajorItem.windowStart.getTime() - TODAY.getTime()) / 86400000))
    return t('weekInDays', { weeks: Math.round(nextMajorItem.windowStartWeek), count: days })
  })()

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
          </View>
        </View>

        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryIconChip}>
              <Ionicons name="calendar-outline" size={22} color={colors.sageDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryWeek}>{t('summaryWeek', { weeks: age.weeks, days: age.days })}</Text>
              <Text style={styles.summarySub}>{t('summarySub')}</Text>
            </View>
            <View style={styles.summaryIllustration}>
              <BabyMark size={52} />
              <View style={[styles.summaryHeart, isRTL && styles.summaryHeartRTL]}>
                <Ionicons name="heart" size={13} color={colors.lavenderDeep} />
              </View>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <Text style={styles.needsYouTitle}>
            {needsYouCount > 0 ? t('needsYou', { count: needsYouCount }) : t('nothingNeedsAttention')}
          </Text>
          <Text style={styles.needsYouSub}>{t('needsYouSub')}</Text>
        </View>

        {attention.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{needsYouCount > 0 ? t('whatNeedsAttention') : t('comingUp')}</Text>
            <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
              {attention.map(item => {
                const meta = metaFor(item.windowStartWeek)
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.attentionCard}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/appointment/${item.id}`)}
                  >
                    <View style={[styles.iconChip, { backgroundColor: meta.chipBg }]}>
                      <ItemIcon id={item.id} size={20} color={meta.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attentionTitle}>{getItemTitle(item)}</Text>
                      <Text style={styles.attentionMeta}>
                        {t('targetDates', { range: formatDateRange(item.windowStart, item.windowEnd) })}
                      </Text>
                      {item.status === 'actionable' && (
                        <Text style={styles.bookBy}>{t('bookBy', { date: formatDate(item.bookBy) })}</Text>
                      )}
                    </View>
                    {item.status === 'actionable' ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.scheduleBtn}
                        onPress={() => router.push({ pathname: '/add-item', params: { id: item.id, title: getItemTitle(item), prepNote: item.prepNote ?? '', windowStart: item.windowStart.toISOString(), windowEnd: item.windowEnd.toISOString() } })}
                      >
                        <Text style={styles.scheduleBtnText}>{t('scheduleNow')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.laterPill}>
                        <Text style={styles.laterPillText}>{t('remindLater')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

        {needsDecision.length > 0 && needsDecisionGrouped && (
          <TouchableOpacity
            style={styles.pastCheckupsCard}
            activeOpacity={0.7}
            onPress={() => router.push('/catch-up-review')}
          >
            <View style={styles.pastCheckupsIconChip}>
              <Ionicons name="heart-outline" size={20} color={colors.sageDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pastCheckupsTitle}>{t('pastCheckupsTitle')}</Text>
              <Text style={styles.pastCheckupsSub}>{t('pastCheckupsSub', { count: needsDecision.length })}</Text>
            </View>
            <Ionicons name={forward} size={18} color={colors.sageDeep} />
          </TouchableOpacity>
        )}

        {needsDecision.length > 0 && !needsDecisionGrouped && (
          <>
            <Text style={styles.sectionTitle}>{t('needsDecision')}</Text>
            <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
              {needsDecision.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.attentionCard}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/appointment/${item.id}`)}
                >
                  <View style={[styles.iconChip, { backgroundColor: colors.neutralChip }]}>
                    <ItemIcon id={item.id} size={20} color={colors.neutralChipDeep} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attentionTitle}>{getItemTitle(item)}</Text>
                    <Text style={styles.attentionMeta}>{t('windowPassed')}</Text>
                  </View>
                  <View style={styles.laterPill}>
                    <Text style={styles.laterPillText}>{t('needsDecisionPill')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={styles.reassuranceCard}>
          <View style={styles.reassuranceIconChip}>
            <Ionicons name="heart-outline" size={20} color={colors.sageDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reassuranceTitle}>{t('everythingElseWait')}</Text>
            <Text style={styles.reassuranceSub}>{t('reassuranceSub')}</Text>
          </View>
        </View>

        {scheduled.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('nextUp')}</Text>
            <View style={styles.listCard}>
              {scheduled.map((item, i) => {
                const meta = metaFor(item.windowStartWeek)
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.nextUpRow, i > 0 && styles.listRowDivider]}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/appointment/${item.id}`)}
                  >
                    <View style={[styles.iconChip, { backgroundColor: meta.chipBg }]}>
                      <ItemIcon id={item.id} size={18} color={meta.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attentionTitle}>{getItemTitle(item)}</Text>
                      <Text style={styles.attentionMeta}>
                        {formatWeekday(item.scheduledAt!)}{item.scheduledTimeLabel ? ` • ${item.scheduledTimeLabel}` : ''}
                      </Text>
                      {!!item.location && <Text style={styles.attentionMeta}>{item.location}</Text>}
                      {!!item.prepNote && <Text style={styles.prepNote}>{item.prepNote}</Text>}
                    </View>
                    <Ionicons name={forward} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

        <View style={styles.journeyCard}>
          <View style={styles.journeyHeaderRow}>
            <Text style={styles.journeyTitle}>{t('yourJourney')}</Text>
            <View style={styles.weekChip}>
              <Text style={styles.weekChipText}>{t('weekLabel', { weeks: age.weeks })}</Text>
              <Ionicons name="chevron-down" size={13} color={colors.primaryDark} />
            </View>
          </View>

          <Text style={styles.trimesterTitle}>
            {age.weeks < 14 ? t('trimester1') : age.weeks < 28 ? t('trimester2') : t('trimester3')}
          </Text>
          <View style={styles.hereRow}>
            <Text style={styles.hereText}>{t('youAreHere')}</Text>
            <Ionicons name="heart" size={13} color={colors.primary} />
          </View>

          <View style={styles.journeyTrack}>
            {journeyNodes.map((node, i) => {
              const gapBeforeColor = i > 0 && i - 1 < currentNodeIndex ? colors.sageDeep : colors.border
              const gapAfterColor = i < currentNodeIndex ? colors.sageDeep : colors.border
              const content = (
                <View key={node.key} style={styles.journeyNodeCol}>
                  <View style={styles.journeyIconRow}>
                    {i > 0 && <View style={[styles.journeyLine, { backgroundColor: gapBeforeColor }]} />}
                    {node.state === 'current' ? (
                      <View style={styles.journeyCurrentWrap}>
                        <View style={styles.journeyGlow} />
                        <View style={styles.journeyCircleCurrent} />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.journeyCircle,
                          node.state === 'done' && styles.journeyCircleDone,
                          node.state === 'upcoming' && styles.journeyCircleUpcoming,
                          node.state === 'milestone' && styles.journeyCircleMilestone,
                        ]}
                      >
                        {node.state === 'done' ? (
                          <Ionicons name="checkmark" size={15} color={colors.sageDeep} />
                        ) : node.state === 'milestone' ? (
                          <Ionicons name="gift-outline" size={14} color={colors.lavenderDeep} />
                        ) : (
                          <ItemIcon id={node.iconId} size={13} color={colors.textSecondary} />
                        )}
                      </View>
                    )}
                    {i < journeyNodes.length - 1 && <View style={[styles.journeyLine, { backgroundColor: gapAfterColor }]} />}
                  </View>
                  <Text style={styles.journeyLabel} numberOfLines={2}>{node.label}</Text>
                  <Text style={[styles.journeyWeek, node.state === 'current' && styles.journeyWeekCurrent]} numberOfLines={1}>
                    {node.weekLabel}
                  </Text>
                </View>
              )
              return node.linkId ? (
                <TouchableOpacity key={node.key} style={styles.journeyNodeTouchable} activeOpacity={0.7} onPress={() => router.push(`/appointment/${node.linkId}`)}>
                  {content}
                </TouchableOpacity>
              ) : content
            })}
          </View>

          {nextMajorItem && (
            <TouchableOpacity style={styles.nextUpMiniCard} activeOpacity={0.7} onPress={() => router.push(`/appointment/${nextMajorItem.id}`)}>
              <View style={styles.nextUpMiniIconChip}>
                <ItemIcon id={nextMajorItem.id} size={18} color={colors.lavenderDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nextUpMiniEyebrow}>{t('nextUp')}</Text>
                <Text style={styles.nextUpMiniTitle}>{getItemTitle(nextMajorItem)}</Text>
                <Text style={styles.nextUpMiniMeta}>{nextUpMeta}</Text>
              </View>
              <Ionicons name={forward} size={18} color={colors.lavenderDeep} />
            </TouchableOpacity>
          )}
        </View>

        {allUpcoming.length > 0 && (
          <>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{t('upcomingAppointments')}</Text>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/appointments')}>
                <Text style={styles.viewAllText}>{t('viewAll')}</Text>
                <Ionicons name={forward} size={14} color={colors.primaryDark} />
              </TouchableOpacity>
            </View>
            <View style={styles.listCard}>
              {allUpcoming.slice(0, 3).map((appt, i) => {
                const meta = metaFor(appt.windowStartWeek)
                return (
                  <TouchableOpacity
                    key={appt.id}
                    style={[styles.nextUpRow, i > 0 && styles.listRowDivider]}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/appointment/${appt.id}`)}
                  >
                    <View style={[styles.iconChip, { backgroundColor: meta.chipBg }]}>
                      <ItemIcon id={appt.id} size={18} color={meta.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attentionTitle}>{getItemTitle(appt)}</Text>
                      <Text style={styles.attentionMeta}>
                        {appt.status === 'scheduled' && appt.scheduledAt ? formatWeekday(appt.scheduledAt) : t('weekLabel', { weeks: Math.round(appt.windowStartWeek) })}
                      </Text>
                    </View>
                    <Ionicons name={forward} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

        <TouchableOpacity style={styles.addCustomCard} activeOpacity={0.7} onPress={() => router.push('/add-item')}>
          <View style={styles.addCustomIconChip}>
            <Ionicons name="add-circle-outline" size={22} color={colors.lavenderDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addCustomTitle}>{t('addCustomTitle')}</Text>
            <Text style={styles.addCustomSub}>{t('addCustomSub')}</Text>
          </View>
          <Ionicons name={forward} size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* TODO: gate behind age.weeks once past onboarding, e.g. >= 25. */}
        <View style={styles.birthPrepCard}>
          <View style={styles.birthPrepIconChip}>
            <Ionicons name="heart-outline" size={22} color={colors.lavenderDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.birthPrepTitle}>{t('prepareForBirth')}</Text>
            <Text style={styles.birthPrepSub}>{t('prepareForBirthSub')}</Text>
          </View>
          <TouchableOpacity style={styles.birthPrepBtn} onPress={() => router.push('/prepare-for-birth')}>
            <Text style={styles.birthPrepBtnText}>{t('explore')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.md, paddingTop: 28, paddingBottom: 56 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  appName:    { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  profileBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  title:    { fontFamily: fonts.headlineBold, fontSize: 28, color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md },

  summaryCard:      { backgroundColor: colors.sage, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.lg },
  summaryTopRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryIconChip:  { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  summaryWeek:      { fontFamily: fonts.headline, fontSize: 19, color: colors.textPrimary },
  summarySub:       { fontSize: 12.5, color: colors.textPrimary, opacity: 0.65, marginTop: 1 },
  summaryIllustration: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  summaryHeart:      { position: 'absolute', top: -2, right: 0 },
  summaryHeartRTL:   { right: undefined, left: 0 },
  summaryDivider:    { height: 1, backgroundColor: 'rgba(43,36,32,0.08)', marginVertical: spacing.sm },
  needsYouTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary },
  needsYouSub:   { fontSize: 12.5, color: colors.textPrimary, opacity: 0.65, marginTop: 3, lineHeight: 18 },

  sectionTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary, marginBottom: spacing.xs },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewAllBtn:  { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.xs },
  viewAllText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },

  attentionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  iconChip:      { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  attentionTitle: { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary },
  attentionMeta:  { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  bookBy:         { fontSize: 12, fontWeight: '700', color: colors.urgent, marginTop: 3 },
  prepNote:       { fontSize: 11.5, color: colors.sageDeep, marginTop: 2, fontWeight: '600' },

  scheduleBtn:     { backgroundColor: colors.urgentBg, paddingHorizontal: spacing.sm, paddingVertical: 9, borderRadius: radius.pill },
  scheduleBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.urgent },
  laterPill:       { backgroundColor: colors.neutralChip, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.pill, maxWidth: 96 },
  laterPillText:   { fontSize: 10.5, fontWeight: '600', color: colors.neutralChipDeep, textAlign: 'center' },

  listCard:       { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  nextUpRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  listRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },

  journeyCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  journeyHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  journeyTitle: { fontFamily: fonts.headlineBold, fontSize: 24, color: colors.textPrimary },
  weekChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.peach, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  weekChipText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },

  trimesterTitle: { fontFamily: fonts.headline, fontSize: 18, color: colors.textPrimary, marginBottom: 2 },
  hereRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.md },
  hereText: { fontSize: 13.5, color: colors.textSecondary },

  journeyTrack: { flexDirection: 'row', marginBottom: spacing.md },
  journeyNodeTouchable: { flex: 1 },
  journeyNodeCol: { flex: 1, alignItems: 'center' },
  journeyIconRow: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 40 },
  journeyLine: { flex: 1, height: 1.5 },

  journeyCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  journeyCircleDone: { backgroundColor: colors.sage },
  journeyCircleUpcoming: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  journeyCircleMilestone: { backgroundColor: colors.lavender },

  journeyCurrentWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  journeyGlow: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, opacity: 0.14 },
  journeyCircleCurrent: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary },

  journeyLabel: { fontSize: 10.5, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginTop: 6, lineHeight: 13 },
  journeyWeek:  { fontSize: 9.5, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
  journeyWeekCurrent: { color: colors.primaryDark, fontWeight: '700' },

  nextUpMiniCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.lavender, borderRadius: radius.lg, padding: spacing.sm },
  nextUpMiniIconChip: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  nextUpMiniEyebrow: { fontSize: 11, fontWeight: '700', color: colors.lavenderDeep, textTransform: 'uppercase', letterSpacing: 0.5 },
  nextUpMiniTitle: { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary, marginTop: 1 },
  nextUpMiniMeta:  { fontSize: 12, color: colors.textPrimary, opacity: 0.65, marginTop: 2 },

  reassuranceCard:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.sage, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.lg },
  reassuranceIconChip: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  reassuranceTitle:    { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary },
  reassuranceSub:      { fontSize: 12, color: colors.textPrimary, opacity: 0.65, marginTop: 2, lineHeight: 17 },

  pastCheckupsCard:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.sage, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.lg },
  pastCheckupsIconChip: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  pastCheckupsTitle:    { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary },
  pastCheckupsSub:      { fontSize: 12, color: colors.textPrimary, opacity: 0.65, marginTop: 2, lineHeight: 17 },

  addCustomCard:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  addCustomIconChip: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  addCustomTitle:    { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary },
  addCustomSub:      { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },

  birthPrepCard:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.lavender, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.lg },
  birthPrepIconChip: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  birthPrepTitle:    { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary },
  birthPrepSub:      { fontSize: 12, color: colors.textPrimary, opacity: 0.65, marginTop: 2, lineHeight: 16 },
  birthPrepBtn:      { backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  birthPrepBtnText:  { fontSize: 12.5, fontWeight: '700', color: colors.lavenderDeep },
})
