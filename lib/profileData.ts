// profiles row (full_name/username) — read by Profile and the birth-plan
// summary screen. Session-only cache, same pattern as carePlan/partner/momContact.
import { supabase } from './supabase'

export type ProfileData = { full_name: string; username: string; avatar_url: string | null }

const EMPTY: ProfileData = { full_name: '', username: '', avatar_url: null }

// Keyed by user id, not just a blind cache — signing out and into a
// different account must never show the previous one's cached profile.
// clearProfileCache() below is still called on sign-out as a courtesy, but
// this is the guarantee that actually prevents the leak if a future call
// site forgets to.
let profileCache: { userId: string; data: ProfileData } | null = null

export async function loadProfile(): Promise<ProfileData> {
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return EMPTY
  if (profileCache?.userId === userId) return profileCache.data
  const { data } = await supabase.from('profiles').select('full_name,username,avatar_url').eq('id', userId).maybeSingle()
  const profile = data ? { full_name: data.full_name ?? '', username: data.username ?? '', avatar_url: data.avatar_url ?? null } : EMPTY
  profileCache = { userId, data: profile }
  return profile
}

export async function setCachedProfile(profile: ProfileData): Promise<void> {
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return
  profileCache = { userId, data: profile }
}

export function clearProfileCache(): void {
  profileCache = null
}
