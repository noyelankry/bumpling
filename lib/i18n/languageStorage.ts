// Local-only language preference — not synced to Supabase (the profiles table has no language column).
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'bumpling_language'

export type Language = 'en' | 'he'

export async function loadLanguage(): Promise<Language | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  return raw === 'en' || raw === 'he' ? raw : null
}

export async function saveLanguage(lang: Language): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lang)
}
