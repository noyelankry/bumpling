import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { goBack } from '../lib/navigation'
import { useDirectionalIcon } from '../lib/i18n/useDirectionalIcon'

export default function PrivacyPolicyScreen() {
  const router = useRouter()
  const { t } = useTranslation('legal')
  const { back: backIcon } = useDirectionalIcon()
  const back = () => goBack(router, '/legal')

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={back} hitSlop={8}>
          <Ionicons name={backIcon} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.pageTitle}>{t('privacyPolicy')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.draftBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.urgent} />
          <Text style={styles.draftBannerText}>{t('draftBanner')}</Text>
        </View>
        <Text style={styles.body}>{t('privacyPolicyBody')}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs, paddingTop: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  titleBlock: { paddingHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.sm },
  pageTitle:  { fontFamily: fonts.headlineBold, fontSize: 26, color: colors.textPrimary, lineHeight: 31 },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56 },

  draftBanner:     { flexDirection: 'row', gap: 8, backgroundColor: colors.urgentBg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md, alignItems: 'flex-start' },
  draftBannerText: { flex: 1, fontSize: 12.5, color: colors.urgent, lineHeight: 17, fontWeight: '600' },

  body: { fontSize: 14, color: colors.textPrimary, lineHeight: 22 },
})
