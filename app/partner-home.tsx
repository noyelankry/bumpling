// Shown only while the partner's linked pregnancy has no LMP set yet (mom
// hasn't finished her own onboarding) — once she has, the root layout sends
// a partner straight into the real (tabs) navigator like any owner; there's
// no separate partner screen for the normal case anymore.
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { DEV_BYPASS_KEY } from '../lib/devBypass'
import { BabyMark } from '../components/illustrations'

export default function PartnerHomeScreen() {
  const { t } = useTranslation('partnerHome')

  function signOut() {
    const doSignOut = async () => {
      await supabase.auth.signOut()
      await AsyncStorage.removeItem(DEV_BYPASS_KEY)
    }
    if (Platform.OS === 'web') {
      if (window.confirm(t('signOutConfirm'))) doSignOut()
      return
    }
    Alert.alert(t('signOutTitle'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOutTitle'), style: 'destructive', onPress: doSignOut },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <BabyMark size={64} />
        <Text style={styles.title}>{t('waitingTitle')}</Text>
        <Text style={styles.body}>{t('waitingBody')}</Text>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.signOutText}>{t('signOutTitle')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.sm },
  title: { fontFamily: fonts.headlineBold, fontSize: 20, color: colors.textPrimary, textAlign: 'center', marginTop: spacing.sm },
  body: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, padding: spacing.sm },
  signOutText: { fontSize: 13, color: colors.textSecondary },
})
