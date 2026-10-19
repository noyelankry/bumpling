// Brain dump is the one place a partner's view genuinely differs in *kind*,
// not just read-vs-write: Today/Plan/birth-preferences reuse the normal
// owner functions (currentPregnancy() in carePlan.ts resolves either role —
// see that file), but brain dump entries are private by default, so a
// partner only ever sees the ones mom explicitly marked shared. RLS (see
// migration 20261019120554) enforces this regardless of what gets queried
// here; this just narrows the query to match.
import { supabase } from './supabase'

export type SharedNote = { id: string; text: string; createdAt: string }

export async function loadSharedNotes(): Promise<SharedNote[]> {
  const { data } = await supabase
    .from('brain_dump_entries')
    .select('id,text,created_at')
    .eq('shared_with_partner', true)
    .order('created_at', { ascending: false })
  return (data ?? []).map(row => ({ id: row.id, text: row.text, createdAt: row.created_at }))
}

/** Name of the pregnant user a partner is connected to, for display on their own Profile screen. */
export async function loadConnectedMomName(): Promise<string | null> {
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return null

  const { data: membership } = await supabase
    .from('pregnancy_members')
    .select('pregnancy_id')
    .eq('user_id', userId)
    .eq('role', 'partner')
    .not('accepted_at', 'is', null)
    .limit(1)
    .maybeSingle()
  if (!membership) return null

  const { data: pregnancy } = await supabase.from('pregnancies').select('user_id').eq('id', membership.pregnancy_id).maybeSingle()
  if (!pregnancy) return null

  const { data: profile } = await supabase.from('profiles').select('full_name,username').eq('id', pregnancy.user_id).maybeSingle()
  return profile?.full_name || (profile?.username ? `@${profile.username}` : null)
}
