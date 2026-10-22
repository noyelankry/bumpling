// Shares an appointment with a partner. This app has no calendar-provider
// integration (no Google Calendar/OAuth), so there's no true RSVP-able
// invite — instead we hand off to the OS share sheet so the user can pick
// WhatsApp, Messages, email, or whatever they actually use with their
// partner, rather than forcing email specifically. A pre-filled mail draft
// is only a fallback, for the rare case the share sheet itself is
// unavailable (e.g. a desktop browser with no Web Share API support).
import { Linking, Share } from 'react-native'
import type { TFunction } from 'i18next'

export type ShareResult = { ok: boolean; message: string }

export async function shareAppointmentWithPartner(
  details: {
    title: string
    dateLabel: string
    timeLabel?: string
    location?: string
    notes?: string
    partnerEmail?: string
  },
  t: TFunction<'business'>
): Promise<ShareResult> {
  const body = [
    details.dateLabel,
    details.timeLabel,
    details.location,
    details.notes,
  ].filter(Boolean).join('\n')

  try {
    await Share.share({ title: details.title, message: `${details.title}\n${body}` })
    return { ok: true, message: '' }
  } catch {
    if (details.partnerEmail) {
      const url = `mailto:${encodeURIComponent(details.partnerEmail)}`
        + `?subject=${encodeURIComponent(t('share.emailSubject', { title: details.title }))}`
        + `&body=${encodeURIComponent(body)}`
      try {
        await Linking.openURL(url)
        return { ok: true, message: t('share.openedEmailTo', { email: details.partnerEmail }) }
      } catch {
        return { ok: false, message: t('share.couldntOpenMail') }
      }
    }
    return { ok: false, message: t('share.addPartnerEmail') }
  }
}
