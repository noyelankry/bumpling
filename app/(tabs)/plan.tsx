import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutChangeEvent } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { colors, spacing, radius } from '../../lib/theme'
import { BabyMark, BellyMark } from '../../components/illustrations'
import { addDays, formatDate, formatDateRange, formatWeekday, gestationalAge } from '../../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, computeCareItems, type CareItemWithCustom } from '../../lib/carePlan'

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

export default function PlanScreen() {
  const router = useRouter()
  const [trackWidth, setTrackWidth] = useState(0)
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
  const hasOverdue = attention.some(i => i.status === 'actionable' && i.bookBy.getTime() < TODAY.getTime())

  const timelineRange = useMemo(() => {
    const dates: Date[] = [TODAY]
    computed.forEach(i => {
      if (i.status === 'scheduled' && i.scheduledAt) dates.push(i.scheduledAt)
      else dates.push(i.windowStart, i.windowEnd)
    })
    const start = addDays(new Date(Math.min(...dates.map(d => d.getTime()))), -3)
    const end = addDays(new Date(Math.max(...dates.map(d => d.getTime()))), 4)
    return { start, end, span: end.getTime() - start.getTime() }
  }, [computed])

  const pct = (d: Date) =>
    Math.max(0, Math.min(100, ((d.getTime() - timelineRange.start.getTime()) / timelineRange.span) * 100))

  const months = useMemo(() => {
    const list: Date[] = []
    const cursor = new Date(timelineRange.start.getFullYear(), timelineRange.start.getMonth(), 1)
    while (cursor.getTime() <= timelineRange.end.getTime()) {
      list.push(new Date(cursor))
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return list
  }, [timelineRange])

  const timelineItems = [...computed].sort((a, b) => {
    const da = a.status === 'scheduled' && a.scheduledAt ? a.scheduledAt : a.windowStart
    const db = b.status === 'scheduled' && b.scheduledAt ? b.scheduledAt : b.windowStart
    return da.getTime() - db.getTime()
  })
  const TIMELINE_LIST_LIMIT = 6
  const timelineVisible = timelineItems.slice(0, TIMELINE_LIST_LIMIT)
  const timelineHiddenCount = timelineItems.length - timelineVisible.length

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BabyMark size={34} />
            <Text style={styles.appName}>Bumpling</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
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
            <View style={[styles.statusPill, hasOverdue && styles.statusPillUrgent]}>
              <Ionicons
                name={hasOverdue ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={14}
                color={hasOverdue ? colors.urgent : colors.sageDeep}
              />
              <Text style={[styles.statusPillText, hasOverdue && styles.statusPillTextUrgent]}>
                {hasOverdue ? 'Needs attention' : "You're on track"}
              </Text>
            </View>
          </View>
          <Text style={styles.needsYouTitle}>
            {needsYouCount > 0 ? `${needsYouCount} thing${needsYouCount > 1 ? 's' : ''} needs you` : 'Nothing needs you right now'}
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
                        onPress={() => router.push({ pathname: '/add-item', params: { id: item.id, title: item.title, prepNote: item.prepNote ?? '' } })}
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
                      {!!item.prepNote && <Text style={styles.prepNote}>{item.prepNote}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Your timeline</Text>
        <View style={styles.timelineCard}>
          <View style={styles.monthRow}>
            {months.map(m => (
              <Text key={m.toISOString()} style={styles.monthLabel}>
                {m.toLocaleDateString('en-US', { month: 'short' })}
              </Text>
            ))}
          </View>

          <View style={styles.trackWrap} onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}>
            <View style={styles.trackLine} />
            {trackWidth > 0 && computed.map(item => {
              const meta = metaFor(item.windowStartWeek)
              if (item.status === 'done') {
                const mid = new Date((item.windowStart.getTime() + item.windowEnd.getTime()) / 2)
                return (
                  <View
                    key={item.id}
                    style={[styles.trackDoneDot, { left: `${pct(mid)}%` }]}
                  />
                )
              }
              if (item.status === 'scheduled' && item.scheduledAt) {
                return (
                  <View
                    key={item.id}
                    style={[styles.trackDot, { left: `${pct(item.scheduledAt)}%` }]}
                  />
                )
              }
              const left = pct(item.windowStart)
              const width = Math.max(pct(item.windowEnd) - left, 3)
              return (
                <View
                  key={item.id}
                  style={[
                    styles.trackSegment,
                    { left: `${left}%`, width: `${width}%`, backgroundColor: meta.trackColor },
                  ]}
                />
              )
            })}
          </View>

          <View style={styles.timelineList}>
            {timelineVisible.map(item => {
              const meta = metaFor(item.windowStartWeek)
              const isScheduled = item.status === 'scheduled' && item.scheduledAt
              const isDone = item.status === 'done'
              return (
                <View key={item.id} style={styles.timelineListRow}>
                  <View
                    style={[
                      styles.timelineSwatch,
                      { backgroundColor: isDone ? colors.sageDeep : isScheduled ? colors.scheduledDot : meta.trackColor },
                      (isScheduled || isDone) && styles.timelineSwatchDot,
                    ]}
                  />
                  <Text style={[styles.timelineListTitle, isDone && styles.timelineListTitleDone]}>{item.title}</Text>
                  <Text style={[styles.timelineListDate, isDone && styles.timelineListDateDone]}>
                    {isDone ? 'Done' : isScheduled ? formatDate(item.scheduledAt!) : formatDateRange(item.windowStart, item.windowEnd)}
                  </Text>
                </View>
              )
            })}
            {timelineHiddenCount > 0 && (
              <Text style={styles.timelineMore}>+{timelineHiddenCount} more later</Text>
            )}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendPill, { backgroundColor: colors.sageDeep }]} />
              <Text style={styles.legendText}>Target window</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.scheduledDot }]} />
              <Text style={styles.legendText}>Scheduled</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.sageDeep }]} />
              <Text style={styles.legendText}>Done</Text>
            </View>
          </View>
        </View>

        <View style={styles.reassuranceCard}>
          <View style={styles.reassuranceIconChip}>
            <Ionicons name="heart-outline" size={20} color={colors.sageDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reassuranceTitle}>Everything else can wait</Text>
            <Text style={styles.reassuranceSub}>We'll bring things back when they become relevant.</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 40 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  appName:    { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  bellBtn:    { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title:    { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md },
  addBtn:   { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  summaryCard:      { backgroundColor: colors.sage, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.lg },
  summaryTopRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  summaryIconChip:  { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  summaryWeek:      { fontSize: 19, fontWeight: '800', color: colors.textPrimary },
  summarySub:       { fontSize: 12.5, color: colors.textPrimary, opacity: 0.65, marginTop: 1 },
  statusPill:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  statusPillUrgent: { backgroundColor: colors.urgentBg },
  statusPillText:      { fontSize: 12, fontWeight: '700', color: colors.sageDeep },
  statusPillTextUrgent: { color: colors.urgent },
  needsYouTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  needsYouSub:   { fontSize: 12.5, color: colors.textPrimary, opacity: 0.65, marginTop: 3, lineHeight: 18 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },

  attentionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm },
  iconChip:      { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  attentionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  attentionMeta:  { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  bookBy:         { fontSize: 12, fontWeight: '700', color: colors.urgent, marginTop: 3 },
  prepNote:       { fontSize: 11.5, color: colors.sageDeep, marginTop: 2, fontWeight: '600' },

  scheduleBtn:     { backgroundColor: colors.urgentBg, paddingHorizontal: spacing.sm, paddingVertical: 9, borderRadius: radius.pill },
  scheduleBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.urgent },
  laterPill:       { backgroundColor: colors.neutralChip, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.pill, maxWidth: 96 },
  laterPillText:   { fontSize: 10.5, fontWeight: '600', color: colors.neutralChipDeep, textAlign: 'center' },

  listCard:       { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden' },
  nextUpRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  listRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },

  timelineCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  monthRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 },
  monthLabel:   { fontSize: 12.5, fontWeight: '700', color: colors.textPrimary },

  trackWrap:  { height: 22, justifyContent: 'center', marginBottom: spacing.sm },
  trackLine:  { height: 4, borderRadius: 2, backgroundColor: colors.border, width: '100%' },
  trackSegment: { position: 'absolute', height: 8, borderRadius: 4, opacity: 0.85 },
  trackDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.scheduledDot, marginLeft: -6, borderWidth: 2, borderColor: colors.card },
  trackDoneDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sageDeep, marginLeft: -5, borderWidth: 2, borderColor: colors.card },

  timelineList:    { gap: 8, marginBottom: spacing.sm },
  timelineListRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineSwatch:  { width: 10, height: 10, borderRadius: 3 },
  timelineSwatchDot: { borderRadius: 5 },
  timelineListTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  timelineListTitleDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  timelineListDate:  { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  timelineListDateDone: { color: colors.sageDeep },
  timelineMore:      { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 },

  legendRow:  { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendPill: { width: 16, height: 8, borderRadius: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11.5, color: colors.textSecondary, fontWeight: '600' },

  reassuranceCard:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.sage, borderRadius: radius.lg, padding: spacing.sm },
  reassuranceIconChip: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  reassuranceTitle:    { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  reassuranceSub:      { fontSize: 12, color: colors.textPrimary, opacity: 0.65, marginTop: 2, lineHeight: 17 },
})
