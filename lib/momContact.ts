// Mom's own phone number, used on the printable birth plan so the hospital can reach her.
import { supabase } from './supabase'

// Session-only cache — same pattern as lib/partner.ts and lib/carePlan.ts.
let phoneCache: string | null = null

export async function loadMomPhone(): Promise<string> {
  if (phoneCache !== null) return phoneCache
  const { data } = await supabase.from('mom_contacts').select('phone').maybeSingle()
  const phone = data?.phone ?? ''
  phoneCache = phone
  return phone
}

export async function saveMomPhone(phone: string): Promise<void> {
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return
  await supabase.from('mom_contacts').upsert({ user_id: userId, phone })
  phoneCache = phone
}

// Clears the in-memory cache — no remote data to clear (server-side,
// cascade-deleted on account deletion), but a signed-out session shouldn't
// hold onto it any longer than necessary.
export async function clearMomContactData(): Promise<void> {
  phoneCache = null
}
