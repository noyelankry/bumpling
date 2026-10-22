import { Platform } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Keychain-backed on native, where the session token guards health-adjacent
// data — SecureStore has no web equivalent (no OS keychain in a browser), so
// web falls back to AsyncStorage (itself just localStorage there).
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: (Platform.OS === 'web' ? AsyncStorage : SecureStoreAdapter) as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

/**
 * Pushes row changes on `table` to `onChange` instead of waiting for the
 * next focus-triggered refetch — for the few screens where mom and her
 * partner may realistically be looking at the same data at the same time.
 * `filter` is a PostgREST-style string (e.g. `pregnancy_id=eq.${id}`);
 * omit it to rely on RLS alone. Returns an unsubscribe function.
 */
export function subscribeToTable(table: string, onChange: () => void, filter?: string) {
  const channel = supabase
    .channel(`${table}:${filter ?? 'all'}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter }, onChange)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
