// Partner invite/redeem flow. Mom shares a short code (not a deep link — no
// hosted domain/universal-link infrastructure exists for this app), the
// partner types it in during signup/sign-in to get linked via
// pregnancy_members. See BACKEND.md for the full design.
import { supabase } from './supabase'
import { currentPregnancyId } from './carePlan'

// Shared with app/_layout.tsx — while this is set, the layout's own
// auth-state-driven redirect check skips itself entirely, so it can't race
// Auth.tsx's redemption and briefly send a partner to the LMP screen before
// Auth.tsx's own navigation corrects it a moment later.
export const PARTNER_REDEEM_FLAG = 'bumpling_redeeming_invite'

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub ?? null
}

export async function createInvite(email: string): Promise<{ code: string } | null> {
  const pregnancyId = await currentPregnancyId()
  const userId = await currentUserId()
  if (!pregnancyId || !userId) return null
  const { data, error } = await supabase
    .from('pregnancy_invites')
    .insert({ pregnancy_id: pregnancyId, invited_email: email, created_by: userId })
    .select('code')
    .single()
  if (error || !data) return null
  return { code: data.code }
}

export async function redeemInvite(code: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.rpc('redeem_pregnancy_invite', { invite_code: code.trim() })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

/** Is the signed-in user an accepted partner on some pregnancy (not its owner)? Used to route into the partner view. */
export async function isPartner(): Promise<boolean> {
  const userId = await currentUserId()
  if (!userId) return false
  const { data } = await supabase
    .from('pregnancy_members')
    .select('pregnancy_id')
    .eq('user_id', userId)
    .eq('role', 'partner')
    .not('accepted_at', 'is', null)
    .limit(1)
    .maybeSingle()
  return data != null
}
