import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFonts as usePoppinsFonts, Poppins_600SemiBold } from '@expo-google-fonts/poppins'
import { useFonts as useDMSansFonts, DMSans_400Regular } from '@expo-google-fonts/dm-sans'
import { useFonts as useNotoSansHebrewFonts, NotoSansHebrew_400Regular, NotoSansHebrew_600SemiBold, NotoSansHebrew_700Bold } from '@expo-google-fonts/noto-sans-hebrew'
import { supabase } from '../lib/supabase'
import { DEV_BYPASS_KEY, allowDevBypass } from '../lib/devBypass'
import { hasLMP, hasCompletedCatchUp, hasCompletedBooked } from '../lib/carePlan'
import { fonts } from '../lib/theme'
import '../lib/i18n'
import { LanguageProvider } from '../lib/i18n/LanguageProvider'
import { DesktopWebFrame } from '../components/DesktopWebFrame'
import { ONBOARDING_KEY } from '../lib/onboarding'

// Sets the bundled body font once at the root. On web this relies on real DOM
// font-family inheritance to reach every Text without touching each screen's
// styles; on native it only covers Text nodes that don't set their own
// fontFamily, since RN Text (unlike web) doesn't inherit font-family from an
// ancestor View.
const rootFontStyle = { fontFamily: fonts.sans } as any

export default function RootLayout() {
  // Non-blocking: don't gate the whole app on font load. If it hangs or fails
  // for any environmental reason (slow network, browser quirk), text still
  // renders immediately on the fallback font and swaps in Poppins/DM Sans
  // once ready — standard web font-loading behavior, and it means a font
  // issue can never present as a fully blank app.
  usePoppinsFonts({ Poppins_600SemiBold })
  useDMSansFonts({ DMSans_400Regular })
  useNotoSansHebrewFonts({ NotoSansHebrew_400Regular, NotoSansHebrew_600SemiBold, NotoSansHebrew_700Bold })
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    supabase.auth.getClaims().then(({ data }) => {
      setUserId(data?.claims?.sub ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getClaims()
      setUserId(data?.claims?.sub ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (userId === undefined) return

    let cancelled = false
    ;(async () => {
      const inAuth = segments[0] === '(auth)'
      const devBypass = allowDevBypass && (await AsyncStorage.getItem(DEV_BYPASS_KEY)) === 'true'
      if (cancelled) return

      if (userId || devBypass) {
        const lmpSet = await hasLMP()
        if (cancelled) return

        const path = (segments as string[]).join('/')

        if (!lmpSet && path !== '(auth)/lmp') {
          router.replace('/(auth)/lmp')
          return
        }

        if (lmpSet) {
          const catchUpDone = await hasCompletedCatchUp()
          if (cancelled) return

          if (!catchUpDone && path !== '(auth)/catch-up') {
            router.replace('/(auth)/catch-up')
            return
          }

          if (catchUpDone) {
            const bookedDone = await hasCompletedBooked()
            if (cancelled) return

            if (!bookedDone && path !== '(auth)/booked' && path !== 'add-item') {
              router.replace('/(auth)/booked')
              return
            }
            if (bookedDone && inAuth && path !== '(auth)/onboarding') router.replace('/(tabs)')
          }
        }
        return
      }

      const onboardingSeen = (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true'
      if (cancelled) return

      // Reachable without an account — e.g. tapped from the signup consent
      // checkboxes — so they can't bounce the visitor back to onboarding/login.
      const path = (segments as string[]).join('/')
      if (path === 'privacy-policy' || path === 'terms-of-service') return

      if (!onboardingSeen && segments[0] !== '(auth)') {
        router.replace('/(auth)/onboarding')
        return
      }

      if (onboardingSeen && !inAuth) {
        router.replace('/(auth)/login')
      }
    })()

    return () => { cancelled = true }
  }, [userId, segments])

  return (
    <LanguageProvider>
      <View style={[{ flex: 1 }, rootFontStyle]}>
        <DesktopWebFrame>
          <Stack screenOptions={{ headerShown: false }} />
        </DesktopWebFrame>
      </View>
    </LanguageProvider>
  )
}
