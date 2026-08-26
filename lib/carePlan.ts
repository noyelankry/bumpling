// Single source of truth for the seeded pregnancy timeline, shared by the
// Today and Plan screens so gestational age and care windows never drift
// out of sync between them.
import { addDays, computeCareItems, type CareItem } from './pregnancy'

export const TODAY = new Date()
export const LMP = addDays(TODAY, -(11 * 7 + 3))

export const CARE_ITEMS: CareItem[] = [
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

export const computedCareItems = computeCareItems(CARE_ITEMS, LMP, TODAY)
