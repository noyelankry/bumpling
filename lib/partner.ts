// Partner contact info, used to address the "share with partner" email draft on an appointment.
import { supabase } from './supabase'

export type Partner = { name: string; email: string }

const EMPTY_PARTNER: Partner = { name: '', email: '' }

export async function loadPartner(): Promise<Partner> {
  const { data } = await supabase.from('partner_contacts').select('name,email').maybeSingle()
  return data ? { name: data.name ?? '', email: data.email ?? '' } : EMPTY_PARTNER
}

export async function savePartner(partner: Partner): Promise<void> {
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return
  await supabase.from('partner_contacts').upsert({ user_id: userId, ...partner })
}

// No-op now — data is server-side and cascade-deleted on account deletion, not local.
export async function clearPartnerData(): Promise<void> {}
