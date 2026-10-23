import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { BabyMark } from '../components/illustrations'
import { goBack } from '../lib/navigation'
import { useDirectionalIcon } from '../lib/i18n/useDirectionalIcon'

export default function LegalScreen() {
  const router = useRouter()
  const { t } = useTranslation('legal')
  const { t: tCommon } = useTranslation('common')
  const { back: backIcon, forward } = useDirectionalIcon()
  const back = () => goBack(router, '/profile')
  const version = Constants.expoConfig?.version ?? '—'

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={back} hitSlop={8} accessibilityLabel={tCommon('back')}>
          <Ionicons name={backIcon} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <BabyMark size={56} />
          <Text style={styles.pageTitle}>{t('aboutTitle')}</Text>
          <Text style={styles.aboutBody}>{t('aboutBody')}</Text>
          <Text style={styles.version}>{t('version', { version })}</Text>
        </View>

        <Text style={styles.sectionLabel}>{t('legalSection')}</Text>
        <View style={styles.list}>
          <TouchableOpacity style={styles.subRow} onPress={() => router.push('/privacy-policy')} activeOpacity={0.6}>
            <Text style={styles.subRowTitle}>{t('privacyPolicy')}</Text>
            <Ionicons name={forward} size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.subRow} onPress={() => router.push('/terms-of-service')} activeOpacity={0.6}>
            <Text style={styles.subRowTitle}>{t('termsOfService')}</Text>
            <Ionicons name={forward} size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>{t('medicalDisclaimer')}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs, paddingTop: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56 },

  heroWrap:  { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  pageTitle: { fontFamily: fonts.headlineBold, fontSize: 22, color: colors.textPrimary, marginTop: spacing.sm },
  aboutBody: { fontSize: 13.5, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, lineHeight: 19, paddingHorizontal: spacing.sm },
  version:   { fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm },

  sectionLabel: { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  list:    { borderTopWidth: 1, borderTopColor: colors.border },
  subRow:      { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subRowTitle: { fontSize: 15, color: colors.textPrimary },

  disclaimer: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: spacing.lg },
})
