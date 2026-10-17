// Renders the birth-preferences answers into a printable HTML document,
// shared as a PDF via expo-print/expo-sharing so it reads well for a
// hospital or care team rather than as a raw text dump.
import { Platform } from 'react-native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import i18n from './i18n'
import { getDateLocale } from './i18n/dateLocale'
import { optionFor, relationshipOption, type BirthPrefsData, type Topic, type TopicOption } from './birthPrefs'

export type BirthPlanDetails = {
  momName: string
  momPhone: string
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export function buildBirthPlanHtml(data: BirthPrefsData, details: BirthPlanDetails, topics: Topic[], relationshipOptions: TopicOption[]): string {
  const t = i18n.getFixedT(null, 'birthPlanDocument')
  const preparedOn = new Date().toLocaleDateString(getDateLocale(), { month: 'long', day: 'numeric', year: 'numeric' })
  const momName = escapeHtml(details.momName.trim() || t('defaultMomName'))
  const momPhone = escapeHtml(details.momPhone.trim())

  const contactRows = data.supportContacts.map(c => `
    <tr>
      <td class="name">${escapeHtml(c.name || t('unnamed'))}</td>
      <td>${escapeHtml(relationshipOption(relationshipOptions, c.relationship)?.label ?? c.relationship)}</td>
      <td>${escapeHtml(c.phone || '—')}</td>
    </tr>`).join('')

  const topicSections = topics.filter(topic => topic.kind !== 'contacts').map(topic => {
    const option = optionFor(topic, data.answers[topic.id])
    return `
    <div class="topic">
      <div class="topic-label">${escapeHtml(topic.navLabel)}</div>
      <div class="topic-question">${escapeHtml(topic.question)}</div>
      <div class="topic-answer ${option ? '' : 'unset'}">${escapeHtml(option ? option.label : t('notSetYet'))}</div>
    </div>`
  }).join('')

  const dir = i18n.language === 'he' ? 'rtl' : 'ltr'

  return `
<!doctype html>
<html dir="${dir}">
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 36px; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #2B2420; margin: 0; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #EFE4D8; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 24px; margin: 0; }
  .header .date { font-size: 12px; color: #8C8078; margin-top: 4px; }
  .badge { background: #EAE3F5; color: #6E5A96; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 999px; }

  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #8C8078; margin: 22px 0 8px; }

  .contact-card { background: #FDFBF8; border: 1px solid #EFE4D8; border-radius: 14px; padding: 14px 16px; margin-bottom: 8px; }
  .contact-card .label { font-size: 11px; color: #8C8078; }
  .contact-card .value { font-size: 15px; font-weight: 700; margin-top: 2px; }

  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { text-align: start; font-size: 11px; color: #8C8078; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 10px; border-bottom: 1px solid #EFE4D8; }
  td { font-size: 14px; padding: 10px; border-bottom: 1px solid #F3EAD8; }
  td.name { font-weight: 700; }
  .empty { font-size: 13px; color: #8C8078; font-style: italic; }

  .topic { background: #FFFFFF; border: 1px solid #EFE4D8; border-radius: 14px; padding: 12px 16px; margin-bottom: 8px; }
  .topic-label { font-size: 11px; font-weight: 700; color: #B6A2D9; text-transform: uppercase; letter-spacing: 0.5px; }
  .topic-question { font-size: 12.5px; color: #8C8078; margin-top: 2px; }
  .topic-answer { font-size: 15px; font-weight: 700; margin-top: 6px; }
  .topic-answer.unset { color: #8C8078; font-weight: 400; font-style: italic; }

  .footer-note { margin-top: 24px; background: #E4ECE1; border-radius: 14px; padding: 14px 16px; font-size: 12.5px; color: #2B2420; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${t('headerTitle', { name: momName })}</h1>
      <div class="date">${escapeHtml(t('preparedOn', { date: preparedOn }))}</div>
    </div>
    <div class="badge">${escapeHtml(t('forCareTeam'))}</div>
  </div>

  <div class="section-title">${escapeHtml(t('momsContact'))}</div>
  <div class="contact-card">
    <div class="label">${escapeHtml(t('name'))}</div>
    <div class="value">${momName}</div>
    ${momPhone ? `<div class="label" style="margin-top:8px">${escapeHtml(t('phone'))}</div><div class="value">${momPhone}</div>` : ''}
  </div>

  <div class="section-title">${escapeHtml(t('supportTeam'))}</div>
  ${contactRows ? `
  <table>
    <tr><th>${escapeHtml(t('name'))}</th><th>${escapeHtml(t('relationship'))}</th><th>${escapeHtml(t('phone'))}</th></tr>
    ${contactRows}
  </table>` : `<div class="empty">${escapeHtml(t('noContactsYet'))}</div>`}

  <div class="section-title">${escapeHtml(t('preferences'))}</div>
  ${topicSections}

  <div class="footer-note">${escapeHtml(t('unpredictableNote'))}</div>
</body>
</html>`
}

export type ExportResult = { ok: boolean; message?: string }

/** Web opens the browser print dialog (user saves as PDF); native generates a PDF file and opens the share sheet. */
export async function exportBirthPlanPdf(html: string): Promise<ExportResult> {
  const t = i18n.getFixedT(null, 'birthPlanDocument')
  try {
    if (Platform.OS === 'web') {
      await Print.printAsync({ html })
      return { ok: true }
    }
    const { uri } = await Print.printToFileAsync({ html })
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: t('shareDialogTitle') })
    }
    return { ok: true }
  } catch {
    return { ok: false, message: t('exportError') }
  }
}
