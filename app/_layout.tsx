import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFonts as usePoppinsFonts, Poppins_600SemiBold } from '@expo-google-fonts/poppins'
import { useFonts as useDMSansFonts, DM_Sans_400Regular } from '@expo-google-fonts/dm-sans'
import { supabase } from '../lib/supabase'
import { DEV_BYPASS_KEY } from '../lib/devBypass'
import { hasLMP, hasCompletedCatchUp, hasCompletedBooked } from '../lib/carePlan'
import { fonts } from '../lib/theme'

// Sets the bundled body font once at the root. On web this relies on real DOM
// font-family inheritance to reach every Text without touching each screen's
// styles; on native it only covers Text nodes that don't set their own
// fontFamily, since RN Text (unlike web) doesn't inherit font-family from an
// ancestor View.
const rootFontStyle = { fontFamily: fonts.sans } as any

const ONBOARDING_KEY = 'bumpling_onboarding_seen'

export default function RootLayout() {
  // Non-blocking: don't gate the whole app on font load. If it hangs or fails
  // for any environmental reason (slow network, browser quirk), text still
  // renders immediately on the fallback font and swaps in Poppins/DM Sans
  // once ready — standard web font-loading behavior, and it means a font
  // issue can never present as a fully blank app.
  usePoppinsFonts({ Poppins_600SemiBold })
  useDMSansFonts({ DM_Sans_400Regular })
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
      const devBypass = __DEV__ && (await AsyncStorage.getItem(DEV_BYPASS_KEY)) === 'true'
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
            if (bookedDone && inAuth) router.replace('/(tabs)')
          }
        }
        return
      }

      const onboardingSeen = (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true'
      if (cancelled) return

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
    <View style={[{ flex: 1 }, rootFontStyle]}>
      <Slot />
    </View>
  )
}
