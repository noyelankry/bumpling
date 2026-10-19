// profiles row (full_name/username) — read by Profile and the birth-plan
// summary screen. Session-only cache, same pattern as carePlan/partner/momContact.
import { supabase } from './supabase'

export type ProfileData = { full_name: string; username: string; avatar_url: string | null }

const EMPTY: ProfileData = { full_name: '', username: '', avatar_url: null }

let profileCache: ProfileData | null = null

export async function loadProfile(): Promise<ProfileData> {
  if (profileCache) return profileCache
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return EMPTY
  const { data } = await supabase.from('profiles').select('full_name,username,avatar_url').eq('id', userId).maybeSingle()
  const profile = data ? { full_name: data.full_name ?? '', username: data.username ?? '', avatar_url: data.avatar_url ?? null } : EMPTY
  profileCache = profile
  return profile
}

export function setCachedProfile(profile: ProfileData): void {
  profileCache = profile
}

export function clearProfileCache(): void {
  profileCache = null
}
