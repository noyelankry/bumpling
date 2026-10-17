// Gestational-age and care-window math: the app's "external brain" for
// converting fuzzy pregnancy-week language into real calendar dates.
import { getDateLocale } from './i18n/dateLocale'

export type CareStatus = 'done' | 'scheduled' | 'actionable' | 'future' | 'missed' | 'skipped'

export type CareItem = {
  id: string
  title: string
  /** Ideal gestational window, in weeks since LMP (e.g. 11 = 11+0). */
  windowStartWeek: number
  windowEndWeek: number
  /** Days of lead time needed to book before the window closes. */
  bookingLeadDays: number
  /** Present once the user has actually booked it. */
  scheduledAt?: Date
  scheduledTimeLabel?: string
  /** Doctor name and/or clinic/location — free text, shown alongside the scheduled date. */
  location?: string
  prepNote?: string
  /** Post-visit notes/summary — what actually happened, added after the fact. */
  visitNotes?: string
  /** Set when the user tells us they'd already done this before adding it to the app. */
  done?: boolean
  /** When they told us, not when the test itself happened — informational only. */
  doneAt?: Date
  /** Set when the user explicitly dismisses a missed window without having done it. */
  skipped?: boolean
  skippedAt?: Date
}

export type ComputedCareItem = CareItem & {
  windowStart: Date
  windowEnd: Date
  bookBy: Date
  status: CareStatus
}

const DAY_MS = 24 * 60 * 60 * 1000

/** How far ahead of a booking deadline an item is worth surfacing. */
const ACTIONABLE_HORIZON_DAYS = 30

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7)
}

export function gestationalAge(lmp: Date, today: Date) {
  const totalDays = Math.floor((today.getTime() - lmp.getTime()) / DAY_MS)
  return { weeks: Math.floor(totalDays / 7), days: totalDays % 7, totalDays }
}

export function computeCareItems<T extends CareItem>(items: T[], lmp: Date, today: Date): (T & Omit<ComputedCareItem, keyof CareItem>)[] {
  return items.map(item => {
    const windowStart = addWeeks(lmp, item.windowStartWeek)
    const windowEnd = addWeeks(lmp, item.windowEndWeek)
    const bookBy = addDays(windowEnd, -item.bookingLeadDays)

    let status: CareStatus
    if (item.done) {
      status = 'done'
    } else if (item.skipped) {
      status = 'skipped'
    } else if (item.scheduledAt) {
      status = 'scheduled'
    } else if (today.getTime() > windowEnd.getTime()) {
      // Window fully closed with nothing booked — stop nagging with a
      // "book by" date that's already in the past (see markSkipped).
      status = 'missed'
    } else {
      const daysUntilBookBy = Math.floor((bookBy.getTime() - today.getTime()) / DAY_MS)
      status = daysUntilBookBy <= ACTIONABLE_HORIZON_DAYS ? 'actionable' : 'future'
    }

    return { ...item, windowStart, windowEnd, bookBy, status }
  })
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString(getDateLocale(), { month: 'short', day: 'numeric' })
}

export function formatDateRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth()
  const startStr = start.toLocaleDateString(getDateLocale(), { month: 'short', day: 'numeric' })
  const endStr = sameMonth
    ? end.toLocaleDateString(getDateLocale(), { day: 'numeric' })
    : end.toLocaleDateString(getDateLocale(), { month: 'short', day: 'numeric' })
  return `${startStr}–${endStr}`
}

export function formatWeekday(date: Date): string {
  return date.toLocaleDateString(getDateLocale(), { weekday: 'short', month: 'short', day: 'numeric' })
}
