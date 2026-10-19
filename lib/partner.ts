// Partner contact info, used to address the "share with partner" email draft on an appointment.
import { supabase } from './supabase'

export type Partner = { name: string; email: string }

const EMPTY_PARTNER: Partner = { name: '', email: '' }

// Session-only cache — profile.tsx and appointment/[id].tsx both load this
// on every focus; without it, visiting Profile re-fetches on every single
// navigation. Same pattern as carePlan.ts's cache.
let partnerCache: Partner | null = null

export async function loadPartner(): Promise<Partner> {
  if (partnerCache) return partnerCache
  const { data } = await supabase.from('partner_contacts').select('name,email').maybeSingle()
  const partner = data ? { name: data.name ?? '', email: data.email ?? '' } : EMPTY_PARTNER
  partnerCache = partner
  return partner
}

export async function savePartner(partner: Partner): Promise<void> {
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return
  await supabase.from('partner_contacts').upsert({ user_id: userId, ...partner })
  partnerCache = partner
}

// Clears the in-memory cache — no remote data to clear (server-side,
// cascade-deleted on account deletion), but a signed-out session shouldn't
// hold onto it any longer than necessary.
export async function clearPartnerData(): Promise<void> {
  partnerCache = null
}
