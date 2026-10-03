// Mom's own phone number, used on the printable birth plan so the hospital
// has a way to reach her. Local-only (AsyncStorage), same tier as lib/partner.ts
// — profiles.full_name already covers her name via Supabase.
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'bumpling_mom_contact'

export async function loadMomPhone(): Promise<string> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  return raw ?? ''
}

export async function saveMomPhone(phone: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, phone)
}

export async function clearMomContactData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}
