import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing, fonts } from '../lib/theme'

type Props = {
  value: Date | null
  onChange: (date: Date) => void
  placeholder: string
  maximumDate?: Date
  minimumDate?: Date
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function buildGrid(viewMonth: Date) {
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })
}

export default function DateField({ value, onChange, placeholder, maximumDate, minimumDate }: Props) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => value ?? maximumDate ?? new Date())
  const [fieldHeight, setFieldHeight] = useState(52)
  const wrapRef = useRef<View>(null)

  useEffect(() => {
    if (!open) return
    setViewMonth(value ?? maximumDate ?? new Date())
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      const node = wrapRef.current as unknown as HTMLElement | null
      if (node && !node.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const min = minimumDate ? startOfDay(minimumDate) : null
  const max = maximumDate ? startOfDay(maximumDate) : null
  const today = startOfDay(new Date())
  const grid = buildGrid(viewMonth)

  function isDisabled(d: Date) {
    if (min && d < min) return true
    if (max && d > max) return true
    return false
  }

  function select(d: Date) {
    if (isDisabled(d)) return
    onChange(d)
    setOpen(false)
  }

  function shiftMonth(delta: number) {
    setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  }

  return (
    <View ref={wrapRef} style={styles.wrap}>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setOpen(o => !o)}
        onLayout={e => setFieldHeight(e.nativeEvent.layout.height)}
        activeOpacity={0.7}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value
            ? value.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {open && (
        <View style={[styles.popover, { top: fieldHeight + 8 }]}>
          <View style={styles.monthRow}>
            <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(-1)} hitSlop={6}>
              <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(1)} hitSlop={6}>
              <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={styles.weekdayText}>{w}</Text>
            ))}
          </View>

          <View style={styles.dayGrid}>
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === viewMonth.getMonth()
              const disabled = isDisabled(d)
              const selected = value ? sameDay(d, value) : false
              const isToday = sameDay(d, today)
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayCell,
                    selected && styles.dayCellSelected,
                    !selected && isToday && styles.dayCellToday,
                  ]}
                  onPress={() => select(d)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayText,
                    !inMonth && styles.dayTextMuted,
                    disabled && styles.dayTextDisabled,
                    selected && styles.dayTextSelected,
                  ]}>
                    {d.getDate()}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap:  { position: 'relative' as const, zIndex: 10 },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14 },
  valueText: { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  placeholderText: { fontSize: 16, color: colors.textSecondary },

  popover: {
    position: 'absolute', left: 0, right: 0, zIndex: 10,
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },

  monthRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  navBtn:     { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.neutralChip, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontFamily: fonts.headline, fontSize: 14.5, color: colors.textPrimary },

  weekdayRow:  { flexDirection: 'row', marginBottom: 2 },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textSecondary },

  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  dayCellSelected: { backgroundColor: colors.primary },
  dayCellToday:    { backgroundColor: colors.sage },
  dayText:         { fontSize: 13.5, color: colors.textPrimary, fontWeight: '600' },
  dayTextMuted:    { color: colors.textSecondary, opacity: 0.4 },
  dayTextDisabled: { color: colors.textSecondary, opacity: 0.25 },
  dayTextSelected: { color: '#fff' },
})
