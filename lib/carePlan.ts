// Single source of truth for the pregnancy timeline, shared by Today, Plan,
// Appointment Detail and Add Item so every screen sees the same state.
import { supabase } from './supabase'
import { addDays, computeCareItems, type CareItem } from './pregnancy'
import i18next from './i18n'

export const TODAY = new Date()

// Used only until the user has entered their own LMP during onboarding.
const FALLBACK_LMP = addDays(TODAY, -(11 * 7 + 3))

// `pregnancies.lmp_date` is a plain `date` column (a calendar day, no time
// or timezone) — toISOString()/`new Date(string)` both convert through UTC,
// which silently shifts the day in any timezone behind UTC. Serialize and
// parse using local date components instead.
function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

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

type PregnancyRow = { id: string; lmp_date: string; catchup_done: boolean; booked_done: boolean }

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub ?? null
}

// In-memory, session-only cache — 13 different screens independently call
// into this module on every focus, each re-fetching the same pregnancy row
// and care items, which is what the "jump from stale to real data" on every
// navigation actually was. Cleared on any write (see invalidateCache below)
// and on sign-out/account-deletion (clearCarePlanData), never persisted.
let pregnancyCache: { userId: string; row: PregnancyRow } | null = null
let careItemsCache: { pregnancyId: string; items: CareItemWithCustom[] } | null = null

function invalidateCache() {
  pregnancyCache = null
  careItemsCache = null
}

// Does NOT create a pregnancy row — only saveLMP does that (the real
// onboarding moment). Everything else here just reads whatever exists.
async function currentPregnancy(): Promise<PregnancyRow | null> {
  const userId = await currentUserId()
  if (!userId) return null
  if (pregnancyCache?.userId === userId) return pregnancyCache.row
  const { data } = await supabase.from('pregnancies').select('id,lmp_date,catchup_done,booked_done').eq('user_id', userId).maybeSingle()
  if (data) pregnancyCache = { userId, row: data }
  return data ?? null
}

/** For other modules (health_logs, birth_preferences) that need to scope their own rows to the current pregnancy. */
export async function currentPregnancyId(): Promise<string | null> {
  return (await currentPregnancy())?.id ?? null
}

function toRow(pregnancyId: string, userId: string, item: CareItemWithCustom) {
  return {
    pregnancy_id: pregnancyId,
    user_id: userId,
    id: item.id,
    title: item.title,
    window_start_week: item.windowStartWeek,
    window_end_week: item.windowEndWeek,
    booking_lead_days: item.bookingLeadDays,
    scheduled_at: item.scheduledAt?.toISOString() ?? null,
    scheduled_time_label: item.scheduledTimeLabel ?? null,
    location: item.location ?? null,
    prep_note: item.prepNote ?? null,
    visit_notes: item.visitNotes ?? null,
    done: item.done ?? false,
    done_at: item.doneAt?.toISOString() ?? null,
    skipped: item.skipped ?? false,
    skipped_at: item.skippedAt?.toISOString() ?? null,
    custom: item.custom ?? false,
  }
}

function fromRow(row: Record<string, any>): CareItemWithCustom {
  return {
    id: row.id,
    title: row.title,
    windowStartWeek: row.window_start_week,
    windowEndWeek: row.window_end_week,
    bookingLeadDays: row.booking_lead_days,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : undefined,
    scheduledTimeLabel: row.scheduled_time_label ?? undefined,
    location: row.location ?? undefined,
    prepNote: row.prep_note ?? undefined,
    visitNotes: row.visit_notes ?? undefined,
    done: row.done,
    doneAt: row.done_at ? new Date(row.done_at) : undefined,
    skipped: row.skipped,
    skippedAt: row.skipped_at ? new Date(row.skipped_at) : undefined,
    custom: row.custom,
  }
}

async function persistOne(id: string, items: CareItemWithCustom[]): Promise<void> {
  const item = items.find(i => i.id === id)
  const pregnancy = await currentPregnancy()
  const userId = await currentUserId()
  if (!item || !pregnancy || !userId) return
  await supabase.from('care_items').upsert(toRow(pregnancy.id, userId, item))
  careItemsCache = null
}

async function persistMany(ids: string[], items: CareItemWithCustom[]): Promise<void> {
  const pregnancy = await currentPregnancy()
  const userId = await currentUserId()
  if (!pregnancy || !userId) return
  const rows = items.filter(i => ids.includes(i.id)).map(i => toRow(pregnancy.id, userId, i))
  if (rows.length) await supabase.from('care_items').upsert(rows)
  careItemsCache = null
}

export async function loadCareItems(): Promise<CareItemWithCustom[]> {
  const pregnancy = await currentPregnancy()
  if (!pregnancy) return DEFAULT_CARE_ITEMS
  if (careItemsCache?.pregnancyId === pregnancy.id) return careItemsCache.items
  const { data } = await supabase.from('care_items').select('*').eq('pregnancy_id', pregnancy.id)
  const items = data && data.length ? data.map(fromRow) : DEFAULT_CARE_ITEMS
  careItemsCache = { pregnancyId: pregnancy.id, items }
  return items
}

export async function loadLMP(): Promise<Date> {
  const pregnancy = await currentPregnancy()
  return pregnancy ? fromLocalDateString(pregnancy.lmp_date) : FALLBACK_LMP
}

export async function hasLMP(): Promise<boolean> {
  return (await currentPregnancy()) != null
}

export async function saveLMP(date: Date): Promise<void> {
  const userId = await currentUserId()
  if (!userId) return
  const existing = await currentPregnancy()
  const lmpDate = toLocalDateString(date)
  if (existing) {
    await supabase.from('pregnancies').update({ lmp_date: lmpDate }).eq('id', existing.id)
    invalidateCache()
    return
  }
  // First time this user has ever saved an LMP — create the pregnancy row
  // and seed the real default care items in the same step (see BACKEND.md's
  // "care items must be seeded, not lazily created" note).
  const { data: created, error } = await supabase
    .from('pregnancies')
    .insert({ user_id: userId, lmp_date: lmpDate })
    .select('id')
    .single()
  if (error || !created) return
  const seedRows = DEFAULT_CARE_ITEMS.map(item => toRow(created.id, userId, item))
  await supabase.from('care_items').insert(seedRows)
  invalidateCache()
}

export async function hasCompletedCatchUp(): Promise<boolean> {
  return (await currentPregnancy())?.catchup_done ?? false
}

export async function markCatchUpDone(): Promise<void> {
  const pregnancy = await currentPregnancy()
  if (!pregnancy) return
  await supabase.from('pregnancies').update({ catchup_done: true }).eq('id', pregnancy.id)
  invalidateCache()
}

export async function hasCompletedBooked(): Promise<boolean> {
  return (await currentPregnancy())?.booked_done ?? false
}

export async function markBookedDone(): Promise<void> {
  const pregnancy = await currentPregnancy()
  if (!pregnancy) return
  await supabase.from('pregnancies').update({ booked_done: true }).eq('id', pregnancy.id)
  invalidateCache()
}

// No remote data to clear (server-side, cascade-deleted on account
// deletion) — the cache is already scoped per user/pregnancy id so it can't
// leak across accounts, but clearing it here avoids holding onto a signed-out
// session's data in memory any longer than necessary.
export async function clearCarePlanData(): Promise<void> {
  invalidateCache()
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
  await persistOne(id, next)
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
  await persistOne(entry.id, next)
  return next
}

export async function markDone(items: CareItemWithCustom[], id: string): Promise<CareItemWithCustom[]> {
  const next = items.map(i => i.id === id ? { ...i, done: true, doneAt: new Date() } : i)
  await persistOne(id, next)
  return next
}

export async function markManyDone(items: CareItemWithCustom[], ids: string[]): Promise<CareItemWithCustom[]> {
  const idSet = new Set(ids)
  const doneAt = new Date()
  const next = items.map(i => idSet.has(i.id) ? { ...i, done: true, doneAt } : i)
  await persistMany(ids, next)
  return next
}

export async function unmarkDone(items: CareItemWithCustom[], id: string): Promise<CareItemWithCustom[]> {
  const next = items.map(i => i.id === id ? { ...i, done: false, doneAt: undefined } : i)
  await persistOne(id, next)
  return next
}

export async function markSkipped(items: CareItemWithCustom[], id: string): Promise<CareItemWithCustom[]> {
  const next = items.map(i => i.id === id ? { ...i, skipped: true, skippedAt: new Date() } : i)
  await persistOne(id, next)
  return next
}

export async function markManySkipped(items: CareItemWithCustom[], ids: string[]): Promise<CareItemWithCustom[]> {
  const idSet = new Set(ids)
  const skippedAt = new Date()
  const next = items.map(i => idSet.has(i.id) ? { ...i, skipped: true, skippedAt } : i)
  await persistMany(ids, next)
  return next
}

export async function unmarkSkipped(items: CareItemWithCustom[], id: string): Promise<CareItemWithCustom[]> {
  const next = items.map(i => i.id === id ? { ...i, skipped: false, skippedAt: undefined } : i)
  await persistOne(id, next)
  return next
}

export async function removeItem(items: CareItemWithCustom[], id: string): Promise<CareItemWithCustom[]> {
  const next = items.filter(i => i.id !== id)
  const pregnancy = await currentPregnancy()
  if (pregnancy) {
    await supabase.from('care_items').delete().eq('pregnancy_id', pregnancy.id).eq('id', id)
    careItemsCache = null
  }
  return next
}

export async function saveVisitNotes(items: CareItemWithCustom[], id: string, notes: string): Promise<CareItemWithCustom[]> {
  const next = items.map(i => i.id === id ? { ...i, visitNotes: notes.trim() || undefined } : i)
  await persistOne(id, next)
  return next
}

export { computeCareItems }
