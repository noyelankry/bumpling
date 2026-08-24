import { useEffect, useState } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

const ONBOARDING_KEY = 'bumpling_onboarding_seen'

export default function RootLayout() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | undefined>(undefined)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      setOnboardingSeen(val === 'true')
    })

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
    if (userId === undefined || onboardingSeen === undefined) return
    const inAuth = segments[0] === '(auth)'

    if (userId) {
      if (inAuth) router.replace('/(tabs)')
      return
    }

    if (!onboardingSeen && segments[0] !== '(auth)') {
      router.replace('/(auth)/onboarding')
      return
    }

    if (onboardingSeen && !inAuth) {
      router.replace('/(auth)/login')
    }
  }, [userId, onboardingSeen, segments])

  return <Slot />
}
