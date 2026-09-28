import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../../lib/theme'
import { formatDateRange, formatWeekday, computeCareItems } from '../../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, markBookedDone, type CareItemWithCustom } from '../../lib/carePlan'

export default function BookedScreen() {
  const router = useRouter()
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Have any appointments already booked?</Text>
        <Text style={styles.subtitle}>
          Add the date — and a doctor or location if you like — for anything you've already scheduled.
        </Text>

        <View style={{ gap: 8 }}>
          {remaining.map(item => {
            const isBooked = item.status === 'scheduled' && item.scheduledAt
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/add-item',
                  params: isBooked
                    ? {
                        id: item.id,
                        title: item.title,
                        date: item.scheduledAt!.toISOString(),
                        time: item.scheduledTimeLabel ?? '',
                        location: item.location ?? '',
                        prepNote: item.prepNote ?? '',
                        windowStart: item.windowStart.toISOString(),
                        windowEnd: item.windowEnd.toISOString(),
                      }
                    : { id: item.id, title: item.title, windowStart: item.windowStart.toISOString(), windowEnd: item.windowEnd.toISOString() },
                })}
              >
                <Ionicons
                  name={isBooked ? 'checkmark-circle' : 'add-circle-outline'}
                  size={22}
                  color={isBooked ? colors.sageDeep : colors.border}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  {isBooked ? (
                    <Text style={styles.rowMetaBooked}>
                      Booked · {formatWeekday(item.scheduledAt!)}{item.scheduledTimeLabel ? ` · ${item.scheduledTimeLabel}` : ''}
                      {item.location ? ` · ${item.location}` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.rowMeta}>Target dates: {formatDateRange(item.windowStart, item.windowEnd)}</Text>
                  )}
                </View>
                <Text style={styles.rowAction}>{isBooked ? 'Edit' : 'Add date'}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity style={styles.continueBtn} onPress={continueOn}>
          <Text style={styles.continueBtnText}>{bookedCount > 0 ? `Continue (${bookedCount} booked)` : 'Continue'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 56 },

  title:    { fontSize: 24, fontWeight: '800', color: colors.textPrimary, lineHeight: 30 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 20 },

  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm },
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
  rowMeta:  { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowMetaBooked: { fontSize: 12, color: colors.sageDeep, fontWeight: '600', marginTop: 2 },
  rowAction: { fontSize: 12.5, fontWeight: '700', color: colors.primary },

  continueBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.lg },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
