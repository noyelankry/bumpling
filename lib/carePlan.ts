// Single source of truth for the pregnancy timeline, shared by Today, Plan,
// Appointment Detail and Add Item so every screen sees the same state.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { addDays, computeCareItems, type CareItem } from './pregnancy'
import i18next from './i18n'

const ITEMS_KEY = 'bumpling_care_items'
const LMP_KEY = 'bumpling_lmp'
const CATCHUP_KEY = 'bumpling_catchup_done'
const BOOKED_KEY = 'bumpling_booked_done'

export const TODAY = new Date()

// Used only until the user has entered their own LMP during onboarding.
const FALLBACK_LMP = addDays(TODAY, -(11 * 7 + 3))

// Sourced from the user's prenatal care schedule (first/second/third
// trimester test chart). Window weeks are gestational weeks since LMP.
export const DEFAULT_CARE_ITEMS: CareItem[] = [
  // First trimester
  { id: 'first-ob-visit', title: 'First doctor visit', windowStartWeek: 0, windowEndWeek: 12, bookingLeadDays: 7 },
  { id: 'first-blood-tests', title: 'Blood tests', windowStartWeek: 0, windowEndWeek: 12, bookingLeadDays: 7 },
  { id: 'first-urine-tests', title: 'Urine tests', windowStartWeek: 0, windowEndWeek: 12, bookingLeadDays: 7 },
  { id: 'first-ultrasound', title: 'First ultrasound', windowStartWeek: 7, windowEndWeek: 8, bookingLeadDays: 5 },
  { id: 'genetic-screening', title: 'Genetic screening tests', windowStartWeek: 0, windowEndWeek: 13, bookingLeadDays: 7 },
  { id: 'nuchal-translucency', title: 'Nuchal translucency scan', windowStartWeek: 11, windowEndWeek: 13, bookingLeadDays: 10 },
  { id: 'first-tri-biochem', title: 'First trimester biochemical screening', windowStartWeek: 11, windowEndWeek: 13, bookingLeadDays: 10 },
  { id: 'cvs', title: 'Chorionic villus sampling (CVS)', windowStartWeek: 11, windowEndWeek: 13, bookingLeadDays: 10 },

  // Second trimester
  { id: 'early-anatomy-scan', title: 'Early anatomy scan', windowStartWeek: 14, windowEndWeek: 16, bookingLeadDays: 10 },
  { id: 'second-tri-biochem', title: 'Second trimester biochemical screening', windowStartWeek: 16, windowEndWeek: 19, bookingLeadDays: 10 },
  { id: 'amniocentesis', title: 'Amniocentesis', windowStartWeek: 16, windowEndWeek: 20, bookingLeadDays: 10 },
  { id: 'late-anatomy-scan', title: 'Late anatomy scan', windowStartWeek: 21, windowEndWeek: 24, bookingLeadDays: 10 },
  { id: 'fetal-echo', title: 'Fetal echocardiogram', windowStartWeek: 19, windowEndWeek: 25, bookingLeadDays: 10 },
  { id: 'glucose-test', title: 'Glucose tolerance test', windowStartWeek: 24, windowEndWeek: 28, bookingLeadDays: 10 },

  // Third trimester
  { id: 'pertussis-vaccine', title: 'Pertussis (Tdap) vaccine', windowStartWeek: 27, windowEndWeek: 36, bookingLeadDays: 14 },
  { id: 'third-tri-ultrasound', title: 'Third trimester ultrasound', windowStartWeek: 30, windowEndWeek: 33, bookingLeadDays: 10 },
  { id: 'gbs-culture', title: 'GBS culture (if indicated)', windowStartWeek: 35, windowEndWeek: 38, bookingLeadDays: 7 },
  { id: 'post-term-monitoring', title: 'Post-term monitoring', windowStartWeek: 40, windowEndWeek: 41, bookingLeadDays: 3 },
]

type StoredCareItem = Omit<CareItem, 'scheduledAt' | 'doneAt'> & { scheduledAt?: string; doneAt?: string; custom?: boolean }

export type CareItemWithCustom = CareItem & { custom?: boolean }

const DEFAULT_CARE_ITEM_IDS = new Set(DEFAULT_CARE_ITEMS.map(i => i.id))

// Default items' titles live in lib/i18n/locales/*/carePlan.json keyed by id
// and are always resolved fresh for the active language — the `title` field
// stored on the item (set once from the English catalog) is never read for
// these, so a stale translation can't get baked into storage. Custom items
// (user-typed, `custom: true`) keep their own literal title untouched.
export function getItemTitle(item: Pick<CareItemWithCustom, 'id' | 'title' | 'custom'>): string {
  if (item.custom || !DEFAULT_CARE_ITEM_IDS.has(item.id)) return item.title
  return i18next.t(`carePlan:${item.id}`, { defaultValue: item.title })
}

function serialize(items: CareItemWithCustom[]): StoredCareItem[] {
  return items.map(i => ({ ...i, scheduledAt: i.scheduledAt?.toISOString(), doneAt: i.doneAt?.toISOString() }))
}

function deserialize(stored: StoredCareItem[]): CareItemWithCustom[] {
  return stored.map(i => ({
    ...i,
    scheduledAt: i.scheduledAt ? new Date(i.scheduledAt) : undefined,
    doneAt: i.doneAt ? new Date(i.doneAt) : undefined,
  }))
}

export async function loadCareItems(): Promise<CareItemWithCustom[]> {
  const raw = await AsyncStorage.getItem(ITEMS_KEY)
  if (!raw) return DEFAULT_CARE_ITEMS
  try {
    return deserialize(JSON.parse(raw))
  } catch {
    return DEFAULT_CARE_ITEMS
  }
}

async function saveCareItems(items: CareItemWithCustom[]): Promise<void> {
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(serialize(items)))
}

export async function loadLMP(): Promise<Date> {
  const raw = await AsyncStorage.getItem(LMP_KEY)
  return raw ? new Date(raw) : FALLBACK_LMP
}

export async function hasLMP(): Promise<boolean> {
  return (await AsyncStorage.getItem(LMP_KEY)) != null
}

export async function saveLMP(date: Date): Promise<void> {
  await AsyncStorage.setItem(LMP_KEY, date.toISOString())
}

export async function hasCompletedCatchUp(): Promise<boolean> {
  return (await AsyncStorage.getItem(CATCHUP_KEY)) === 'true'
}

export async function markCatchUpDone(): Promise<void> {
  await AsyncStorage.setItem(CATCHUP_KEY, 'true')
}

export async function hasCompletedBooked(): Promise<boolean> {
  return (await AsyncStorage.getItem(BOOKED_KEY)) === 'true'
}

export async function markBookedDone(): Promise<void> {
  await AsyncStorage.setItem(BOOKED_KEY, 'true')
}

// Called on sign-out so the next login redoes LMP/catch-up/booked setup.
export async function clearCarePlanData(): Promise<void> {
  await AsyncStorage.multiRemove([ITEMS_KEY, LMP_KEY, CATCHUP_KEY, BOOKED_KEY])
}

/** Weeks-since-LMP for a plain calendar date — lets a user-picked date slot into the same window math. */
function weeksSinceLMP(date: Date, lmp: Date): number {
  return (date.getTime() - lmp.getTime()) / (7 * 24 * 60 * 60 * 1000)
}

export async function scheduleItem(
  items: CareItemWithCustom[],
  id: string,
  details: { title: string; date: Date; timeLabel?: string; location?: string; prepNote?: string }
): Promise<CareItemWithCustom[]> {
  const next = items.map(i =>
    i.id === id
      ? { ...i, title: details.title, scheduledAt: details.date, scheduledTimeLabel: details.timeLabel, location: details.location, prepNote: details.prepNote }
      : i
  )
  await saveCareItems(next)
  return next
}

export async function addCustomItem(
  items: CareItemWithCustom[],
  lmp: Date,
  details: { title: string; date: Date; timeLabel?: string; location?: string; prepNote?: string }
): Promise<CareItemWithCustom[]> {
  const week = weeksSinceLMP(details.date, lmp)
  const entry: CareItemWithCustom = {
    id: `custom-${Date.now()}`,
    title: details.title,
    windowStartWeek: week,
    windowEndWeek: week,
    bookingLeadDays: 0,
    scheduledAt: details.date,
    scheduledTimeLabel: details.timeLabel,
    location: details.location,
    prepNote: details.prepNote,
    custom: true,
  }
  const next = [...items, entry]
  await saveCareItems(next)
  return next
}

export async function markDone(items: CareItemWithCustom[], id: string): Promise<CareItemWithCustom[]> {
  const next = items.map(i => i.id === id ? { ...i, done: true, doneAt: new Date() } : i)
  await saveCareItems(next)
  return next
}

export async function markManyDone(items: CareItemWithCustom[], ids: string[]): Promise<CareItemWithCustom[]> {
  const idSet = new Set(ids)
  const doneAt = new Date()
  const next = items.map(i => idSet.has(i.id) ? { ...i, done: true, doneAt } : i)
  await saveCareItems(next)
  return next
}

export async function unmarkDone(items: CareItemWithCustom[], id: string): Promise<CareItemWithCustom[]> {
  const next = items.map(i => i.id === id ? { ...i, done: false, doneAt: undefined } : i)
  await saveCareItems(next)
  return next
}

export async function removeItem(items: CareItemWithCustom[], id: string): Promise<CareItemWithCustom[]> {
  const next = items.filter(i => i.id !== id)
  await saveCareItems(next)
  return next
}

export async function saveVisitNotes(items: CareItemWithCustom[], id: string, notes: string): Promise<CareItemWithCustom[]> {
  const next = items.map(i => i.id === id ? { ...i, visitNotes: notes.trim() || undefined } : i)
  await saveCareItems(next)
  return next
}

export { computeCareItems }
