import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { formatDate, formatDateRange, formatWeekday } from '../../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, removeItem, markDone, unmarkDone, computeCareItems, type CareItemWithCustom } from '../../lib/carePlan'
import { addAppointmentToCalendar } from '../../lib/calendar'

export default function AppointmentDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [items, setItems] = useState<CareItemWithCustom[]>(DEFAULT_CARE_ITEMS)
  const [lmp, setLmp] = useState<Date>(TODAY)

  useFocusEffect(useCallback(() => {
    loadCareItems().then(setItems)
    loadLMP().then(setLmp)
  }, []))

  const computed = useMemo(() => computeCareItems(items, lmp, TODAY), [items, lmp])
  const item = computed.find(i => i.id === id)

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <Header router={router} title="Appointment" />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>This item isn't on your plan anymore.</Text>
        </View>
      </SafeAreaView>
    )
  }

  async function handleRemove() {
    const doRemove = async () => {
      const next = await removeItem(items, item!.id)
      setItems(next)
      router.back()
    }
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this from your plan?')) doRemove()
      return
    }
    Alert.alert('Remove from plan?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doRemove },
    ])
  }

  async function handleMarkDone() {
    const next = await markDone(items, item!.id)
    setItems(next)
  }

  async function handleUnmarkDone() {
    const next = await unmarkDone(items, item!.id)
    setItems(next)
  }

  async function handleAddToCalendar() {
    const result = await addAppointmentToCalendar({
      title: item!.title,
      date: item!.scheduledAt!,
      timeLabel: item!.scheduledTimeLabel,
      location: item!.location,
      notes: item!.prepNote,
    })
    if (Platform.OS === 'web') {
      window.alert(result.message)
    } else {
      Alert.alert(result.ok ? 'Added' : "Couldn't add to calendar", result.message)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header router={router} title={item.title} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={[
          styles.statusPill,
          item.status === 'actionable' && styles.statusPillUrgent,
          item.status === 'done' && styles.statusPillDone,
        ]}>
          <Ionicons
            name={item.status === 'done' ? 'checkmark-circle' : item.status === 'scheduled' ? 'checkmark-circle-outline' : item.status === 'actionable' ? 'alert-circle-outline' : 'time-outline'}
            size={14}
            color={item.status === 'done' || item.status === 'scheduled' ? colors.sageDeep : item.status === 'actionable' ? colors.urgent : colors.neutralChipDeep}
          />
          <Text style={[
            styles.statusPillText,
            item.status === 'actionable' && styles.statusPillTextUrgent,
            item.status === 'future' && styles.statusPillTextNeutral,
          ]}>
            {item.status === 'done' ? 'Already done' : item.status === 'scheduled' ? 'Scheduled' : item.status === 'actionable' ? 'Needs scheduling' : "We'll remind you later"}
          </Text>
        </View>

        <View style={styles.card}>
          {item.status === 'done' ? (
            <>
              <View style={styles.doneRow}>
                <Ionicons name="checkmark-circle" size={22} color={colors.sageDeep} />
                <Text style={styles.bigDate}>You already did this</Text>
              </View>
              {!!item.doneAt && (
                <Text style={styles.timeLabel}>Marked done on {formatDate(item.doneAt)}</Text>
              )}
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleUnmarkDone}>
                <Text style={styles.secondaryBtnText}>Undo</Text>
              </TouchableOpacity>
            </>
          ) : item.status === 'scheduled' && item.scheduledAt ? (
            <>
              <Text style={styles.bigDate}>{formatWeekday(item.scheduledAt)}</Text>
              {!!item.scheduledTimeLabel && <Text style={styles.timeLabel}>{item.scheduledTimeLabel}</Text>}
              {!!item.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>
              )}
              {!!item.prepNote && (
                <View style={styles.prepRow}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.sageDeep} />
                  <Text style={styles.prepText}>{item.prepNote}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push({
                  pathname: '/add-item',
                  params: {
                    id: item.id,
                    title: item.title,
                    date: item.scheduledAt!.toISOString(),
                    time: item.scheduledTimeLabel ?? '',
                    location: item.location ?? '',
                    prepNote: item.prepNote ?? '',
                    windowStart: item.windowStart.toISOString(),
                    windowEnd: item.windowEnd.toISOString(),
                  },
                })}
              >
                <Text style={styles.secondaryBtnText}>Change details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleAddToCalendar}>
                <Text style={styles.secondaryBtnText}>Add to calendar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Target dates</Text>
              <Text style={styles.rangeText}>{formatDateRange(item.windowStart, item.windowEnd)}</Text>
              {item.status === 'actionable' && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>Book by</Text>
                  <Text style={styles.bookByText}>{formatDate(item.bookBy)}</Text>
                </>
              )}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push({ pathname: '/add-item', params: { id: item.id, title: item.title, prepNote: item.prepNote ?? '', windowStart: item.windowStart.toISOString(), windowEnd: item.windowEnd.toISOString() } })}
              >
                <Text style={styles.primaryBtnText}>Schedule now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleMarkDone}>
                <Text style={styles.secondaryBtnText}>I already did this</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.doctorCard} activeOpacity={0.7} onPress={() => router.push('/brain-dump')}>
          <View style={styles.doctorIconChip}>
            <Ionicons name="medical-outline" size={20} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.doctorTitle}>Questions for your doctor</Text>
            <Text style={styles.doctorSub}>Jot down anything to ask before this appointment.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {item.custom && (
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
            <Text style={styles.removeBtnText}>Remove from plan</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

function Header({ router, title }: { router: ReturnType<typeof useRouter>; title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary, marginHorizontal: spacing.xs },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56 },

  notFound:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  notFoundText: { fontSize: 14, color: colors.textSecondary },

  statusPill:       { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, backgroundColor: colors.sage, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, marginBottom: spacing.md },
  statusPillUrgent: { backgroundColor: colors.urgentBg },
  statusPillDone:   { backgroundColor: colors.sage },
  statusPillText:   { fontSize: 12, fontWeight: '700', color: colors.sageDeep },
  statusPillTextUrgent: { color: colors.urgent },
  statusPillTextNeutral: { color: colors.neutralChipDeep },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },

  doneRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bigDate:   { fontFamily: fonts.headline, fontSize: 20, color: colors.textPrimary },
  timeLabel: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontSize: 13, color: colors.textSecondary },
  prepRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: colors.sage + '55', borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  prepText:  { flex: 1, fontSize: 12.5, color: colors.textPrimary, lineHeight: 18 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  rangeText:  { fontFamily: fonts.headline, fontSize: 18, color: colors.textPrimary, marginTop: 2 },
  bookByText: { fontFamily: fonts.headline, fontSize: 18, color: colors.urgent, marginTop: 2 },

  primaryBtn:     { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: spacing.md },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
  secondaryBtn:     { alignItems: 'center', paddingVertical: 10, marginTop: spacing.sm },
  secondaryBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13.5 },

  doctorCard:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  doctorIconChip: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  doctorTitle:    { fontFamily: fonts.headline, fontSize: 14.5, color: colors.textPrimary },
  doctorSub:      { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },

  removeBtn:     { alignItems: 'center', paddingVertical: spacing.sm },
  removeBtnText: { fontSize: 13.5, fontWeight: '600', color: colors.urgent },
})
