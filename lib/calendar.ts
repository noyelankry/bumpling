// Adds a scheduled appointment to the device's native calendar.
// No web implementation exists for the underlying module beyond permission
// stubs (always denied), so this is native-only by design.
import { Platform } from 'react-native'
import * as Calendar from 'expo-calendar'
import type { TFunction } from 'i18next'

export type CalendarResult = { ok: boolean; message: string }

function combineDateAndTime(date: Date, timeLabel?: string): Date {
  const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const match = timeLabel?.trim().match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/i)
  if (!match) {
    combined.setHours(9, 0, 0, 0)
    return combined
  }
  let hours = Number(match[1])
  const minutes = match[2] ? Number(match[2]) : 0
  const meridiem = match[3]?.toUpperCase()
  if (meridiem === 'PM' && hours < 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  combined.setHours(hours, minutes, 0, 0)
  return combined
}

async function getWritableCalendarId(): Promise<string | null> {
  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync()
    return defaultCalendar.id
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const writable = calendars.find(c => c.allowsModifications) ?? calendars[0]
  return writable?.id ?? null
}

export async function addAppointmentToCalendar(
  details: {
    title: string
    date: Date
    timeLabel?: string
    location?: string
    notes?: string
  },
  t: TFunction<'business'>
): Promise<CalendarResult> {
  if (Platform.OS === 'web') {
    return { ok: false, message: t('calendar.webUnavailable') }
  }

  const { status } = await Calendar.requestCalendarPermissionsAsync()
  if (status !== 'granted') {
    return { ok: false, message: t('calendar.permissionDenied') }
  }

  const calendarId = await getWritableCalendarId()
  if (!calendarId) {
    return { ok: false, message: t('calendar.noCalendarFound') }
  }

  const startDate = combineDateAndTime(details.date, details.timeLabel)
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)

  await Calendar.createEventAsync(calendarId, {
    title: details.title,
    startDate,
    endDate,
    location: details.location,
    notes: details.notes,
  })

  return { ok: true, message: t('calendar.added') }
}
