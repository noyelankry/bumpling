import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { formatDateRange } from '../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, computeCareItems, markManyDone, markManySkipped, getItemTitle, currentRole, type CareItemWithCustom } from '../lib/carePlan'
import { goBack } from '../lib/navigation'
import { useDirectionalIcon } from '../lib/i18n/useDirectionalIcon'

export default function CatchUpReviewScreen() {
  const router = useRouter()
  const { t } = useTranslation('catchUpReview')
  const { t: tCommon } = useTranslation('common')
  const { back: backIcon } = useDirectionalIcon()
  const back = () => goBack(router, '/(tabs)/plan')
  const [items, setItems] = useState<CareItemWithCustom[]>(DEFAULT_CARE_ITEMS)
  const [lmp, setLmp] = useState<Date>(TODAY)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  // Avoids flashing "All caught up" (DEFAULT_CARE_ITEMS has nothing missed)
  // before the real, possibly non-empty missed list loads.
  const [loaded, setLoaded] = useState(false)

  useFocusEffect(useCallback(() => {
    Promise.all([loadCareItems(), loadLMP()]).then(([careItems, lmpDate]) => {
      setItems(careItems)
      setLmp(lmpDate)
      setLoaded(true)
    })
    setSelected(new Set())
    // Defense in depth — Plan already hides the entry point into this
    // write-only screen for a partner, this just covers reaching it directly.
    currentRole().then(role => { if (role === 'partner') router.replace('/(tabs)/plan') })
  }, []))

  const computed = useMemo(() => computeCareItems(items, lmp, TODAY), [items, lmp])
  const missed = useMemo(() => computed.filter(i => i.status === 'missed'), [computed])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Resolves every item on the list in one tap: checked ones are done,
  // everything left unchecked is treated as skipped rather than left to
  // linger — the whole point is to clear the backlog, not relocate it.
  async function handleSave() {
    setSaving(true)
    const current = await loadCareItems()
    const doneIds = Array.from(selected)
    const skipIds = missed.filter(i => !selected.has(i.id)).map(i => i.id)
    let next = current
    if (doneIds.length > 0) next = await markManyDone(next, doneIds)
    if (skipIds.length > 0) next = await markManySkipped(next, skipIds)
    setItems(next)
    setSaving(false)
    back()
  }

  const allSelected = missed.length > 0 && selected.size === missed.length
  const saveLabel = selected.size === 0 ? t('skipAll') : allSelected ? t('markAllDone') : t('save')

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={back} hitSlop={8} accessibilityLabel={tCommon('back')}>
          <Ionicons name={backIcon} size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>

        {!loaded ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : missed.length === 0 ? (
          <Text style={styles.emptyText}>{t('allCaughtUp')}</Text>
        ) : (
          <>
            <View style={styles.listCard}>
              {missed.map((item, i) => {
                const isSelected = selected.has(item.id)
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.row, i > 0 && styles.rowDivider, isSelected && styles.rowChecked]}
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{getItemTitle(item)}</Text>
                      <Text style={[styles.rowMeta, isSelected && styles.rowMetaChecked]}>
                        {t('targetDates', { range: formatDateRange(item.windowStart, item.windowEnd) })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={styles.disclaimer}>
              <Ionicons name="information-circle" size={16} color={colors.textSecondary} />
              <Text style={styles.disclaimerText}>{t('canUpdateAnytime')}</Text>
            </View>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saveLabel}</Text>
            </TouchableOpacity>
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
  subtitle:  { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.md },
  emptyText: { fontSize: 13.5, color: colors.textSecondary, marginTop: spacing.md },
  loadingState: { paddingVertical: spacing.lg * 2, alignItems: 'center' },

  listCard:     { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, overflow: 'hidden' },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.sm },
  rowDivider:   { borderTopWidth: 1, borderTopColor: colors.border },
  rowChecked:   { backgroundColor: colors.peach },
  checkbox:        { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
  rowMeta:  { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowMetaChecked: { textDecorationLine: 'line-through' },

  disclaimer:     { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
  disclaimerText: { flex: 1, fontSize: 12.5, color: colors.textSecondary },

  saveBtn:     { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
