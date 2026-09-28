import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../lib/theme'

type Props = {
  value: Date | null
  onChange: (date: Date) => void
  placeholder: string
  maximumDate?: Date
  minimumDate?: Date
}

export default function DateField({ value, onChange, placeholder, maximumDate, minimumDate }: Props) {
  const [open, setOpen] = useState(false)

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setOpen(false)
    if (event.type === 'dismissed') return
    if (selected) onChange(selected)
  }

  return (
    <View>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value
            ? value.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : placeholder}
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={Platform.OS === 'ios' ? styles.iosPickerWrap : undefined}>
          <DateTimePicker
            value={value ?? maximumDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={handleChange}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setOpen(false)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.xl, paddingHorizontal: 16, paddingVertical: 14 },
  valueText: { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  placeholderText: { fontSize: 16, color: colors.textSecondary },

  iosPickerWrap: { backgroundColor: colors.card, borderRadius: radius.md, marginTop: spacing.sm, overflow: 'hidden' },
  doneBtn:     { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  doneBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
})
