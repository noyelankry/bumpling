// Shared brain-dump storage: free-form notes and doctor questions,
// optionally enriched with details/tags/an appointment link.
import AsyncStorage from '@react-native-async-storage/async-storage'
import i18next from './i18n'
import { getDateLocale } from './i18n/dateLocale'

const STORAGE_KEY = 'bumpling_brain_dump'

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

// Earlier shapes had `type` ('doctor' | 'thought') or `category`
// ('doctor' | 'personal') instead of `kind`, and no tags/details/link; a
// since-removed 'symptom' kind also folds into 'thought' here.
type StoredEntry = Partial<Omit<Entry, 'kind'>> & { kind?: string; type?: string; category?: string }

function migrate(raw: StoredEntry[]): Entry[] {
  return raw.map(e => {
    const kind: EntryKind = (e.kind ?? e.category ?? e.type) === 'doctor' ? 'doctor' : 'thought'
    return {
      id: e.id ?? Date.now().toString(),
      text: e.text ?? '',
      details: e.details,
      kind,
      tags: e.tags ?? [],
      linkedAppointmentId: e.linkedAppointmentId,
      linkedAppointmentTitle: e.linkedAppointmentTitle,
      done: e.done ?? false,
      createdAt: e.createdAt ?? new Date().toISOString(),
    }
  })
}

export async function loadEntries(): Promise<Entry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return migrate(JSON.parse(raw))
  } catch {
    return []
  }
}

async function saveEntries(entries: Entry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export async function addEntry(entries: Entry[], details: {
  text: string
  kind: EntryKind
  details?: string
  tags?: string[]
  linkedAppointmentId?: string
  linkedAppointmentTitle?: string
}): Promise<Entry[]> {
  const entry: Entry = {
    id: Date.now().toString(),
    text: details.text,
    details: details.details?.trim() || undefined,
    kind: details.kind,
    tags: details.tags ?? [],
    linkedAppointmentId: details.linkedAppointmentId,
    linkedAppointmentTitle: details.linkedAppointmentTitle,
    done: false,
    createdAt: new Date().toISOString(),
  }
  const next = [entry, ...entries]
  await saveEntries(next)
  return next
}

export async function updateEntry(entries: Entry[], id: string, details: {
  text: string
  kind: EntryKind
  details?: string
  tags?: string[]
  linkedAppointmentId?: string
  linkedAppointmentTitle?: string
}): Promise<Entry[]> {
  const next = entries.map(e => e.id === id ? {
    ...e,
    text: details.text,
    details: details.details?.trim() || undefined,
    kind: details.kind,
    tags: details.tags ?? [],
    linkedAppointmentId: details.linkedAppointmentId,
    linkedAppointmentTitle: details.linkedAppointmentTitle,
  } : e)
  await saveEntries(next)
  return next
}

export async function toggleDone(entries: Entry[], id: string): Promise<Entry[]> {
  const next = entries.map(e => e.id === id ? { ...e, done: !e.done } : e)
  await saveEntries(next)
  return next
}

export async function removeEntry(entries: Entry[], id: string): Promise<Entry[]> {
  const next = entries.filter(e => e.id !== id)
  await saveEntries(next)
  return next
}

export async function clearBrainDumpData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}

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
