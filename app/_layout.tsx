import { useEffect, useState } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { DEV_BYPASS_KEY } from '../lib/devBypass'

const ONBOARDING_KEY = 'bumpling_onboarding_seen'

export default function RootLayout() {
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
        if (inAuth) router.replace('/(tabs)')
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

  return <Slot />
}
