// Shared brain-dump storage: free-form notes and doctor questions,
// optionally enriched with details/tags/an appointment link.
import { supabase } from './supabase'
import i18next from './i18n'
import { getDateLocale } from './i18n/dateLocale'

export type EntryKind = 'thought' | 'doctor'
export type Filter = 'all' | 'doctor' | 'personal'

export type Entry = {
  id: string
  text: string
  details?: string
  kind: EntryKind
  tags: string[]
  linkedAppointmentId?: string
  linkedAppointmentTitle?: string
  done: boolean
  createdAt: string
}

// Stored lowercase (see SYMPTOMS in app/(tabs)/health.tsx for the same
// pattern) — display labels are resolved through t('tag.<key>') at render.
export const SUGGESTED_TAGS = ['sleep', 'energy', 'symptoms', 'nutrition']

/** "Ask doctor" entries get their own filter; everything else is "Personal". */
export function filterGroupOf(kind: EntryKind): Filter {
  return kind === 'doctor' ? 'doctor' : 'personal'
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub ?? null
}

function fromRow(row: Record<string, any>): Entry {
  return {
    id: row.id,
    text: row.text,
    details: row.details ?? undefined,
    kind: row.kind,
    tags: row.tags ?? [],
    linkedAppointmentId: row.linked_appointment_id ?? undefined,
    linkedAppointmentTitle: row.linked_appointment_title ?? undefined,
    done: row.done,
    createdAt: row.created_at,
  }
}

export async function loadEntries(): Promise<Entry[]> {
  const userId = await currentUserId()
  if (!userId) return []
  const { data } = await supabase.from('brain_dump_entries').select('*').order('created_at', { ascending: false })
  return (data ?? []).map(fromRow)
}

export async function addEntry(entries: Entry[], details: {
  text: string
  kind: EntryKind
  details?: string
  tags?: string[]
  linkedAppointmentId?: string
  linkedAppointmentTitle?: string
}): Promise<Entry[]> {
  const userId = await currentUserId()
  if (!userId) return entries
  const { data } = await supabase.from('brain_dump_entries').insert({
    user_id: userId,
    text: details.text,
    details: details.details?.trim() || null,
    kind: details.kind,
    tags: details.tags ?? [],
    linked_appointment_id: details.linkedAppointmentId ?? null,
    linked_appointment_title: details.linkedAppointmentTitle ?? null,
  }).select().single()
  if (!data) return entries
  return [fromRow(data), ...entries]
}

export async function updateEntry(entries: Entry[], id: string, details: {
  text: string
  kind: EntryKind
  details?: string
  tags?: string[]
  linkedAppointmentId?: string
  linkedAppointmentTitle?: string
}): Promise<Entry[]> {
  await supabase.from('brain_dump_entries').update({
    text: details.text,
    details: details.details?.trim() || null,
    kind: details.kind,
    tags: details.tags ?? [],
    linked_appointment_id: details.linkedAppointmentId ?? null,
    linked_appointment_title: details.linkedAppointmentTitle ?? null,
  }).eq('id', id)
  return entries.map(e => e.id === id ? {
    ...e,
    text: details.text,
    details: details.details?.trim() || undefined,
    kind: details.kind,
    tags: details.tags ?? [],
    linkedAppointmentId: details.linkedAppointmentId,
    linkedAppointmentTitle: details.linkedAppointmentTitle,
  } : e)
}

export async function toggleDone(entries: Entry[], id: string): Promise<Entry[]> {
  const entry = entries.find(e => e.id === id)
  if (!entry) return entries
  await supabase.from('brain_dump_entries').update({ done: !entry.done }).eq('id', id)
  return entries.map(e => e.id === id ? { ...e, done: !e.done } : e)
}

export async function removeEntry(entries: Entry[], id: string): Promise<Entry[]> {
  await supabase.from('brain_dump_entries').delete().eq('id', id)
  return entries.filter(e => e.id !== id)
}

// No-op now — data is server-side and cascade-deleted on account deletion, not local.
export async function clearBrainDumpData(): Promise<void> {}

/** Coarse "3h ago" label for the home screen preview card. */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return i18next.t('brainDump:justNow')
  if (mins < 60) return i18next.t('brainDump:minutesAgo', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return i18next.t('brainDump:hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return i18next.t('brainDump:daysAgo', { count: days })
}

/** "Today" / "Yesterday" / "Sep 28" section label for a createdAt timestamp. */
export function formatEntryDay(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)
  if (diffDays === 0) return i18next.t('brainDump:today')
  if (diffDays === 1) return i18next.t('brainDump:yesterday')
  return date.toLocaleDateString(getDateLocale(), { month: 'short', day: 'numeric' })
}

export function formatEntryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(getDateLocale(), { hour: 'numeric', minute: '2-digit' })
}

/** Groups entries (assumed already sorted newest-first) into day sections. */
export function groupByDay(entries: Entry[]): { label: string; items: Entry[] }[] {
  const groups: { label: string; items: Entry[] }[] = []
  for (const entry of entries) {
    const label = formatEntryDay(entry.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(entry)
    else groups.push({ label, items: [entry] })
  }
  return groups
}
