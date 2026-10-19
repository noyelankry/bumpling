// Mom's own phone number, used on the printable birth plan so the hospital can reach her.
import { supabase } from './supabase'

export async function loadMomPhone(): Promise<string> {
  const { data } = await supabase.from('mom_contacts').select('phone').maybeSingle()
  return data?.phone ?? ''
}

export async function saveMomPhone(phone: string): Promise<void> {
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return
  await supabase.from('mom_contacts').upsert({ user_id: userId, phone })
}

// No-op now — data is server-side and cascade-deleted on account deletion, not local.
export async function clearMomContactData(): Promise<void> {}
