import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { BabyMark, BellyMark } from '../../components/illustrations'
import { formatDate, formatDateRange, formatWeekday, gestationalAge } from '../../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, computeCareItems, type CareItemWithCustom } from '../../lib/carePlan'
import { useAutoScrollEnabled } from '../../lib/useAutoScrollEnabled'

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

function ItemIcon({ title, size, color }: { title: string; size: number; color: string }) {
  const t = title.toLowerCase()
  if (t.includes('ultrasound') || t.includes('scan')) return <BellyMark size={size} color={color} />
  if (t.includes('blood') || t.includes('urine') || t.includes('screening') || t.includes('biochem') || t.includes('gbs') || t.includes('glucose')) {
    return <Ionicons name="flask-outline" size={size} color={color} />
  }
  if (t.includes('vaccine')) return <Ionicons name="shield-checkmark-outline" size={size} color={color} />
  if (t.includes('doctor visit')) return <Ionicons name="medical-outline" size={size} color={color} />
  if (t.includes('amniocentesis') || t.includes('sampling') || t.includes('echo')) return <Ionicons name="body-outline" size={size} color={color} />
  if (t.includes('monitoring')) return <Ionicons name="time-outline" size={size} color={color} />
  return <Ionicons name="calendar-outline" size={size} color={color} />
}

type JourneyNodeState = 'done' | 'current' | 'upcoming' | 'milestone'
type JourneyNode = {
  key: string
  label: string
  /** Untruncated title, for ItemIcon's keyword matching — `label` may be shortened for display. */
  iconTitle: string
  weekLabel: string
  weekValue: number
  state: JourneyNodeState
  linkId?: string
}

function trimesterName(weeks: number) {
  return weeks < 14 ? 'First trimester' : weeks < 28 ? 'Second trimester' : 'Third trimester'
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
  const upcoming = computed
    .filter(i => i.status !== 'scheduled' && i.status !== 'done')
    .sort((a, b) => a.bookBy.getTime() - b.bookBy.getTime())
  const attention = upcoming.slice(0, 2)
  const needsYouCount = attention.filter(i => i.status === 'actionable').length

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
        label: shortLabel(firstUltrasoundItem.title),
        iconTitle: firstUltrasoundItem.title,
        weekLabel: `W${Math.round(firstUltrasoundItem.windowStartWeek)}`,
        weekValue: firstUltrasoundItem.windowStartWeek,
        state: firstUltrasoundItem.status === 'done' ? 'done' : 'upcoming',
        linkId: firstUltrasoundItem.id,
      })
    }
    if (ntScanItem) {
      nodes.push({
        key: ntScanItem.id,
        label: 'NT scan',
        iconTitle: ntScanItem.title,
        weekLabel: `W${Math.round(ntScanItem.windowStartWeek)}`,
        weekValue: ntScanItem.windowStartWeek,
        state: ntScanItem.status === 'done' ? 'done' : 'upcoming',
        linkId: ntScanItem.id,
      })
    }
    nodes.push({
      key: 'current',
      label: `Week ${age.weeks}`,
      iconTitle: '',
      weekLabel: 'Here now',
      weekValue: age.weeks + age.days / 7,
      state: 'current',
    })
    if (nextMajorItem) {
      nodes.push({
        key: nextMajorItem.id,
        label: shortLabel(nextMajorItem.title),
        iconTitle: nextMajorItem.title,
        weekLabel: nextMajorItem.status === 'scheduled' && nextMajorItem.scheduledAt
          ? formatDate(nextMajorItem.scheduledAt)
          : `W${Math.round(nextMajorItem.windowStartWeek)}`,
        weekValue: nextMajorItem.windowStartWeek,
        state: 'upcoming',
        linkId: nextMajorItem.id,
      })
    }
    nodes.push({ key: 'meet-baby', label: 'Meet baby', iconTitle: '', weekLabel: 'W40', weekValue: 40, state: 'milestone' })

    return nodes.sort((a, b) => a.weekValue - b.weekValue)
  }, [firstUltrasoundItem, ntScanItem, nextMajorItem, age])

  const currentNodeIndex = journeyNodes.findIndex(n => n.state === 'current')

  const nextUpMeta = (() => {
    if (!nextMajorItem) return ''
    if (nextMajorItem.status === 'scheduled' && nextMajorItem.scheduledAt) return formatDate(nextMajorItem.scheduledAt)
    if (nextMajorItem.status === 'actionable') return `Book by ${formatDate(nextMajorItem.bookBy)}`
    const days = Math.max(0, Math.round((nextMajorItem.windowStart.getTime() - TODAY.getTime()) / 86400000))
    return `Week ${Math.round(nextMajorItem.windowStartWeek)} · in ${days} day${days === 1 ? '' : 's'}`
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
            <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')} accessibilityLabel="Profile">
              <Ionicons name="person-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Pregnancy plan</Text>
            <Text style={styles.subtitle}>We help you book the right tests on time.</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-item')} accessibilityLabel="Add appointment">
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryIconChip}>
              <Ionicons name="calendar-outline" size={22} color={colors.sageDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryWeek}>Week {age.weeks} + {age.days}</Text>
              <Text style={styles.summarySub}>Based on your dates</Text>
            </View>
            <View style={styles.summaryIllustration}>
              <BabyMark size={52} />
              <View style={styles.summaryHeart}>
                <Ionicons name="heart" size={13} color={colors.lavenderDeep} />
              </View>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <Text style={styles.needsYouTitle}>
            {needsYouCount > 0 ? `${needsYouCount} thing${needsYouCount > 1 ? 's' : ''} need your attention` : 'Nothing needs your attention right now'}
          </Text>
          <Text style={styles.needsYouSub}>We'll remind you before booking windows close.</Text>
        </View>

        {attention.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>What needs your attention</Text>
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
                      <ItemIcon title={item.title} size={20} color={meta.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attentionTitle}>{item.title}</Text>
                      <Text style={styles.attentionMeta}>
                        Target dates: {formatDateRange(item.windowStart, item.windowEnd)}
                      </Text>
                      {item.status === 'actionable' && (
                        <Text style={styles.bookBy}>Book by {formatDate(item.bookBy)}</Text>
                      )}
                    </View>
                    {item.status === 'actionable' ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.scheduleBtn}
                        onPress={() => router.push({ pathname: '/add-item', params: { id: item.id, title: item.title, prepNote: item.prepNote ?? '', windowStart: item.windowStart.toISOString(), windowEnd: item.windowEnd.toISOString() } })}
                      >
                        <Text style={styles.scheduleBtnText}>Schedule now</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.laterPill}>
                        <Text style={styles.laterPillText}>We'll remind you later</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

        <View style={styles.reassuranceCard}>
          <View style={styles.reassuranceIconChip}>
            <Ionicons name="heart-outline" size={20} color={colors.sageDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reassuranceTitle}>Everything else can wait</Text>
            <Text style={styles.reassuranceSub}>We'll bring things back when they become relevant.</Text>
          </View>
        </View>

        {scheduled.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Next up</Text>
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
                      <ItemIcon title={item.title} size={18} color={meta.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attentionTitle}>{item.title}</Text>
                      <Text style={styles.attentionMeta}>
                        {formatWeekday(item.scheduledAt!)}{item.scheduledTimeLabel ? ` • ${item.scheduledTimeLabel}` : ''}
                      </Text>
                      {!!item.location && <Text style={styles.attentionMeta}>{item.location}</Text>}
                      {!!item.prepNote && <Text style={styles.prepNote}>{item.prepNote}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

        <View style={styles.journeyCard}>
          <View style={styles.journeyHeaderRow}>
            <Text style={styles.journeyTitle}>Your journey</Text>
            <View style={styles.weekChip}>
              <Text style={styles.weekChipText}>Week {age.weeks}</Text>
              <Ionicons name="chevron-down" size={13} color={colors.primaryDark} />
            </View>
          </View>

          <Text style={styles.trimesterTitle}>{trimesterName(age.weeks)}</Text>
          <View style={styles.hereRow}>
            <Text style={styles.hereText}>You're here</Text>
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
                          <ItemIcon title={node.iconTitle} size={13} color={colors.textSecondary} />
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
                <ItemIcon title={nextMajorItem.title} size={18} color={colors.lavenderDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nextUpMiniEyebrow}>Next up</Text>
                <Text style={styles.nextUpMiniTitle}>{nextMajorItem.title}</Text>
                <Text style={styles.nextUpMiniMeta}>{nextUpMeta}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.lavenderDeep} />
            </TouchableOpacity>
          )}
        </View>

        {allUpcoming.length > 0 && (
          <>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Upcoming appointments</Text>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/appointments')}>
                <Text style={styles.viewAllText}>View all</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
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
                      <ItemIcon title={appt.title} size={18} color={meta.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attentionTitle}>{appt.title}</Text>
                      <Text style={styles.attentionMeta}>
                        {appt.status === 'scheduled' && appt.scheduledAt ? formatWeekday(appt.scheduledAt) : `Week ${Math.round(appt.windowStartWeek)}`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

        {/* TODO: placeholder only — see app/prepare-for-birth.tsx for the
            full feature spec. Surfaces a couple weeks ahead of its week
            30-32 window, same early-heads-up pattern as the journey card's
            "Next up". */}
        {age.weeks >= 26 && (
          <View style={styles.birthPrepCard}>
            <View style={styles.birthPrepIconChip}>
              <Ionicons name="heart-outline" size={22} color={colors.lavenderDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.birthPrepTitle}>Prepare for birth</Text>
              <Text style={styles.birthPrepSub}>Birth preferences, hospital bag, and more — around week 30.</Text>
            </View>
            <TouchableOpacity style={styles.birthPrepBtn} onPress={() => router.push('/prepare-for-birth')}>
              <Text style={styles.birthPrepBtnText}>Explore</Text>
            </TouchableOpacity>
          </View>
        )}

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
  bellBtn:    { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title:    { fontFamily: fonts.headline, fontSize: 28, color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md },
  addBtn:   { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  summaryCard:      { backgroundColor: colors.sage, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.lg },
  summaryTopRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryIconChip:  { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  summaryWeek:      { fontFamily: fonts.headline, fontSize: 19, color: colors.textPrimary },
  summarySub:       { fontSize: 12.5, color: colors.textPrimary, opacity: 0.65, marginTop: 1 },
  summaryIllustration: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  summaryHeart:      { position: 'absolute', top: -2, right: 0 },
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
  journeyTitle: { fontFamily: fonts.headline, fontSize: 24, color: colors.textPrimary },
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

  birthPrepCard:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.lavender, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.lg },
  birthPrepIconChip: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  birthPrepTitle:    { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary },
  birthPrepSub:      { fontSize: 12, color: colors.textPrimary, opacity: 0.65, marginTop: 2, lineHeight: 16 },
  birthPrepBtn:      { backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  birthPrepBtnText:  { fontSize: 12.5, fontWeight: '700', color: colors.lavenderDeep },
})
