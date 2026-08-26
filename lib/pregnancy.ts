// Gestational-age and care-window math: the app's "external brain" for
// converting fuzzy pregnancy-week language into real calendar dates.

export type CareStatus = 'scheduled' | 'actionable' | 'future'

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
  prepNote?: string
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

export function computeCareItems(items: CareItem[], lmp: Date, today: Date): ComputedCareItem[] {
  return items.map(item => {
    const windowStart = addWeeks(lmp, item.windowStartWeek)
    const windowEnd = addWeeks(lmp, item.windowEndWeek)
    const bookBy = addDays(windowEnd, -item.bookingLeadDays)

    let status: CareStatus
    if (item.scheduledAt) {
      status = 'scheduled'
    } else {
      const daysUntilBookBy = Math.floor((bookBy.getTime() - today.getTime()) / DAY_MS)
      status = daysUntilBookBy <= ACTIONABLE_HORIZON_DAYS ? 'actionable' : 'future'
    }

    return { ...item, windowStart, windowEnd, bookBy, status }
  })
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth()
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = sameMonth
    ? end.toLocaleDateString('en-US', { day: 'numeric' })
    : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${startStr}–${endStr}`
}

export function formatWeekday(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
