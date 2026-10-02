// Shared brain-dump storage: free-form notes and doctor questions, organized
// by category/tags and optionally linked to an upcoming appointment.
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'bumpling_brain_dump'

export type EntryCategory = 'doctor' | 'personal'

export type Entry = {
  id: string
  text: string
  details?: string
  category: EntryCategory
  tags: string[]
  linkedAppointmentId?: string
  linkedAppointmentTitle?: string
  done: boolean
  createdAt: string
}

export const SUGGESTED_TAGS = ['Sleep', 'Energy', 'Symptoms', 'Nutrition']

// Pre-rework entries only had `type` ('doctor' | 'thought') and no
// tags/details/link — map those into the current shape on load.
type StoredEntry = Partial<Entry> & { type?: 'doctor' | 'thought' }

function migrate(raw: StoredEntry[]): Entry[] {
  return raw.map(e => ({
    id: e.id ?? Date.now().toString(),
    text: e.text ?? '',
    details: e.details,
    category: e.category ?? (e.type === 'doctor' ? 'doctor' : 'personal'),
    tags: e.tags ?? [],
    linkedAppointmentId: e.linkedAppointmentId,
    linkedAppointmentTitle: e.linkedAppointmentTitle,
    done: e.done ?? false,
    createdAt: e.createdAt ?? new Date().toISOString(),
  }))
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
  category: EntryCategory
  details?: string
  tags?: string[]
  linkedAppointmentId?: string
  linkedAppointmentTitle?: string
}): Promise<Entry[]> {
  const entry: Entry = {
    id: Date.now().toString(),
    text: details.text,
    details: details.details?.trim() || undefined,
    category: details.category,
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
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** "Today" / "Yesterday" / "Sep 28" section label for a createdAt timestamp. */
export function formatEntryDay(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatEntryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
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
