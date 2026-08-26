import { View, StyleSheet } from 'react-native'
import { colors, radius } from '../lib/theme'

type Props = {
  value: Date | null
  onChange: (date: Date) => void
  placeholder: string
  maximumDate?: Date
  minimumDate?: Date
}

function toInputValue(d: Date | null | undefined): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function DateField({ value, onChange, placeholder, maximumDate, minimumDate }: Props) {
  return (
    <View style={styles.field}>
      <input
        type="date"
        value={toInputValue(value)}
        max={toInputValue(maximumDate)}
        min={toInputValue(minimumDate)}
        placeholder={placeholder}
        onChange={e => {
          const v = e.target.value
          if (!v) return
          const [y, m, d] = v.split('-').map(Number)
          onChange(new Date(y, m - 1, d))
        }}
        style={{
          border: 'none',
          background: 'transparent',
          fontSize: 16,
          color: colors.textPrimary,
          width: '100%',
          textAlign: 'center',
          outline: 'none',
          fontFamily: 'inherit',
          padding: 0,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  field: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14 },
})
