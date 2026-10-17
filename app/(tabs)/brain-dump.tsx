import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { BabyMark } from '../../components/illustrations'
import { useAutoScrollEnabled } from '../../lib/useAutoScrollEnabled'
import { useLanguage } from '../../lib/i18n/LanguageProvider'
import {
  type Entry, type EntryKind, type Filter,
  loadEntries, addEntry, toggleDone, removeEntry, clearBrainDumpData,
  groupByDay, formatEntryTime, filterGroupOf,
} from '../../lib/brainDump'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const KIND_ICON: Record<EntryKind, { icon: IoniconsName; color: string; chipBg: string }> = {
  thought: { icon: 'bulb-outline', color: colors.creamDeep, chipBg: colors.cream },
  doctor:  { icon: 'medical-outline', color: colors.lavenderDeep, chipBg: colors.lavender },
}

export default function BrainDumpScreen() {
  const router = useRouter()
  const { t } = useTranslation('brainDump')
  const { isRTL } = useLanguage()
  const KIND_META: Record<EntryKind, { icon: IoniconsName; label: string; color: string; chipBg: string }> = {
    thought: { ...KIND_ICON.thought, label: t('kindThought') },
    doctor: { ...KIND_ICON.doctor, label: t('kindDoctor') },
  }
  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'doctor', label: t('filterDoctor') },
    { key: 'personal', label: t('filterPersonal') },
  ]
  const autoScroll = useAutoScrollEnabled()
  const [entries, setEntries] = useState<Entry[]>([])
  const [text, setText] = useState('')
  const [kind, setKind] = useState<EntryKind>('thought')
  const [filter, setFilter] = useState<Filter>('all')

  useFocusEffect(useCallback(() => { load() }, []))

  async function load() {
    setEntries(await loadEntries())
  }

  async function quickAdd() {
    const trimmed = text.trim()
    if (!trimmed) return
    setEntries(await addEntry(entries, { text: trimmed, kind }))
    setText('')
  }

  async function handleToggleDone(id: string) {
    setEntries(await toggleDone(entries, id))
  }

  function confirmDelete(id: string) {
    const doDelete = async () => setEntries(await removeEntry(entries, id))
    if (Platform.OS === 'web') {
      if (window.confirm(t('deleteEntryTitle'))) doDelete()
      return
    }
    Alert.alert(t('deleteEntryTitle'), '', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: doDelete },
    ])
  }

  function handleMenu() {
    const doClear = async () => { await clearBrainDumpData(); setEntries([]) }
    if (Platform.OS === 'web') {
      if (window.confirm(t('clearAllConfirm'))) doClear()
      return
    }
    Alert.alert(t('menuTitle'), undefined, [
      { text: t('clearAll'), style: 'destructive', onPress: doClear },
      { text: t('cancel'), style: 'cancel' },
    ])
  }

  const counts = {
    all: entries.length,
    doctor: entries.filter(e => e.kind === 'doctor').length,
    personal: entries.filter(e => filterGroupOf(e.kind) === 'personal').length,
  }

  const filtered = entries.filter(e => filter === 'all' || filterGroupOf(e.kind) === filter)
  const sorted = [...filtered].sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt.localeCompare(a.createdAt))
  const groups = groupByDay(sorted)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={autoScroll.scrollEnabled}
        onLayout={autoScroll.onLayout}
        onContentSizeChange={autoScroll.onContentSizeChange}
        keyboardShouldPersistTaps="handled"
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
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroRow}>
          <View style={styles.heroIconChip}>
            <Ionicons name="bulb-outline" size={24} color={colors.lavenderDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{t('heroTitle')}</Text>
            <Text style={styles.heroSub}>{t('heroSub')}</Text>
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={handleMenu} accessibilityLabel={t('moreOptions')}>
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.addCard}>
          <TextInput
            style={[styles.input, isRTL && styles.inputRTL]}
            value={text}
            onChangeText={setText}
            placeholder={t('placeholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <View style={styles.addRow}>
            <View style={styles.typeToggle}>
              {(['thought', 'doctor'] as EntryKind[]).map(k => {
                const meta = KIND_META[k]
                const active = kind === k
                return (
                  <TouchableOpacity
                    key={k}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setKind(k)}
                  >
                    <Ionicons name={meta.icon} size={14} color={active ? '#fff' : colors.textSecondary} />
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{meta.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <TouchableOpacity
              style={[styles.addBtn, !text.trim() && styles.addBtnDisabled, isRTL && styles.addBtnRTL]}
              onPress={quickAdd}
              disabled={!text.trim()}
              accessibilityLabel={t('addEntry')}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterTabs}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
                {f.label} ({counts[f.key]})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {groups.length === 0 ? (
          <Text style={styles.emptyText}>
            {entries.length === 0 ? t('emptyNoEntries') : t('emptyNoMatch')}
          </Text>
        ) : (
          groups.map(group => (
            <View key={group.label} style={styles.section}>
              <Text style={styles.sectionLabel}>{group.label}</Text>
              {group.items.map(item => (
                <Row
                  key={item.id}
                  item={item}
                  meta={KIND_META[item.kind]}
                  onPress={() => router.push({ pathname: '/edit-brain-dump', params: { id: item.id } })}
                  onToggleDone={() => handleToggleDone(item.id)}
                  onDelete={() => confirmDelete(item.id)}
                />
              ))}
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ item, meta, onPress, onToggleDone, onDelete }: {
  item: Entry
  meta: { icon: IoniconsName; label: string; color: string; chipBg: string }
  onPress: () => void
  onToggleDone: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation('brainDump')
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.rowIconChip, { backgroundColor: meta.chipBg }]}
        onPress={onToggleDone}
        hitSlop={4}
        accessibilityLabel={item.done ? t('markNotDone') : t('markDone')}
      >
        <Ionicons
          name={item.done ? 'checkmark-circle' : meta.icon}
          size={18}
          color={item.done ? colors.sageDeep : meta.color}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.rowBody} onPress={onPress} activeOpacity={0.7}>
        <Text style={[styles.rowTitle, item.done && styles.rowTitleDone]} numberOfLines={1}>{item.text}</Text>
        {!!item.details && (
          <Text style={styles.rowDetail} numberOfLines={2}>{item.details}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.rowTrailing}>
        <Text style={styles.rowTime}>{formatEntryTime(item.createdAt)}</Text>
        <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.rowMenuBtn} accessibilityLabel={t('deleteEntry')}>
          <Ionicons name="ellipsis-vertical" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
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

  heroRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  heroIconChip: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  heroTitle:    { fontFamily: fonts.headline, fontSize: 19, color: colors.textPrimary },
  heroSub:      { fontSize: 12.5, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },
  menuBtn:      { width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.neutralChip, alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  addCard: { backgroundColor: colors.lavender, borderRadius: radius.xl, padding: spacing.sm, marginBottom: spacing.md },
  input:   { fontSize: 15, color: colors.textPrimary, minHeight: 44, textAlignVertical: 'top', marginBottom: spacing.sm, textAlign: 'left' },
  inputRTL: { textAlign: 'right' },
  addRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  typeToggle:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card },
  typeChipActive:  { backgroundColor: colors.primary },
  typeChipText:    { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },

  addBtn:         { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs },
  addBtnRTL:      { marginLeft: 0, marginRight: spacing.xs },
  addBtnDisabled: { opacity: 0.4 },

  filterTabs: { flexDirection: 'row', gap: 6, marginBottom: spacing.md },
  filterTab:       { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.neutralChip },
  filterTabActive: { backgroundColor: colors.lavender },
  filterTabText:       { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  filterTabTextActive: { color: colors.lavenderDeep },

  emptyText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19, marginTop: spacing.sm },

  section:      { marginBottom: spacing.md },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },

  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  rowIconChip: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  rowBody:  { flex: 1 },
  rowTitle: { fontSize: 14.5, fontWeight: '700', color: colors.textPrimary, lineHeight: 19 },
  rowTitleDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  rowDetail: { fontSize: 12.5, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },

  rowTrailing: { alignItems: 'flex-end', gap: 18 },
  rowTime:     { fontSize: 11, color: colors.textSecondary },
  rowMenuBtn:  { padding: 2 },
})
