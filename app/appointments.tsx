import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { BellyMark } from '../components/illustrations'
import { formatDate, formatWeekday } from '../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, computeCareItems, type CareItemWithCustom } from '../lib/carePlan'
import { goBack } from '../lib/navigation'

const TRIMESTER_META = [
  { chipBg: colors.peach, iconColor: colors.primaryDark },
  { chipBg: colors.sage, iconColor: colors.sageDeep },
  { chipBg: colors.lavender, iconColor: colors.lavenderDeep },
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

export default function AppointmentsScreen() {
  const router = useRouter()
  const back = () => goBack(router, '/(tabs)/plan')
  const [items, setItems] = useState<CareItemWithCustom[]>(DEFAULT_CARE_ITEMS)
  const [lmp, setLmp] = useState<Date>(TODAY)

  useFocusEffect(useCallback(() => {
    loadCareItems().then(setItems)
    loadLMP().then(setLmp)
  }, []))

  const computed = useMemo(() => computeCareItems(items, lmp, TODAY), [items, lmp])

  const upcoming = computed
    .filter(i => i.status !== 'done')
    .sort((a, b) => (a.scheduledAt ?? a.windowStart).getTime() - (b.scheduledAt ?? b.windowStart).getTime())

  const past = computed
    .filter(i => i.status === 'done')
    .sort((a, b) => (b.doneAt ?? b.windowStart).getTime() - (a.doneAt ?? a.windowStart).getTime())

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={back} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {upcoming.length === 0 && past.length === 0 && (
          <Text style={styles.emptyText}>Nothing on your plan yet.</Text>
        )}

        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Upcoming</Text>
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
                      <ItemIcon title={item.title} size={18} color={meta.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{item.title}</Text>
                      <Text style={styles.rowMeta}>
                        {item.status === 'scheduled' && item.scheduledAt ? formatWeekday(item.scheduledAt) : `Week ${Math.round(item.windowStartWeek)}`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

        {past.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Past</Text>
            <View style={styles.listCard}>
              {past.map((item, i) => {
                const meta = metaFor(item.windowStartWeek)
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.row, i > 0 && styles.rowDivider]}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/appointment/${item.id}`)}
                  >
                    <View style={[styles.iconChip, { backgroundColor: colors.neutralChip }]}>
                      <ItemIcon title={item.title} size={18} color={colors.neutralChipDeep} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{item.title}</Text>
                      <Text style={styles.rowMeta}>{item.doneAt ? `Done ${formatDate(item.doneAt)}` : 'Done'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary },

  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 56 },
  emptyText: { fontSize: 13.5, color: colors.textSecondary, marginTop: spacing.md },

  sectionLabel: { fontFamily: fonts.headline, fontSize: 16, color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.sm },

  listCard: { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  row:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  iconChip:   { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle:   { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary },
  rowMeta:    { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
})
