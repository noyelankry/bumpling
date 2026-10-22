// Partner contact info, used to address the "share with partner" email draft on an appointment.
import { supabase } from './supabase'

export type Partner = { name: string; email: string }

const EMPTY_PARTNER: Partner = { name: '', email: '' }

// Keyed by user id, not just a blind cache — see profileData.ts for why
// (a cache that can only be cleared by remembering to, on every sign-out
// path, will eventually leak the previous account's data into the next one).
let partnerCache: { userId: string; data: Partner } | null = null

export async function loadPartner(): Promise<Partner> {
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return EMPTY_PARTNER
  if (partnerCache?.userId === userId) return partnerCache.data
  const { data } = await supabase.from('partner_contacts').select('name,email').maybeSingle()
  const partner = data ? { name: data.name ?? '', email: data.email ?? '' } : EMPTY_PARTNER
  partnerCache = { userId, data: partner }
  return partner
}

export async function savePartner(partner: Partner): Promise<void> {
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return
  await supabase.from('partner_contacts').upsert({ user_id: userId, ...partner })
  partnerCache = { userId, data: partner }
}

// Clears the in-memory cache — no remote data to clear (server-side,
// cascade-deleted on account deletion), but a signed-out session shouldn't
// hold onto it any longer than necessary.
export async function clearPartnerData(): Promise<void> {
  partnerCache = null
}
