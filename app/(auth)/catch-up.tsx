import { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../../lib/theme'
import { formatDateRange, computeCareItems } from '../../lib/pregnancy'
import { DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, markManyDone, markCatchUpDone, type CareItemWithCustom } from '../../lib/carePlan'

export default function CatchUpScreen() {
  const router = useRouter()
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Already done any of these?</Text>
        <Text style={styles.subtitle}>
          Check off anything you've already had — we'll stop reminding you about those.
        </Text>

        {lmp && eligible.length === 0 ? (
          <Text style={styles.emptyText}>Nothing on your plan yet — we'll bring tests up as they become relevant.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {eligible.map(item => {
              const isSelected = selected.has(item.id)
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.row}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isSelected ? colors.sageDeep : colors.border}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowMeta}>Target dates: {formatDateRange(item.windowStart, item.windowEnd)}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        <TouchableOpacity style={[styles.continueBtn, saving && { opacity: 0.6 }]} onPress={continueOn} disabled={saving}>
          <Text style={styles.continueBtnText}>{selected.size > 0 ? `Continue (${selected.size} marked done)` : 'Continue'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 40 },

  title:    { fontSize: 24, fontWeight: '800', color: colors.textPrimary, lineHeight: 30 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 20 },

  emptyText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19 },

  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm },
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
  rowMeta:  { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  continueBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.lg },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
