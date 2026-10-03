// Shares an appointment with a partner. This app has no calendar-provider
// integration (no Google Calendar/OAuth), so there's no true RSVP-able
// invite — instead, when we have the partner's email, we open a pre-filled
// mail draft addressed to them; otherwise we fall back to the device share
// sheet so the user can pick wherever to send it.
import { Linking, Share, Platform } from 'react-native'
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

  if (Platform.OS === 'web') {
    return { ok: false, message: t('share.addPartnerEmail') }
  }

  try {
    await Share.share({ title: details.title, message: `${details.title}\n${body}` })
    return { ok: true, message: '' }
  } catch {
    return { ok: false, message: t('share.couldntOpenShareSheet') }
  }
}
