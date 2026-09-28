import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, radius, fonts } from '../lib/theme'

const STORAGE_KEY = 'bumpling_brain_dump'

export async function clearBrainDumpData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}

type EntryType = 'doctor' | 'thought'

type Entry = {
  id: string
  text: string
  type: EntryType
  done: boolean
  createdAt: string
}

export default function BrainDumpScreen() {
  const router = useRouter()
  const [entries, setEntries] = useState<Entry[]>([])
  const [text, setText] = useState('')
  const [type, setType] = useState<EntryType>('thought')

  useFocusEffect(useCallback(() => { load() }, []))

  async function load() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    setEntries(raw ? JSON.parse(raw) : [])
  }

  async function persist(next: Entry[]) {
    setEntries(next)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function add() {
    const trimmed = text.trim()
    if (!trimmed) return
    const entry: Entry = { id: Date.now().toString(), text: trimmed, type, done: false, createdAt: new Date().toISOString() }
    persist([entry, ...entries])
    setText('')
  }

  function toggleDone(id: string) {
    persist(entries.map(e => e.id === id ? { ...e, done: !e.done } : e))
  }

  function remove(id: string) {
    persist(entries.filter(e => e.id !== id))
  }

  const doctorItems = entries.filter(e => e.type === 'doctor').sort((a, b) => Number(a.done) - Number(b.done))
  const thoughtItems = entries.filter(e => e.type === 'thought').sort((a, b) => Number(a.done) - Number(b.done))

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Brain dump</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.heroRow}>
            <View style={styles.heroIconChip}>
              <Ionicons name="bulb-outline" size={20} color={colors.lavenderDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Get it out of your head</Text>
              <Text style={styles.heroSub}>Sort it out later.</Text>
            </View>
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
                  style={[styles.typeChip, type === 'thought' && styles.typeChipActive]}
                  onPress={() => setType('thought')}
                >
                  <Ionicons name="bulb-outline" size={14} color={type === 'thought' ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.typeChipText, type === 'thought' && styles.typeChipTextActive]}>Thought</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeChip, type === 'doctor' && styles.typeChipActive]}
                  onPress={() => setType('doctor')}
                >
                  <Ionicons name="medical-outline" size={14} color={type === 'doctor' ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.typeChipText, type === 'doctor' && styles.typeChipTextActive]}>Ask doctor</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.addBtn, !text.trim() && styles.addBtnDisabled]}
                onPress={add}
                disabled={!text.trim()}
                accessibilityLabel="Add entry"
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <Section title="For your doctor" items={doctorItems} onToggle={toggleDone} onDelete={remove} emptyText="Questions you want to ask at your next visit will show up here." />
          <Section title="Other thoughts" items={thoughtItems} onToggle={toggleDone} onDelete={remove} emptyText="Anything else on your mind — jot it down above." />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Section({ title, items, onToggle, onDelete, emptyText }: {
  title: string
  items: Entry[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  emptyText: string
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        <View style={styles.listCard}>
          {items.map((item, i) => (
            <View key={item.id} style={[styles.row, i > 0 && styles.rowDivider]}>
              <TouchableOpacity onPress={() => onToggle(item.id)} hitSlop={6} accessibilityLabel={item.done ? 'Mark not done' : 'Mark done'}>
                <Ionicons
                  name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={item.done ? colors.sageDeep : colors.border}
                />
              </TouchableOpacity>
              <Text style={[styles.rowText, item.done && styles.rowTextDone]}>{item.text}</Text>
              <TouchableOpacity onPress={() => onDelete(item.id)} hitSlop={6} accessibilityLabel="Delete entry">
                <Ionicons name="trash-outline" size={17} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56 },

  heroRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  heroIconChip: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  heroTitle:    { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary },
  heroSub:      { fontSize: 12.5, color: colors.textSecondary, marginTop: 1 },

  addCard: { backgroundColor: colors.lavender, borderRadius: radius.xl, padding: spacing.sm, marginBottom: spacing.lg },
  input:   { fontSize: 15, color: colors.textPrimary, minHeight: 44, textAlignVertical: 'top', marginBottom: spacing.sm },
  addRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  typeToggle:      { flexDirection: 'row', gap: 8, flex: 1 },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card },
  typeChipActive:  { backgroundColor: colors.primary },
  typeChipText:    { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },

  addBtn:         { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs },
  addBtnDisabled: { opacity: 0.4 },

  section:      { marginBottom: spacing.lg },
  sectionLabel: { fontFamily: fonts.headline, fontSize: 16, color: colors.textPrimary, marginBottom: spacing.xs },
  emptyText:    { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  listCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.sm },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowText:  { flex: 1, fontSize: 14.5, color: colors.textPrimary, lineHeight: 20 },
  rowTextDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
})
