// Avatar upload: picks an image from the device library, uploads it to the
// 'avatars' storage bucket under the signed-in user's own folder — required
// by the bucket's owner-scoped RLS (see migration
// 20261019150000_fix_avatar_storage_policies.sql) — and writes the
// resulting public URL onto profiles.avatar_url.
import * as ImagePicker from 'expo-image-picker'
import { supabase } from './supabase'

export type UploadAvatarResult = { ok: boolean; avatarUrl?: string; message?: string }

export async function uploadAvatar(): Promise<UploadAvatarResult> {
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return { ok: false }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  })
  if (result.canceled || !result.assets?.[0]?.uri) return { ok: false }

  try {
    const image = result.assets[0]
    const fileExt = image.uri.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userId}/${Date.now()}.${fileExt}`
    const arraybuffer = await fetch(image.uri).then(res => res.arrayBuffer())

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, arraybuffer, {
      contentType: image.mimeType ?? 'image/jpeg',
    })
    if (uploadError) return { ok: false, message: uploadError.message }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = urlData.publicUrl

    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId)
    if (updateError) return { ok: false, message: updateError.message }

    return { ok: true, avatarUrl }
  } catch (err: any) {
    return { ok: false, message: err?.message }
  }
}
