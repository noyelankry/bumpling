import { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Platform, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import { colors, spacing, radius } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────────────────────

type FoodLog = {
  id: string
  meal_block: MealBlock
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

type GoalProfile = {
  calories_limit: number
  protein_target: number
  carbs_limit: number | null
  fat_limit: number | null
  fiber_target: number
}

type MealBlock = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

type MacroForm = {
  food_name: string
  calories: string
  protein_g: string
  carbs_g: string
  fat_g: string
  fiber_g: string
}

type SearchResult = {
  id: string
  name: string
  brand: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export type CoffeeConfig = {
  enabled: boolean
  name: string
  calories: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_BLOCKS: { key: MealBlock; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'lunch',     label: 'Lunch',     icon: 'partly-sunny-outline' },
  { key: 'dinner',    label: 'Dinner',    icon: 'moon-outline' },
  { key: 'snacks',    label: 'Snacks',    icon: 'nutrition-outline' },
]

const EMPTY_FORM: MacroForm = {
  food_name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '',
}

export const COFFEE_KEY = 'bumpling_coffee'
export const DEFAULT_COFFEE: CoffeeConfig = { enabled: false, name: 'Coffee', calories: 5 }
const waterKey = (d: string) => `bumpling_water_${d}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toISO(d: Date) {
  return d.toISOString().split('T')[0]
}

function formatDateLabel(d: Date) {
  const today     = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  const mmdd = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (toISO(d) === toISO(today))     return `Today, ${mmdd}`
  if (toISO(d) === toISO(yesterday)) return `Yesterday, ${mmdd}`
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function calcCalories(p: string, c: string, f: string) {
  return Math.round((parseFloat(p) || 0) * 4 + (parseFloat(c) || 0) * 4 + (parseFloat(f) || 0) * 9)
}

function sumLogs(logs: FoodLog[]) {
  return logs.reduce(
    (acc, l) => ({
      calories:  acc.calories  + l.calories,
      protein_g: acc.protein_g + l.protein_g,
      carbs_g:   acc.carbs_g   + l.carbs_g,
      fat_g:     acc.fat_g     + l.fat_g,
      fiber_g:   acc.fiber_g   + l.fiber_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  )
}

async function searchOpenFoodFacts(query: string): Promise<SearchResult[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=15&fields=id,product_name,brands,nutriments`
  const res  = await fetch(url)
  const json = await res.json()
  return (json.products ?? [])
    .filter((p: any) => p.product_name)
    .map((p: any): SearchResult => ({
      id:       p.id ?? Math.random().toString(),
      name:     p.product_name,
      brand:    p.brands ?? '',
      calories: Math.round(p.nutriments?.['energy-kcal_100g'] ?? 0),
      protein:  Math.round((p.nutriments?.['proteins_100g']       ?? 0) * 10) / 10,
      carbs:    Math.round((p.nutriments?.['carbohydrates_100g']  ?? 0) * 10) / 10,
      fat:      Math.round((p.nutriments?.['fat_100g']            ?? 0) * 10) / 10,
      fiber:    Math.round((p.nutriments?.['fiber_100g']          ?? 0) * 10) / 10,
    }))
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function DailySummary({ totals, goal, waterCount }: {
  totals: ReturnType<typeof sumLogs>
  goal: GoalProfile | null
  waterCount: number
}) {
  const calorieLimit  = goal?.calories_limit ?? 2000
  const proteinTarget = goal?.protein_target ?? 130
  const carbsLimit    = goal?.carbs_limit    ?? 200
  const fatLimit      = goal?.fat_limit      ?? 60
  const fiberTarget   = goal?.fiber_target   ?? 25
  const remaining     = Math.max(calorieLimit - totals.calories, 0)
  const over          = totals.calories > calorieLimit

  function MacroCol({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
    const pct   = Math.min(value / Math.max(target, 1), 1)
    const isOver = value > target
    return (
      <View style={sc.col}>
        <Text style={sc.colLabel}>{label}</Text>
        <Text style={[sc.colVal, isOver && { color: '#EF4444' }]}>{Math.round(value)}</Text>
        <Text style={sc.colTarget}>/ {target}g</Text>
        <View style={sc.track}>
          <View style={[sc.fill, { width: `${pct * 100}%`, backgroundColor: isOver ? '#EF4444' : color }]} />
        </View>
      </View>
    )
  }

  function BottomStat({ icon, label, value, target, color }: {
    icon: React.ComponentProps<typeof Ionicons>['name']
    label: string; value: string; target: string; color: string
  }) {
    return (
      <View style={sc.stat}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={sc.statLabel}>{label}</Text>
        <Text style={sc.statVal}>{value}</Text>
        <Text style={sc.statTarget}>/ {target}</Text>
      </View>
    )
  }

  return (
    <View style={sc.card}>
      {/* Top row: ring + macros */}
      <View style={sc.top}>
        {/* Calorie ring */}
        <View style={sc.ringWrap}>
          <View style={[sc.ring, { borderColor: over ? '#EF4444' : colors.primary }]}>
            <Text style={[sc.ringNum, { color: over ? '#EF4444' : colors.primary }]}>
              {Math.round(totals.calories)}
            </Text>
            <Text style={sc.ringDenom}>/ {calorieLimit}</Text>
            <Text style={sc.ringUnit}>kcal</Text>
          </View>
          <Text style={sc.ringLeft}>{remaining} left</Text>
        </View>

        {/* Macro columns */}
        <View style={sc.cols}>
          <MacroCol label="Protein" value={totals.protein_g} target={proteinTarget} color={colors.protein} />
          <MacroCol label="Carbs"   value={totals.carbs_g}   target={carbsLimit}    color={colors.carbs} />
          <MacroCol label="Fat"     value={totals.fat_g}     target={fatLimit}      color={colors.fat} />
        </View>
      </View>

      {/* Divider */}
      <View style={sc.divider} />

      {/* Bottom row: fiber / steps / water */}
      <View style={sc.bottom}>
        <BottomStat icon="leaf-outline"      label="Fiber" value={`${Math.round(totals.fiber_g)}g`} target={`${fiberTarget}g`} color={colors.fiber} />
        <View style={sc.sep} />
        <BottomStat icon="footsteps-outline" label="Steps" value="—"                                target="10,000"           color={colors.primary} />
        <View style={sc.sep} />
        <BottomStat icon="water-outline"     label="Water" value={`${waterCount}`}                  target="8 cups"           color="#60A5FA" />
      </View>
    </View>
  )
}

const sc = StyleSheet.create({
  card:      { backgroundColor: colors.card, borderRadius: radius.lg, marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm },
  top:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  ringWrap:  { alignItems: 'center' },
  ring:      { width: 84, height: 84, borderRadius: 42, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  ringNum:   { fontSize: 18, fontWeight: '800' },
  ringDenom: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  ringUnit:  { fontSize: 10, color: colors.textSecondary },
  ringLeft:  { fontSize: 11, color: colors.textSecondary, marginTop: 6, fontWeight: '500' },

  cols:      { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  col:       { alignItems: 'center', gap: 1, flex: 1 },
  colLabel:  { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  colVal:    { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  colTarget: { fontSize: 10, color: colors.textSecondary },
  track:     { height: 4, width: '80%', backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden', marginTop: 3 },
  fill:      { height: '100%', borderRadius: 2 },

  divider:   { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  bottom:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  stat:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  statVal:   { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  statTarget:{ fontSize: 11, color: colors.textSecondary },
  sep:       { width: 1, height: 20, backgroundColor: colors.border },
})

// ─── Tracker cards (coffee / water) ──────────────────────────────────────────

function TrackerCard({ icon, iconColor, name, subtitle, count, onIncrement, onDecrement }: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  iconColor: string
  name: string
  subtitle: string
  count: number
  onIncrement: () => void
  onDecrement: () => void
}) {
  return (
    <View style={tc.card}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <View style={tc.info}>
        <Text style={tc.name} numberOfLines={1}>{name}</Text>
        <Text style={tc.sub} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={tc.counter}>
        <TouchableOpacity onPress={onDecrement} disabled={count === 0} hitSlop={8}>
          <Ionicons name="remove-circle-outline" size={26} color={count === 0 ? colors.border : iconColor} />
        </TouchableOpacity>
        <Text style={tc.count}>{count}</Text>
        <TouchableOpacity onPress={onIncrement} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={26} color={iconColor} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const tc = StyleSheet.create({
  card:    { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 12 },
  info:    { flex: 1 },
  name:    { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  sub:     { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count:   { fontSize: 17, fontWeight: '800', color: colors.textPrimary, minWidth: 22, textAlign: 'center' },
})

// ─── Meal block cards ─────────────────────────────────────────────────────────

function FoodItem({ item, onDelete }: { item: FoodLog; onDelete: () => void }) {
  return (
    <View style={food.row}>
      <View style={food.info}>
        <Text style={food.name}>{item.food_name}</Text>
        <Text style={food.macros}>
          {item.calories} kcal
          {item.protein_g > 0 ? `  ·  ${item.protein_g}g P` : ''}
          {item.carbs_g   > 0 ? `  ·  ${item.carbs_g}g C`   : ''}
          {item.fat_g     > 0 ? `  ·  ${item.fat_g}g F`     : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={12}>
        <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  )
}

function MealBlockCard({ block, logs, expanded, onToggle, onAdd, onDelete }: {
  block: typeof MEAL_BLOCKS[number]
  logs: FoodLog[]
  expanded: boolean
  onToggle: () => void
  onAdd: () => void
  onDelete: (id: string) => void
}) {
  const total = logs.reduce((s, l) => s + l.calories, 0)
  return (
    <View style={mbc.container}>
      <TouchableOpacity style={mbc.header} onPress={onToggle} activeOpacity={0.7}>
        <View style={mbc.headerLeft}>
          <View style={mbc.iconWrap}>
            <Ionicons name={block.icon} size={16} color={colors.primary} />
          </View>
          <Text style={mbc.title}>{block.label}</Text>
          <Text style={mbc.kcal}>{total > 0 ? `${total} kcal` : '0 kcal'}</Text>
        </View>
        <View style={mbc.headerRight}>
          <TouchableOpacity style={mbc.addBtn} onPress={onAdd} hitSlop={4}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18} color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        logs.length === 0 ? (
          <Text style={mbc.empty}>Nothing logged yet</Text>
        ) : (
          logs.map(item => (
            <FoodItem key={item.id} item={item} onDelete={() => onDelete(item.id)} />
          ))
        )
      )}
    </View>
  )
}

const food = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  info:   { flex: 1 },
  name:   { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  macros: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
})

const mbc = StyleSheet.create({
  container:   { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap:    { width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  kcal:        { fontSize: 12, color: colors.textSecondary },
  addBtn:      { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  empty:       { fontSize: 13, color: colors.textSecondary, paddingTop: 8, paddingBottom: 2 },
})

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DiaryScreen() {
  const [date, setDate]                   = useState(new Date())
  const [logs, setLogs]                   = useState<FoodLog[]>([])
  const [goal, setGoal]                   = useState<GoalProfile | null>(null)
  const [coffeeConfig, setCoffeeConfig]   = useState<CoffeeConfig>(DEFAULT_COFFEE)
  const [waterCount, setWaterCount]       = useState(0)
  const [loadingLogs, setLoadingLogs]     = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<MealBlock>>(
    new Set(['breakfast', 'lunch', 'dinner', 'snacks'])
  )

  // Add-food modal
  const [modalBlock, setModalBlock]   = useState<MealBlock | null>(null)
  const [modalTab, setModalTab]       = useState<'search' | 'ai' | 'manual'>('search')
  const [form, setForm]               = useState<MacroForm>(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching]     = useState(false)
  const [aiText, setAiText]           = useState('')
  const [parsing, setParsing]         = useState(false)

  useFocusEffect(useCallback(() => { loadAll() }, []))

  async function loadAll() {
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) return
    const userId   = data.claims.sub
    const dateStr  = toISO(date)

    const [goalRes, logsRes, coffeeRaw, waterRaw] = await Promise.all([
      supabase.from('goal_profiles').select('*').eq('user_id', userId).eq('is_active', true).single(),
      supabase.from('food_logs').select('*').eq('user_id', userId).eq('logged_date', dateStr).order('created_at'),
      AsyncStorage.getItem(COFFEE_KEY),
      AsyncStorage.getItem(waterKey(dateStr)),
    ])

    if (goalRes.data)  setGoal(goalRes.data)
    if (logsRes.data)  setLogs(logsRes.data)
    if (coffeeRaw)     setCoffeeConfig(JSON.parse(coffeeRaw))
    setWaterCount(waterRaw ? Number(waterRaw) : 0)
    setLoadingLogs(false)
  }

  async function fetchLogs(d: Date) {
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) return
    const { data: rows } = await supabase
      .from('food_logs').select('*')
      .eq('user_id', data.claims.sub)
      .eq('logged_date', toISO(d))
      .order('created_at')
    if (rows) setLogs(rows)
  }

  async function fetchWater(d: Date) {
    const raw = await AsyncStorage.getItem(waterKey(toISO(d)))
    setWaterCount(raw ? Number(raw) : 0)
  }

  function changeDate(delta: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    if (toISO(d) > toISO(new Date())) return
    setDate(d)
    setLogs([])
    fetchLogs(d)
    fetchWater(d)
  }

  function toggleDatePicker() {
    setShowDatePicker(v => !v)
  }

  function onDatePickerChange(_: any, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false)
    if (!selected || toISO(selected) > toISO(new Date())) return
    setDate(selected)
    setLogs([])
    fetchLogs(selected)
    fetchWater(selected)
  }

  function toggleBlock(key: MealBlock) {
    setExpandedBlocks(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function openAdd(block: MealBlock, tab: 'search' | 'ai' | 'manual' = 'search') {
    setModalBlock(block)
    setForm(EMPTY_FORM)
    setAiText('')
    setSearchQuery('')
    setSearchResults([])
    setModalTab(tab)
  }

  async function addCoffee() {
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) return
    await supabase.from('food_logs').insert({
      user_id: data.claims.sub, logged_date: toISO(date), meal_block: 'snacks',
      food_name: coffeeConfig.name, calories: coffeeConfig.calories,
      protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0,
    })
    fetchLogs(date)
  }

  async function removeCoffee() {
    const last = coffeeLogs[coffeeLogs.length - 1]
    if (!last) return
    await supabase.from('food_logs').delete().eq('id', last.id)
    fetchLogs(date)
  }

  async function adjustWater(delta: number) {
    const next = Math.max(0, waterCount + delta)
    setWaterCount(next)
    await AsyncStorage.setItem(waterKey(toISO(date)), String(next))
  }

  async function saveManual() {
    if (!form.food_name.trim()) return Alert.alert('Food name required')
    if (!form.protein_g && !form.carbs_g && !form.fat_g && !form.calories)
      return Alert.alert('Enter at least one macro or calorie value')
    setSaving(true)
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) { setSaving(false); return }
    const calories = form.calories
      ? Number(form.calories)
      : calcCalories(form.protein_g, form.carbs_g, form.fat_g)
    const { error } = await supabase.from('food_logs').insert({
      user_id: data.claims.sub, logged_date: toISO(date), meal_block: modalBlock,
      food_name: form.food_name.trim(), calories,
      protein_g: Number(form.protein_g) || 0,
      carbs_g:   Number(form.carbs_g)   || 0,
      fat_g:     Number(form.fat_g)     || 0,
      fiber_g:   Number(form.fiber_g)   || 0,
    })
    setSaving(false)
    if (error) return Alert.alert('Error', error.message)
    setModalBlock(null)
    fetchLogs(date)
  }

  function applySearchResult(r: SearchResult) {
    setForm({
      food_name: r.name, calories: String(r.calories),
      protein_g: String(r.protein), carbs_g: String(r.carbs),
      fat_g: String(r.fat), fiber_g: String(r.fiber),
    })
    setModalTab('manual')
  }

  async function doSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      setSearchResults(await searchOpenFoodFacts(searchQuery))
    } catch {
      Alert.alert('Search failed', 'Check your connection and try again.')
    }
    setSearching(false)
  }

  async function parseWithAI(base64Image?: string, mediaType?: string) {
    const key = process.env.EXPO_PUBLIC_ANTHROPIC_KEY
    if (!key) return Alert.alert('AI logging not set up', 'Add EXPO_PUBLIC_ANTHROPIC_KEY to your .env file.')
    if (!base64Image && !aiText.trim()) return
    setParsing(true)
    try {
      const userContent: any[] = base64Image
        ? [
            { type: 'image', source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: base64Image } },
            { type: 'text', text: 'What food is in this image? Respond ONLY with JSON: {"food_name":"...","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0}. Estimate realistic macros per typical serving.' },
          ]
        : [{ type: 'text', content: aiText }]
      const res  = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 256,
          system: 'You are a nutrition assistant. Respond ONLY with JSON: {"food_name":"...","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0}.',
          messages: [{ role: 'user', content: userContent }],
        }),
      })
      const json   = await res.json()
      const text   = json.content?.[0]?.text ?? ''
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
      setForm({
        food_name: parsed.food_name ?? aiText,
        calories:  String(parsed.calories  ?? ''),
        protein_g: String(parsed.protein_g ?? ''),
        carbs_g:   String(parsed.carbs_g   ?? ''),
        fat_g:     String(parsed.fat_g     ?? ''),
        fiber_g:   String(parsed.fiber_g   ?? ''),
      })
      setModalTab('manual')
    } catch {
      Alert.alert('Could not parse meal', 'Check your input and try again.')
    }
    setParsing(false)
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return Alert.alert('Camera access needed', 'Allow camera access in settings.')
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
    if (!result.canceled && result.assets[0].base64) parseWithAI(result.assets[0].base64, 'image/jpeg')
  }

  async function deleteLog(id: string) {
    const doDelete = async () => { await supabase.from('food_logs').delete().eq('id', id); fetchLogs(date) }
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this item?')) doDelete()
    } else {
      Alert.alert('Remove item?', '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ])
    }
  }

  const coffeeLogs  = coffeeConfig.enabled
    ? logs.filter(l => l.meal_block === 'snacks' && l.food_name === coffeeConfig.name)
    : []
  const coffeeCount = coffeeLogs.length
  const totals      = sumLogs(logs)
  const blockLogs   = (key: MealBlock) =>
    logs.filter(l => l.meal_block === key && !(key === 'snacks' && coffeeLogs.some(c => c.id === l.id)))
  const set         = (k: keyof MacroForm) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const isToday     = toISO(date) === toISO(new Date())

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.appName}>BUMPLING</Text>
        <Text style={styles.screenTitle}>Diary</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={toggleDatePicker} hitSlop={8}>
            <Ionicons name="calendar-outline" size={22} color={showDatePicker ? colors.primary : colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Date navigator ── */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => changeDate(-1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleDatePicker} hitSlop={8}>
          <Text style={[styles.dateText, showDatePicker && { color: colors.primary }]}>
            {formatDateLabel(date)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeDate(1)} disabled={isToday} hitSlop={12}>
          <Ionicons name="chevron-forward" size={20} color={isToday ? colors.border : colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Inline date picker ── */}
      {showDatePicker && (
        <View style={styles.pickerCard}>
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={onDatePickerChange}
            themeVariant="light"
            style={{ alignSelf: 'center' }}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.pickerDone} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Scrollable content ── */}
      {loadingLogs ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <DailySummary totals={totals} goal={goal} waterCount={waterCount} />

          {/* Meal blocks */}
          {MEAL_BLOCKS.map(block => (
            <MealBlockCard
              key={block.key}
              block={block}
              logs={blockLogs(block.key)}
              expanded={expandedBlocks.has(block.key)}
              onToggle={() => toggleBlock(block.key)}
              onAdd={() => openAdd(block.key)}
              onDelete={deleteLog}
            />
          ))}

          {/* Quick Add AI bar */}
          <TouchableOpacity
            style={styles.quickAdd}
            onPress={() => openAdd('snacks', 'ai')}
            activeOpacity={0.85}
          >
            <View style={styles.quickAddIcon}>
              <Ionicons name="sparkles" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickAddTitle}>Quick Add</Text>
              <Text style={styles.quickAddSub}>Log a meal in seconds with AI</Text>
            </View>
            <Text style={styles.quickAddBtn}>Log with AI</Text>
          </TouchableOpacity>

          {/* Trackers row: Coffee + Water */}
          <View style={styles.trackerRow}>
            {coffeeConfig.enabled && (
              <TrackerCard
                icon="cafe-outline"
                iconColor={colors.primary}
                name={coffeeConfig.name}
                subtitle={`${coffeeConfig.calories} kcal/cup${coffeeCount > 0 ? ` · ${coffeeCount * coffeeConfig.calories} kcal` : ''}`}
                count={coffeeCount}
                onIncrement={addCoffee}
                onDecrement={removeCoffee}
              />
            )}
            <TrackerCard
              icon="water-outline"
              iconColor="#60A5FA"
              name="Water"
              subtitle="cups today"
              count={waterCount}
              onIncrement={() => adjustWater(1)}
              onDecrement={() => adjustWater(-1)}
            />
          </View>

        </ScrollView>
      )}

      {/* ── Add food modal ── */}
      <Modal
        visible={!!modalBlock}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalBlock(null)}
      >
        <SafeAreaView style={styles.modal}>

          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalBlock(null)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Add to {MEAL_BLOCKS.find(b => b.key === modalBlock)?.label}
            </Text>
            {modalTab === 'manual' ? (
              <TouchableOpacity onPress={saveManual} disabled={saving} style={styles.modalSaveBtn}>
                {saving
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={styles.modalSave}>Save</Text>
                }
              </TouchableOpacity>
            ) : (
              <View style={styles.modalSaveBtn} />
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {([
              { key: 'search', icon: 'search-outline',   label: 'Search' },
              { key: 'ai',     icon: 'sparkles-outline', label: 'AI' },
              { key: 'manual', icon: 'create-outline',   label: 'Manual' },
            ] as const).map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, modalTab === t.key && styles.tabActive]}
                onPress={() => setModalTab(t.key)}
              >
                <Ionicons name={t.icon} size={14} color={modalTab === t.key ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabText, modalTab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search tab */}
          {modalTab === 'search' && (
            <View style={{ flex: 1 }}>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search food database..."
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="search"
                  onSubmitEditing={doSearch}
                  autoFocus
                />
                <TouchableOpacity style={styles.searchBtn} onPress={doSearch} disabled={searching}>
                  {searching
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="search" size={18} color="#fff" />
                  }
                </TouchableOpacity>
              </View>
              <FlatList
                data={searchResults}
                keyExtractor={r => r.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.searchList}
                ListEmptyComponent={
                  searching ? null : (
                    <Text style={styles.searchEmpty}>
                      {searchQuery.trim() ? 'No results. Try a different term.' : 'Search for any food to get started.'}
                    </Text>
                  )
                }
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.searchResult} onPress={() => applySearchResult(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                      {item.brand ? <Text style={styles.searchResultBrand} numberOfLines={1}>{item.brand}</Text> : null}
                      <Text style={styles.searchResultMacros}>P {item.protein}g  ·  C {item.carbs}g  ·  F {item.fat}g</Text>
                    </View>
                    <View style={styles.searchResultKcal}>
                      <Text style={styles.searchResultKcalNum}>{item.calories}</Text>
                      <Text style={styles.searchResultKcalUnit}>kcal</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* AI tab */}
          {modalTab === 'ai' && (
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.aiSection}>
                <Text style={styles.aiLabel}>Describe what you ate</Text>
                <TextInput
                  style={styles.aiInput}
                  value={aiText}
                  onChangeText={setAiText}
                  placeholder="e.g. Two scrambled eggs with avocado on whole wheat toast"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={styles.aiActions}>
                  <TouchableOpacity style={[styles.aiBtn, { flex: 1 }, parsing && { opacity: 0.6 }]} onPress={() => parseWithAI()} disabled={parsing}>
                    {parsing
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><Ionicons name="sparkles" size={15} color="#fff" /><Text style={styles.aiBtnText}>Parse text</Text></>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.aiPhotoBtn, parsing && { opacity: 0.6 }]} onPress={pickPhoto} disabled={parsing}>
                    <Ionicons name="camera-outline" size={20} color={colors.primary} />
                    <Text style={styles.aiPhotoBtnText}>Photo</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.aiHint}>AI estimates macros — review and adjust before saving.</Text>
              </View>
            </ScrollView>
          )}

          {/* Manual tab */}
          {modalTab === 'manual' && (
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.manualSection}>
                <FormField label="Food name *">
                  <TextInput style={styles.input} value={form.food_name} onChangeText={set('food_name')}
                    placeholder="e.g. Grilled chicken breast" placeholderTextColor={colors.textSecondary} />
                </FormField>
                <View style={styles.macroGrid}>
                  {([
                    { key: 'protein_g', label: 'Protein (g)' },
                    { key: 'carbs_g',   label: 'Carbs (g)' },
                    { key: 'fat_g',     label: 'Fat (g)' },
                    { key: 'fiber_g',   label: 'Fiber (g)' },
                  ] as const).map(f => (
                    <View key={f.key} style={styles.macroGridItem}>
                      <FormField label={f.label}>
                        <TextInput style={styles.input} value={form[f.key]} onChangeText={set(f.key)}
                          keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSecondary} />
                      </FormField>
                    </View>
                  ))}
                </View>
                <View style={styles.calPreview}>
                  <Text style={styles.calPreviewLabel}>Calculated calories</Text>
                  <Text style={styles.calPreviewValue}>{calcCalories(form.protein_g, form.carbs_g, form.fat_g)} kcal</Text>
                </View>
                <FormField label="Override calories (optional)">
                  <TextInput style={styles.input} value={form.calories} onChangeText={set('calories')}
                    keyboardType="numeric" placeholder="Leave blank to use calculated value"
                    placeholderTextColor={colors.textSecondary} />
                </FormField>
              </View>
            </ScrollView>
          )}

        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 4 },
  appName:      { fontSize: 16, fontWeight: '900', color: colors.primary, letterSpacing: 1, marginRight: 'auto' },
  screenTitle:  { fontSize: 16, fontWeight: '700', color: colors.textPrimary, position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  headerIcons:  { flexDirection: 'row', gap: spacing.sm },

  // Date nav
  dateNav:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  dateText:     { fontSize: 15, fontWeight: '700', color: colors.textPrimary },

  // Date picker card
  pickerCard:   { backgroundColor: colors.card, marginHorizontal: spacing.md, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.xs },
  pickerDone:   { alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  pickerDoneText: { fontSize: 16, fontWeight: '700', color: colors.primary },

  // Scroll
  scroll:       { paddingHorizontal: spacing.md, paddingBottom: 40 },

  // Quick add bar
  quickAdd:     { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.sm, marginTop: spacing.xs },
  quickAddIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  quickAddTitle:{ fontSize: 14, fontWeight: '700', color: '#fff' },
  quickAddSub:  { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  quickAddBtn:  { fontSize: 13, fontWeight: '700', color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm },

  // Tracker row
  trackerRow:   { gap: spacing.xs, marginBottom: spacing.sm },

  // Modal
  modal:        { flex: 1, backgroundColor: colors.background },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalCloseBtn:{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalTitle:   { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  modalSaveBtn: { width: 44, alignItems: 'flex-end', justifyContent: 'center' },
  modalSave:    { fontSize: 16, fontWeight: '700', color: colors.primary },
  modalBody:    { padding: spacing.md },

  // Tabs
  tabs:         { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11 },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText:      { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive:{ color: colors.primary },

  // Search
  searchRow:    { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInput:  { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.textPrimary },
  searchBtn:    { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  searchList:   { paddingHorizontal: spacing.md, paddingBottom: 40 },
  searchEmpty:  { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
  searchResult: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs, gap: 10 },
  searchResultName:    { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  searchResultBrand:   { fontSize: 12, color: colors.textSecondary },
  searchResultMacros:  { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  searchResultKcal:    { alignItems: 'center' },
  searchResultKcalNum: { fontSize: 16, fontWeight: '800', color: colors.primary },
  searchResultKcalUnit:{ fontSize: 10, color: colors.textSecondary },

  // AI
  aiSection:    { gap: spacing.sm },
  aiLabel:      { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  aiInput:      { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 14, fontSize: 15, color: colors.textPrimary, minHeight: 100 },
  aiActions:    { flexDirection: 'row', gap: spacing.xs },
  aiBtn:        { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  aiBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  aiPhotoBtn:   { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiPhotoBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  aiHint:       { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },

  // Manual
  manualSection:   { gap: 4 },
  macroGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.xs },
  macroGridItem:   { width: '47%' },
  calPreview:      { backgroundColor: colors.primary + '12', borderRadius: radius.sm, padding: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  calPreviewLabel: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  calPreviewValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  fieldGroup:      { marginBottom: spacing.sm },
  fieldLabel:      { fontSize: 12, fontWeight: '600', color: colors.textPrimary, marginBottom: 5 },
  input:           { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.textPrimary },
})
