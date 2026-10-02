import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { BabyMark } from '../../components/illustrations'
import { useAutoScrollEnabled } from '../../lib/useAutoScrollEnabled'
import {
  type Entry, type EntryCategory,
  loadEntries, toggleDone, removeEntry, clearBrainDumpData,
  groupByDay, formatEntryTime,
} from '../../lib/brainDump'

type Filter = 'all' | EntryCategory

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'doctor', label: 'For doctor' },
  { key: 'personal', label: 'Personal' },
]

export default function BrainDumpScreen() {
  const router = useRouter()
  const autoScroll = useAutoScrollEnabled()
  const [entries, setEntries] = useState<Entry[]>([])
  const [text, setText] = useState('')
  const [category, setCategory] = useState<EntryCategory>('personal')
  const [filter, setFilter] = useState<Filter>('all')
  const [tagFilterOpen, setTagFilterOpen] = useState(false)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  useFocusEffect(useCallback(() => { load() }, []))

  async function load() {
    setEntries(await loadEntries())
  }

  async function handleToggleDone(id: string) {
    setEntries(await toggleDone(entries, id))
  }

  function confirmDelete(id: string) {
    const doDelete = async () => setEntries(await removeEntry(entries, id))
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this entry?')) doDelete()
      return
    }
    Alert.alert('Delete entry?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ])
  }

  function handleMenu() {
    const doClear = async () => { await clearBrainDumpData(); setEntries([]) }
    if (Platform.OS === 'web') {
      if (window.confirm('Clear all brain dump entries?')) doClear()
      return
    }
    Alert.alert('Brain dump', undefined, [
      { text: 'Clear all entries', style: 'destructive', onPress: doClear },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const allTags = useMemo(() => {
    const set = new Set<string>()
    entries.forEach(e => e.tags.forEach(t => set.add(t)))
    return Array.from(set)
  }, [entries])

  const filtered = entries
    .filter(e => filter === 'all' || e.category === filter)
    .filter(e => !activeTag || e.tags.includes(activeTag))
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
            <Text style={styles.title}>Brain dump</Text>
            <Text style={styles.subtitle}>Get it out of your head — we'll help you organize it later.</Text>
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={handleMenu} accessibilityLabel="More options">
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.addCard}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <View style={styles.addRow}>
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeChip, category === 'personal' && styles.typeChipActive]}
                onPress={() => setCategory('personal')}
              >
                <Ionicons name="bulb-outline" size={14} color={category === 'personal' ? '#fff' : colors.textSecondary} />
                <Text style={[styles.typeChipText, category === 'personal' && styles.typeChipTextActive]}>Thought</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeChip, category === 'doctor' && styles.typeChipActive]}
                onPress={() => setCategory('doctor')}
              >
                <Ionicons name="medical-outline" size={14} color={category === 'doctor' ? '#fff' : colors.textSecondary} />
                <Text style={[styles.typeChipText, category === 'doctor' && styles.typeChipTextActive]}>Ask doctor</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.addBtn, !text.trim() && styles.addBtnDisabled]}
              onPress={() => {
                router.push({ pathname: '/add-brain-dump', params: { text, category } })
                setText('')
              }}
              disabled={!text.trim()}
              accessibilityLabel="Add entry with more details"
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterTabs}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {allTags.length > 0 && (
            <TouchableOpacity
              style={[styles.filterIconBtn, tagFilterOpen && styles.filterIconBtnActive]}
              onPress={() => setTagFilterOpen(v => !v)}
              accessibilityLabel="Filter by tag"
            >
              <Ionicons name="options-outline" size={17} color={tagFilterOpen ? '#fff' : colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>

        {tagFilterOpen && allTags.length > 0 && (
          <View style={styles.tagFilterRow}>
            {allTags.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, activeTag === tag && styles.tagChipActive]}
                onPress={() => setActiveTag(t => t === tag ? null : tag)}
              >
                <Text style={[styles.tagChipText, activeTag === tag && styles.tagChipTextActive]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {groups.length === 0 ? (
          <Text style={styles.emptyText}>
            {entries.length === 0
              ? 'Anything on your mind — jot it down above and come back to it later.'
              : 'Nothing matches this filter.'}
          </Text>
        ) : (
          groups.map(group => (
            <View key={group.label} style={styles.section}>
              <Text style={styles.sectionLabel}>{group.label}</Text>
              <View style={styles.listCard}>
                {group.items.map((item, i) => (
                  <Row
                    key={item.id}
                    item={item}
                    divider={i > 0}
                    onToggleDone={() => handleToggleDone(item.id)}
                    onDelete={() => confirmDelete(item.id)}
                  />
                ))}
              </View>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ item, divider, onToggleDone, onDelete }: {
  item: Entry
  divider: boolean
  onToggleDone: () => void
  onDelete: () => void
}) {
  return (
    <View style={[styles.row, divider && styles.rowDivider]}>
      <TouchableOpacity
        style={[styles.rowIconChip, item.category === 'doctor' ? styles.rowIconChipDoctor : styles.rowIconChipPersonal]}
        onPress={onToggleDone}
        hitSlop={4}
        accessibilityLabel={item.done ? 'Mark not done' : 'Mark done'}
      >
        <Ionicons
          name={item.done ? 'checkmark-circle' : item.category === 'doctor' ? 'medical-outline' : 'bulb-outline'}
          size={17}
          color={item.done ? colors.sageDeep : item.category === 'doctor' ? colors.lavenderDeep : colors.creamDeep}
        />
      </TouchableOpacity>

      <View style={styles.rowBody}>
        <Text style={[styles.rowText, item.done && styles.rowTextDone]}>{item.text}</Text>
        <View style={styles.rowMetaRow}>
          <View style={[styles.categoryPill, item.category === 'doctor' ? styles.categoryPillDoctor : styles.categoryPillPersonal]}>
            <Text style={[styles.categoryPillText, item.category === 'doctor' ? styles.categoryPillTextDoctor : styles.categoryPillTextPersonal]}>
              {item.category === 'doctor' ? 'For doctor' : 'Personal'}
            </Text>
          </View>
          <Text style={styles.rowTime}>{formatEntryTime(item.createdAt)}</Text>
        </View>
      </View>

      <TouchableOpacity onPress={onDelete} hitSlop={6} accessibilityLabel="Delete entry">
        <Ionicons name="ellipsis-horizontal" size={17} color={colors.textSecondary} />
      </TouchableOpacity>
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

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  title:    { fontFamily: fonts.headline, fontSize: 26, color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
  menuBtn:  { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.neutralChip, alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  addCard: { backgroundColor: colors.lavender, borderRadius: radius.xl, padding: spacing.sm, marginBottom: spacing.md },
  input:   { fontSize: 15, color: colors.textPrimary, minHeight: 44, textAlignVertical: 'top', marginBottom: spacing.sm },
  addRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  typeToggle:      { flexDirection: 'row', gap: 8, flex: 1 },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card },
  typeChipActive:  { backgroundColor: colors.primary },
  typeChipText:    { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },

  addBtn:         { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs },
  addBtnDisabled: { opacity: 0.4 },

  filterRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  filterTabs: { flexDirection: 'row', gap: 6, flex: 1 },
  filterTab:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.neutralChip },
  filterTabActive: { backgroundColor: colors.primary },
  filterTabText:       { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
  filterTabTextActive: { color: '#fff' },
  filterIconBtn:       { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.neutralChip, alignItems: 'center', justifyContent: 'center' },
  filterIconBtnActive: { backgroundColor: colors.textPrimary },

  tagFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  tagChip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tagChipActive:  { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  tagChipText:        { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  tagChipTextActive:  { color: '#fff' },

  emptyText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19, marginTop: spacing.sm },

  section:      { marginBottom: spacing.lg },
  sectionLabel: { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary, marginBottom: spacing.xs },

  listCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.sm },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },

  rowIconChip:        { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  rowIconChipPersonal: { backgroundColor: colors.cream },
  rowIconChipDoctor:   { backgroundColor: colors.lavender },

  rowBody: { flex: 1 },
  rowText: { fontSize: 14.5, color: colors.textPrimary, lineHeight: 20 },
  rowTextDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  rowTime: { fontSize: 11.5, color: colors.textSecondary },

  categoryPill:        { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  categoryPillPersonal: { backgroundColor: colors.cream },
  categoryPillDoctor:   { backgroundColor: colors.lavender },
  categoryPillText:     { fontSize: 10.5, fontWeight: '700' },
  categoryPillTextPersonal: { color: colors.creamDeep },
  categoryPillTextDoctor:   { color: colors.lavenderDeep },
})
