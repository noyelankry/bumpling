// Assembles everything in the user-owned Supabase tables into one JSON file
// and hands it to the share sheet — covers GDPR data portability / access
// requests without any server-side export endpoint (RLS already scopes every
// query below to the signed-in user).
import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { supabase } from './supabase'

const TABLES = [
  'profiles',
  'pregnancies',
  'care_items',
  'health_logs',
  'brain_dump_entries',
  'birth_preferences',
  'partner_contacts',
  'mom_contacts',
  'consent_logs',
] as const

export type ExportResult = { ok: boolean; message?: string }

export async function exportMyData(): Promise<ExportResult> {
  try {
    const { data: claims } = await supabase.auth.getClaims()
    const userId = claims?.claims?.sub
    if (!userId) return { ok: false, message: 'not-signed-in' }

    const results = await Promise.all(
      TABLES.map(table => table === 'profiles'
        ? supabase.from(table).select('*').eq('id', userId)
        : supabase.from(table).select('*'))
    )
    const payload: Record<string, unknown> = { exportedAt: new Date().toISOString(), userId }
    TABLES.forEach((table, i) => { payload[table] = results[i].data ?? [] })
    const json = JSON.stringify(payload, null, 2)

    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bumpling-data-export-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      return { ok: true }
    }

    const uri = `${FileSystem.cacheDirectory}bumpling-data-export-${Date.now()}.json`
    await FileSystem.writeAsStringAsync(uri, json)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Your Bumpling data' })
    }
    return { ok: true }
  } catch {
    return { ok: false, message: 'export-failed' }
  }
}
