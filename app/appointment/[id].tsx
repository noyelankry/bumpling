import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { formatDate, formatDateRange, formatWeekday, type CareStatus } from '../../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, removeItem, markDone, unmarkDone, markSkipped, unmarkSkipped, saveVisitNotes, computeCareItems, getItemTitle, currentRole, type CareItemWithCustom } from '../../lib/carePlan'
import { addAppointmentToCalendar } from '../../lib/calendar'
import { shareAppointmentWithPartner } from '../../lib/shareAppointment'
import { type Partner, loadPartner } from '../../lib/partner'
import { goBack } from '../../lib/navigation'
import { useDirectionalIcon } from '../../lib/i18n/useDirectionalIcon'
import { useLanguage } from '../../lib/i18n/LanguageProvider'
import { getTestPurpose } from '../../lib/pregnancyContent'

type StatusLabelKey = 'statusDone' | 'statusScheduled' | 'statusActionable' | 'statusMissed' | 'statusSkipped' | 'statusFuture'

// A colored dot + label carries status now, not a pill — so this only needs
// to decide a color and a copy key, not icon/background/text style variants.
function statusVisual(status: CareStatus): { color: string; labelKey: StatusLabelKey } {
  switch (status) {
    case 'done': return { color: colors.sageDeep, labelKey: 'statusDone' }
    case 'scheduled': return { color: colors.sageDeep, labelKey: 'statusScheduled' }
    case 'actionable': return { color: colors.urgent, labelKey: 'statusActionable' }
    case 'missed': return { color: colors.neutralChipDeep, labelKey: 'statusMissed' }
    case 'skipped': return { color: colors.neutralChipDeep, labelKey: 'statusSkipped' }
    default: return { color: colors.neutralChipDeep, labelKey: 'statusFuture' }
  }
}

function ListRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { isRTL } = useLanguage()
  return (
    <View style={styles.listRow}>
      <Text style={styles.listLabel}>{label}</Text>
      <Text style={[styles.listValue, isRTL ? styles.listValueRTL : styles.listValueLTR, accent && styles.listValueAccent]} numberOfLines={1}>{value}</Text>
    </View>
  )
}

export default function AppointmentDetailScreen() {
  const router = useRouter()
  const { t } = useTranslation('appointmentDetail')
  const { t: tBusiness } = useTranslation('business')
  const { back: backIcon, forward } = useDirectionalIcon()
  const { isRTL, language } = useLanguage()
  const back = () => goBack(router, '/(tabs)/plan')
  const { id } = useLocalSearchParams<{ id: string }>()
  const [items, setItems] = useState<CareItemWithCustom[]>(DEFAULT_CARE_ITEMS)
  const [lmp, setLmp] = useState<Date>(TODAY)
  const [partner, setPartner] = useState<Partner>({ name: '', email: '' })
  const [notesDraft, setNotesDraft] = useState('')
  const [notesEditing, setNotesEditing] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [isPartnerView, setIsPartnerView] = useState(false)
  // Resets per id — a different appointment is genuinely different data, not
  // a case where showing the previous one briefly is harmless.
  const [loaded, setLoaded] = useState(false)

  useFocusEffect(useCallback(() => {
    setLoaded(false)
    Promise.all([loadCareItems(), loadLMP(), loadPartner(), currentRole()]).then(([all, lmpDate, p, role]) => {
      setItems(all)
      setNotesDraft(all.find(i => i.id === id)?.visitNotes ?? '')
      setLmp(lmpDate)
      setPartner(p)
      setIsPartnerView(role === 'partner')
      setLoaded(true)
    })
    setNotesEditing(false)
  }, [id]))

  const computed = useMemo(() => computeCareItems(items, lmp, TODAY), [items, lmp])
  const item = computed.find(i => i.id === id)
  const visual = item ? statusVisual(item.status) : null
  const daysLeft = item ? Math.max(0, Math.ceil((item.bookBy.getTime() - TODAY.getTime()) / 86400000)) : 0
  const title = item ? getItemTitle(item) : ''
  // Only the default care-chart items carry real trimester meaning — a
  // custom entry (baby shower, shopping list) shouldn't get labeled "Third
  // trimester" just because of when its date happens to fall. Skipped
  // entirely when the title already leads with it (e.g. "Second trimester
  // biochemical screening"), so the eyebrow never just repeats the headline.
  const rawTrimesterLabel = item && !item.custom
    ? (item.windowStartWeek < 14 ? t('trimester1') : item.windowStartWeek < 28 ? t('trimester2') : t('trimester3'))
    : undefined
  const trimesterLabel = rawTrimesterLabel && !title.toLowerCase().startsWith(rawTrimesterLabel.toLowerCase())
    ? rawTrimesterLabel
    : undefined
  const testPurpose = item && !item.custom ? getTestPurpose(item.id, language) : undefined

  if (!loaded) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={back} title={t('defaultTitle')} backIcon={backIcon} />
        <View style={styles.notFound}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={back} title={t('defaultTitle')} backIcon={backIcon} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('notFound')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  async function handleRemove() {
    const doRemove = async () => {
      const next = await removeItem(items, item!.id)
      setItems(next)
      back()
    }
    if (Platform.OS === 'web') {
      if (window.confirm(t('removeConfirmTitle'))) doRemove()
      return
    }
    Alert.alert(t('removeConfirmTitle'), '', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('remove'), style: 'destructive', onPress: doRemove },
    ])
  }

  async function handleMarkDone() {
    const next = await markDone(items, item!.id)
    setItems(next)
  }

  async function handleUnmarkDone() {
    const next = await unmarkDone(items, item!.id)
    setItems(next)
  }

  async function handleSkip() {
    const next = await markSkipped(items, item!.id)
    setItems(next)
  }

  async function handleUnmarkSkip() {
    const next = await unmarkSkipped(items, item!.id)
    setItems(next)
  }

  async function handleAddToCalendar() {
    const result = await addAppointmentToCalendar({
      title: getItemTitle(item!),
      date: item!.scheduledAt!,
      timeLabel: item!.scheduledTimeLabel,
      location: item!.location,
      notes: item!.prepNote,
    }, tBusiness)
    if (Platform.OS === 'web') {
      window.alert(result.message)
    } else {
      Alert.alert(result.ok ? t('addedTitle') : t('couldntAddToCalendar'), result.message)
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    const next = await saveVisitNotes(items, item!.id, notesDraft)
    setItems(next)
    setSavingNotes(false)
    setNotesEditing(false)
  }

  function cancelNotesEdit() {
    setNotesDraft(item!.visitNotes ?? '')
    setNotesEditing(false)
  }

  async function handleSharePartner() {
    const dateLabel = item!.scheduledAt
      ? formatWeekday(item!.scheduledAt)
      : t('targetDates') + ': ' + formatDateRange(item!.windowStart, item!.windowEnd)
    const result = await shareAppointmentWithPartner({
      title: getItemTitle(item!),
      dateLabel,
      timeLabel: item!.scheduledTimeLabel,
      location: item!.location,
      notes: item!.visitNotes || item!.prepNote,
      partnerEmail: partner.email || undefined,
    }, tBusiness)
    if (!result.message) return
    if (Platform.OS === 'web') {
      window.alert(result.message)
    } else {
      Alert.alert(result.ok ? t('sharedTitle') : t('couldntShare'), result.message)
    }
  }

  const showList = item.status !== 'done' && item.status !== 'skipped'

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={back} title={title} backIcon={backIcon} eyebrow={trimesterLabel} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.statusLine}>
          <View style={[styles.statusDot, { backgroundColor: visual!.color }]} />
          <Text style={[styles.statusText, { color: visual!.color }]}>{t(visual!.labelKey)}</Text>
        </View>

        {!!testPurpose && (
          <View style={styles.purposeCard}>
            <Ionicons name="information-circle-outline" size={16} color={colors.lavenderDeep} style={{ marginTop: 2 }} />
            <Text style={styles.purposeText}>{testPurpose}</Text>
          </View>
        )}

        {showList && (
          <View style={styles.list}>
            {item.scheduledAt ? (
              <>
                <ListRow label={t('when')} value={formatWeekday(item.scheduledAt)} />
                {!!item.scheduledTimeLabel && <ListRow label={t('time')} value={item.scheduledTimeLabel} />}
                {!!item.location && <ListRow label={t('location')} value={item.location} />}
              </>
            ) : (
              <>
                <ListRow label={t('targetDates')} value={formatDateRange(item.windowStart, item.windowEnd)} />
                {item.status === 'actionable' && (
                  <>
                    <ListRow label={t('bookBy')} value={formatDate(item.bookBy)} accent />
                    <ListRow label={t('timeRemaining')} value={t('daysLeft', { count: daysLeft })} accent />
                  </>
                )}
              </>
            )}
          </View>
        )}

        {!!item.prepNote && item.scheduledAt && (
          <Text style={styles.prepText}>{item.prepNote}</Text>
        )}
        {item.status === 'missed' && (
          <Text style={styles.prepText}>{t('windowClosed')}</Text>
        )}

        {item.status === 'done' && !!item.doneAt && (
          <Text style={styles.statusCaption}>{t('markedDoneOn', { date: formatDate(item.doneAt) })}</Text>
        )}
        {item.status === 'skipped' && !!item.skippedAt && (
          <Text style={styles.statusCaption}>{t('markedSkippedOn', { date: formatDate(item.skippedAt) })}</Text>
        )}

        {item.status === 'done' ? (
          !isPartnerView && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleUnmarkDone}>
              <Text style={styles.secondaryBtnText}>{t('undo')}</Text>
            </TouchableOpacity>
          )
        ) : item.status === 'skipped' ? (
          !isPartnerView && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleUnmarkSkip}>
              <Text style={styles.secondaryBtnText}>{t('undo')}</Text>
            </TouchableOpacity>
          )
        ) : item.scheduledAt ? (
          <>
            {!isPartnerView && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push({
                  pathname: '/add-item',
                  params: {
                    id: item.id,
                    title: title,
                    date: item.scheduledAt!.toISOString(),
                    time: item.scheduledTimeLabel ?? '',
                    location: item.location ?? '',
                    prepNote: item.prepNote ?? '',
                    windowStart: item.windowStart.toISOString(),
                    windowEnd: item.windowEnd.toISOString(),
                  },
                })}
              >
                <Text style={styles.secondaryBtnText}>{t('changeDetails')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleAddToCalendar}>
              <Text style={styles.secondaryBtnText}>{t('addToCalendar')}</Text>
            </TouchableOpacity>
          </>
        ) : item.status === 'missed' ? (
          !isPartnerView && (
            <>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleMarkDone}>
                <Text style={styles.primaryBtnText}>{t('iAlreadyDidThis')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkip}>
                <Text style={styles.secondaryBtnText}>{t('skipThisOne')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tertiaryBtn}
                onPress={() => router.push({ pathname: '/add-item', params: { id: item.id, title: title, prepNote: item.prepNote ?? '', windowStart: item.windowStart.toISOString(), windowEnd: item.windowEnd.toISOString() } })}
              >
                <Text style={styles.tertiaryBtnText}>{t('scheduleAnyway')}</Text>
              </TouchableOpacity>
            </>
          )
        ) : (
          !isPartnerView && (
            <>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push({ pathname: '/add-item', params: { id: item.id, title: title, prepNote: item.prepNote ?? '', windowStart: item.windowStart.toISOString(), windowEnd: item.windowEnd.toISOString() } })}
              >
                <Text style={styles.primaryBtnText}>{t('scheduleNow')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleMarkDone}>
                <Text style={styles.secondaryBtnText}>{t('iAlreadyDidThis')}</Text>
              </TouchableOpacity>
            </>
          )
        )}

        {(!isPartnerView || !!item.visitNotes) && (
          <>
            <Text style={styles.sectionLabel}>{t('moreSection')}</Text>
            <View style={styles.list}>

              {notesEditing ? (
                <View style={styles.notesEditRow}>
                  <Text style={styles.listLabel}>{t('notesTitle')}</Text>
                  <TextInput
                    style={[styles.notesInput, isRTL && styles.notesInputRTL]}
                    value={notesDraft}
                    onChangeText={setNotesDraft}
                    placeholder={t('notesPlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    autoFocus
                  />
                  <View style={styles.notesActionRow}>
                    <TouchableOpacity style={styles.notesCancelBtn} onPress={cancelNotesEdit} disabled={savingNotes}>
                      <Text style={styles.notesCancelBtnText}>{t('cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.notesSaveBtn} onPress={handleSaveNotes} disabled={savingNotes}>
                      <Text style={styles.notesSaveBtnText}>{t('save')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : isPartnerView ? (
                <View style={styles.subRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subRowTitle}>{t('notesTitle')}</Text>
                    <Text style={styles.subRowCaption} numberOfLines={2}>{item.visitNotes}</Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.subRow} activeOpacity={0.6} onPress={() => setNotesEditing(true)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subRowTitle}>{t('notesTitle')}</Text>
                    <Text style={styles.subRowCaption} numberOfLines={2}>{item.visitNotes || t('notesEmpty')}</Text>
                  </View>
                  <Ionicons name={item.visitNotes ? 'pencil-outline' : 'add'} size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

              {!isPartnerView && (
                <TouchableOpacity style={styles.subRow} activeOpacity={0.6} onPress={handleSharePartner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subRowTitle}>{partner.name ? t('shareWithPartner', { name: partner.name }) : t('shareWithYourPartner')}</Text>
                    <Text style={styles.subRowCaption} numberOfLines={1}>{t('shareSub')}</Text>
                  </View>
                  <Ionicons name={forward} size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

              {!isPartnerView && (
                <TouchableOpacity style={styles.subRow} activeOpacity={0.6} onPress={() => router.push('/brain-dump')}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subRowTitle}>{t('questionsForDoctor')}</Text>
                    <Text style={styles.subRowCaption} numberOfLines={1}>{t('questionsForDoctorSub')}</Text>
                  </View>
                  <Ionicons name={forward} size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

            </View>
          </>
        )}

        {item.custom && !isPartnerView && (
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
            <Text style={styles.removeBtnText}>{t('removeFromPlan')}</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

function Header({ onBack, title, backIcon, eyebrow }: { onBack: () => void; title: string; backIcon: 'chevron-back' | 'chevron-forward'; eyebrow?: string }) {
  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name={backIcon} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.titleBlock}>
        {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.pageTitle} numberOfLines={3}>{title}</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs, paddingTop: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },

  titleBlock: { paddingHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.sm },
  eyebrow:    { fontSize: 11.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 4 },
  pageTitle:  { fontFamily: fonts.headlineBold, fontSize: 26, color: colors.textPrimary, lineHeight: 31 },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56 },

  notFound:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  notFoundText: { fontSize: 14, color: colors.textSecondary },

  // Status reads as a colored dot + word, not a filled pill — the first of
  // several "no containers, let color and type carry it" moves on this screen.
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: spacing.lg },
  statusDot:  { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 15, fontWeight: '600' },

  purposeCard: { flexDirection: 'row', gap: 10, backgroundColor: colors.lavender, borderRadius: radius.xl, padding: spacing.sm, marginBottom: spacing.lg, alignItems: 'flex-start' },
  purposeText: { flex: 1, fontSize: 13.5, color: colors.textPrimary, opacity: 0.8, lineHeight: 19 },

  // A plain hairline-divided list (Apple Settings/Health style) stands in
  // for the old bordered-and-shadowed card — every row closed by a rule,
  // including the last one, so the list reads as a complete, closed group.
  list:    { borderTopWidth: 1, borderTopColor: colors.border },
  listRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  listLabel: { fontSize: 15, color: colors.textPrimary },
  listValue:    { flex: 1, fontSize: 15, color: colors.textSecondary },
  listValueLTR: { textAlign: 'right' },
  listValueRTL: { textAlign: 'left' },
  listValueAccent: { color: colors.urgent, fontWeight: '700' },

  prepText:     { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19, marginTop: spacing.sm },
  statusCaption: { fontSize: 13.5, color: colors.textSecondary, marginTop: spacing.sm },

  primaryBtn:     { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: spacing.md },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
  secondaryBtn:     { alignItems: 'center', paddingVertical: 10, marginTop: spacing.sm },
  secondaryBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13.5 },
  tertiaryBtn:      { alignItems: 'center', paddingVertical: 6 },
  tertiaryBtnText:  { color: colors.textSecondary, fontWeight: '600', fontSize: 12.5, textDecorationLine: 'underline' },

  sectionLabel: { fontSize: 11.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginTop: spacing.lg, marginBottom: 6 },

  subRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  subRowTitle:   { fontSize: 15, color: colors.textPrimary },
  subRowCaption: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },

  notesEditRow:   { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  notesInput:     { fontSize: 14, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top', backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm, textAlign: 'left' },
  notesInputRTL:  { textAlign: 'right' },
  notesActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  notesCancelBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  notesCancelBtnText: { fontSize: 13.5, fontWeight: '600', color: colors.textSecondary },
  notesSaveBtn:   { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 18 },
  notesSaveBtnText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },

  removeBtn:     { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.md },
  removeBtnText: { fontSize: 13.5, fontWeight: '600', color: colors.urgent },
})
