// Single source of truth for the pregnancy timeline, shared by Today, Plan,
// Appointment Detail and Add Item so every screen sees the same state.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { addDays, computeCareItems, type CareItem } from './pregnancy'

const STORAGE_KEY = 'bumpling_care_items'

export const TODAY = new Date()
export const LMP = addDays(TODAY, -(11 * 7 + 3))

export const DEFAULT_CARE_ITEMS: CareItem[] = [
  {
    id: 'nipt',
    title: 'NIPT',
    windowStartWeek: 10,
    windowEndWeek: 13,
    bookingLeadDays: 5,
    scheduledAt: addDays(TODAY, 5),
    scheduledTimeLabel: '10:30 AM',
    prepNote: 'No fasting needed',
  },
  {
    id: 'nt',
    title: 'Nuchal translucency',
    windowStartWeek: 11,
    windowEndWeek: 14,
    bookingLeadDays: 12,
  },
  {
    id: 'anatomy',
    title: 'Early anatomy scan',
    windowStartWeek: 18,
    windowEndWeek: 20,
    bookingLeadDays: 10,
  },
]

type StoredCareItem = Omit<CareItem, 'scheduledAt'> & { scheduledAt?: string; custom?: boolean }

export type CareItemWithCustom = CareItem & { custom?: boolean }

function serialize(items: CareItemWithCustom[]): StoredCareItem[] {
  return items.map(i => ({ ...i, scheduledAt: i.scheduledAt?.toISOString() }))
}

function deserialize(stored: StoredCareItem[]): CareItemWithCustom[] {
  return stored.map(i => ({ ...i, scheduledAt: i.scheduledAt ? new Date(i.scheduledAt) : undefined }))
}

export async function loadCareItems(): Promise<CareItemWithCustom[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_CARE_ITEMS
  try {
    return deserialize(JSON.parse(raw))
  } catch {
    return DEFAULT_CARE_ITEMS
  }
}

async function saveCareItems(items: CareItemWithCustom[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(items)))
}

/** Weeks-since-LMP for a plain calendar date — lets a user-picked date slot into the same window math. */
function weeksSinceLMP(date: Date): number {
  return (date.getTime() - LMP.getTime()) / (7 * 24 * 60 * 60 * 1000)
}

export async function scheduleItem(
  items: CareItemWithCustom[],
  id: string,
  details: { title: string; date: Date; timeLabel?: string; prepNote?: string }
): Promise<CareItemWithCustom[]> {
  const next = items.map(i =>
    i.id === id
      ? { ...i, title: details.title, scheduledAt: details.date, scheduledTimeLabel: details.timeLabel, prepNote: details.prepNote }
      : i
  )
  await saveCareItems(next)
  return next
}

export async function addCustomItem(
  items: CareItemWithCustom[],
  details: { title: string; date: Date; timeLabel?: string; prepNote?: string }
): Promise<CareItemWithCustom[]> {
  const week = weeksSinceLMP(details.date)
  const entry: CareItemWithCustom = {
    id: `custom-${Date.now()}`,
    title: details.title,
    windowStartWeek: week,
    windowEndWeek: week,
    bookingLeadDays: 0,
    scheduledAt: details.date,
    scheduledTimeLabel: details.timeLabel,
    prepNote: details.prepNote,
    custom: true,
  }
  const next = [...items, entry]
  await saveCareItems(next)
  return next
}

export async function removeItem(items: CareItemWithCustom[], id: string): Promise<CareItemWithCustom[]> {
  const next = items.filter(i => i.id !== id)
  await saveCareItems(next)
  return next
}

export { computeCareItems }
