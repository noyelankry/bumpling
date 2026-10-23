import { useState } from 'react'
import { Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { useLanguage } from '../lib/i18n/LanguageProvider'
import { PHONE_COUNTRIES, type PhoneCountry } from '../lib/phoneCountries'

type Props = {
  value: PhoneCountry
  onChange: (country: PhoneCountry) => void
  label: string
}

export default function PhoneCountryPicker({ value, onChange, label }: Props) {
  const { language, isRTL } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={styles.flag}>{value.flag}</Text>
        <Text style={styles.dialCode}>{value.dialCode}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {PHONE_COUNTRIES.map(country => (
                <TouchableOpacity
                  key={country.iso}
                  style={styles.row}
                  activeOpacity={0.6}
                  onPress={() => { onChange(country); setOpen(false) }}
                >
                  <Text style={styles.rowFlag}>{country.flag}</Text>
                  <Text style={[styles.rowName, isRTL && styles.rowNameRTL]} numberOfLines={1}>
                    {language === 'he' ? country.nameHe : country.nameEn}
                  </Text>
                  <Text style={styles.rowDialCode}>{country.dialCode}</Text>
                  {country.iso === value.iso && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingEnd: 8 },
  flag:     { fontSize: 17 },
  dialCode: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.sm, maxHeight: '70%' },
  sheetTitle: { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  list:     { paddingHorizontal: spacing.md },

  row:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowFlag:     { fontSize: 20 },
  rowName:     { flex: 1, fontSize: 15, color: colors.textPrimary, textAlign: 'left' },
  rowNameRTL:  { textAlign: 'right' },
  rowDialCode: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
})
