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

const KIND_ICON: Record<EntryKind, { icon: IoniconsName; color: string }> = {
  thought: { icon: 'bulb-outline', color: colors.creamDeep },
  doctor: { icon: 'medical-outline', color: colors.lavenderDeep },
}

export default function BrainDumpScreen() {
  const router = useRouter()
  const { t } = useTranslation('brainDump')
  const { isRTL } = useLanguage()
  const KIND_META: Record<EntryKind, { icon: IoniconsName; color: string; label: string }> = {
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
      <View style={styles.blobTopRight} pointerEvents="none" />
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
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('heroTitle')}</Text>
            <Text style={styles.subtitle}>{t('heroSub')}</Text>
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={handleMenu} accessibilityLabel={t('moreOptions')} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.composer}>
          <TextInput
            style={[styles.input, isRTL && styles.inputRTL]}
            value={text}
            onChangeText={setText}
            placeholder={t('placeholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <View style={styles.composerRow}>
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
                    <Ionicons name={meta.icon} size={13} color={active ? '#fff' : colors.textSecondary} />
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

        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} hitSlop={6}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
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
              <View style={styles.list}>
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
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ item, meta, onPress, onToggleDone, onDelete }: {
  item: Entry
  meta: { icon: IoniconsName; color: string; label: string }
  onPress: () => void
  onToggleDone: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation('brainDump')
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.checkbox, item.done && styles.checkboxChecked]}
        onPress={onToggleDone}
        hitSlop={6}
        accessibilityLabel={item.done ? t('markNotDone') : t('markDone')}
      >
        {item.done && <Ionicons name="checkmark" size={12} color="#fff" />}
      </TouchableOpacity>

      <Ionicons name={meta.icon} size={15} color={item.done ? colors.textSecondary : meta.color} />

      <TouchableOpacity style={styles.rowBody} onPress={onPress} activeOpacity={0.6}>
        <Text style={[styles.rowTitle, item.done && styles.rowTitleDone]} numberOfLines={1}>{item.text}</Text>
        {!!item.details && (
          <Text style={styles.rowDetail} numberOfLines={1}>{item.details}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.rowTrailing}>
        <Text style={styles.rowMeta}>{formatEntryTime(item.createdAt)}</Text>
        <TouchableOpacity onPress={onDelete} hitSlop={8} accessibilityLabel={t('deleteEntry')}>
          <Ionicons name="ellipsis-horizontal" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background, position: 'relative', overflow: 'hidden' },

  // Same soft-corner-wash technique as the desktop web preview frame, scaled
  // down for the screen itself — one touch of color on an otherwise flat
  // page. Top-right only: a matching bottom-left blob sits right where the
  // floating tab bar's own rounded shapes are, on a different layer outside
  // this screen's container — at any screen height short enough to show it
  // at all, it reads as a rendering glitch poking out from behind the tab
  // bar rather than a deliberate corner wash, so it's not worth the risk.
  blobTopRight: { position: 'absolute', top: -170, right: -150, width: 360, height: 360, borderRadius: 180, backgroundColor: colors.peach, opacity: 0.4 },
  scroll: { paddingHorizontal: spacing.md, paddingTop: 28, paddingBottom: 56 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  appName:    { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  profileBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  title:    { fontFamily: fonts.headline, fontSize: 21, color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
  menuBtn:  { padding: 4, marginTop: 2 },

  composer: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm, marginBottom: spacing.md },
  input:    { fontSize: 15, color: colors.textPrimary, minHeight: 40, textAlignVertical: 'top', marginBottom: spacing.sm, textAlign: 'left' },
  inputRTL: { textAlign: 'right' },
  composerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  typeToggle:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  typeChipActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText:    { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },

  addBtn:         { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs },
  addBtnRTL:      { marginLeft: 0, marginRight: spacing.xs },
  addBtnDisabled: { opacity: 0.35 },

  filterRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  filterText:       { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: colors.textPrimary },

  emptyText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19, marginTop: spacing.sm },

  section:      { marginBottom: spacing.md },
  sectionLabel: { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  list:         { borderTopWidth: 1, borderTopColor: colors.border },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  checkbox:        { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },

  rowBody:  { flex: 1 },
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
  rowTitleDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  rowDetail: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },

  rowTrailing: { alignItems: 'flex-end', gap: 8 },
  rowMeta:     { fontSize: 11, color: colors.textSecondary },
})
