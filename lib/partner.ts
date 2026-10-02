// Local-only partner contact info, used to address the "share with partner"
// email draft on an appointment. Not synced to Supabase — same tier as the
// rest of this app's settings (LMP, care items, health check-ins).
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'bumpling_partner'

export type Partner = { name: string; email: string }

const EMPTY_PARTNER: Partner = { name: '', email: '' }

export async function loadPartner(): Promise<Partner> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return EMPTY_PARTNER
  try {
    return { ...EMPTY_PARTNER, ...JSON.parse(raw) }
  } catch {
    return EMPTY_PARTNER
  }
}

export async function savePartner(partner: Partner): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(partner))
}

export async function clearPartnerData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}
