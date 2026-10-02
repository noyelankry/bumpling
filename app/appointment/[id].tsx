import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { formatDate, formatDateRange, formatWeekday } from '../../lib/pregnancy'
import { TODAY, DEFAULT_CARE_ITEMS, loadCareItems, loadLMP, removeItem, markDone, unmarkDone, saveVisitNotes, computeCareItems, type CareItemWithCustom } from '../../lib/carePlan'
import { addAppointmentToCalendar } from '../../lib/calendar'
import { shareAppointmentWithPartner } from '../../lib/shareAppointment'
import { type Partner, loadPartner } from '../../lib/partner'
import { goBack } from '../../lib/navigation'

export default function AppointmentDetailScreen() {
  const router = useRouter()
  const back = () => goBack(router, '/(tabs)/plan')
  const { id } = useLocalSearchParams<{ id: string }>()
  const [items, setItems] = useState<CareItemWithCustom[]>(DEFAULT_CARE_ITEMS)
  const [lmp, setLmp] = useState<Date>(TODAY)
  const [partner, setPartner] = useState<Partner>({ name: '', email: '' })
  const [notesDraft, setNotesDraft] = useState('')
  const [notesEditing, setNotesEditing] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)

  useFocusEffect(useCallback(() => {
    loadCareItems().then(all => {
      setItems(all)
      setNotesDraft(all.find(i => i.id === id)?.visitNotes ?? '')
    })
    loadLMP().then(setLmp)
    loadPartner().then(setPartner)
    setNotesEditing(false)
  }, [id]))

  const computed = useMemo(() => computeCareItems(items, lmp, TODAY), [items, lmp])
  const item = computed.find(i => i.id === id)

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={back} title="Appointment" />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>This item isn't on your plan anymore.</Text>
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
      if (window.confirm('Remove this from your plan?')) doRemove()
      return
    }
    Alert.alert('Remove from plan?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doRemove },
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

  async function handleAddToCalendar() {
    const result = await addAppointmentToCalendar({
      title: item!.title,
      date: item!.scheduledAt!,
      timeLabel: item!.scheduledTimeLabel,
      location: item!.location,
      notes: item!.prepNote,
    })
    if (Platform.OS === 'web') {
      window.alert(result.message)
    } else {
      Alert.alert(result.ok ? 'Added' : "Couldn't add to calendar", result.message)
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
      : `Target dates: ${formatDateRange(item!.windowStart, item!.windowEnd)}`
    const result = await shareAppointmentWithPartner({
      title: item!.title,
      dateLabel,
      timeLabel: item!.scheduledTimeLabel,
      location: item!.location,
      notes: item!.visitNotes || item!.prepNote,
      partnerEmail: partner.email || undefined,
    })
    if (!result.message) return
    if (Platform.OS === 'web') {
      window.alert(result.message)
    } else {
      Alert.alert(result.ok ? 'Shared' : "Couldn't share", result.message)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={back} title={item.title} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={[
          styles.statusPill,
          item.status === 'actionable' && styles.statusPillUrgent,
          item.status === 'done' && styles.statusPillDone,
        ]}>
          <Ionicons
            name={item.status === 'done' ? 'checkmark-circle' : item.status === 'scheduled' ? 'checkmark-circle-outline' : item.status === 'actionable' ? 'alert-circle-outline' : 'time-outline'}
            size={14}
            color={item.status === 'done' || item.status === 'scheduled' ? colors.sageDeep : item.status === 'actionable' ? colors.urgent : colors.neutralChipDeep}
          />
          <Text style={[
            styles.statusPillText,
            item.status === 'actionable' && styles.statusPillTextUrgent,
            item.status === 'future' && styles.statusPillTextNeutral,
          ]}>
            {item.status === 'done' ? 'Already done' : item.status === 'scheduled' ? 'Scheduled' : item.status === 'actionable' ? 'Needs scheduling' : "We'll remind you later"}
          </Text>
        </View>

        <View style={styles.card}>
          {item.scheduledAt ? (
            <>
              <Text style={styles.bigDate}>{formatWeekday(item.scheduledAt)}</Text>
              {!!item.scheduledTimeLabel && <Text style={styles.timeLabel}>{item.scheduledTimeLabel}</Text>}
              {!!item.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>
              )}
              {!!item.prepNote && (
                <View style={styles.prepRow}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.sageDeep} />
                  <Text style={styles.prepText}>{item.prepNote}</Text>
                </View>
              )}
            </>
          ) : item.status === 'done' ? (
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={22} color={colors.sageDeep} />
              <Text style={styles.bigDate}>You already did this</Text>
            </View>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Target dates</Text>
              <Text style={styles.rangeText}>{formatDateRange(item.windowStart, item.windowEnd)}</Text>
              {item.status === 'actionable' && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>Book by</Text>
                  <Text style={styles.bookByText}>{formatDate(item.bookBy)}</Text>
                </>
              )}
            </>
          )}

          {item.status === 'done' && !!item.doneAt && (
            <Text style={styles.timeLabel}>Marked done on {formatDate(item.doneAt)}</Text>
          )}

          {item.status === 'done' ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleUnmarkDone}>
              <Text style={styles.secondaryBtnText}>Undo</Text>
            </TouchableOpacity>
          ) : item.scheduledAt ? (
            <>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push({
                  pathname: '/add-item',
                  params: {
                    id: item.id,
                    title: item.title,
                    date: item.scheduledAt!.toISOString(),
                    time: item.scheduledTimeLabel ?? '',
                    location: item.location ?? '',
                    prepNote: item.prepNote ?? '',
                    windowStart: item.windowStart.toISOString(),
                    windowEnd: item.windowEnd.toISOString(),
                  },
                })}
              >
                <Text style={styles.secondaryBtnText}>Change details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleAddToCalendar}>
                <Text style={styles.secondaryBtnText}>Add to calendar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push({ pathname: '/add-item', params: { id: item.id, title: item.title, prepNote: item.prepNote ?? '', windowStart: item.windowStart.toISOString(), windowEnd: item.windowEnd.toISOString() } })}
              >
                <Text style={styles.primaryBtnText}>Schedule now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleMarkDone}>
                <Text style={styles.secondaryBtnText}>I already did this</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.notesCard}>
          <View style={styles.notesHeaderRow}>
            <Text style={styles.notesTitle}>Notes & summary</Text>
            {!notesEditing && (
              <TouchableOpacity onPress={() => setNotesEditing(true)} hitSlop={6}>
                <Ionicons name={item.visitNotes ? 'pencil' : 'add'} size={16} color={colors.primaryDark} />
              </TouchableOpacity>
            )}
          </View>

          {notesEditing ? (
            <>
              <TextInput
                style={styles.notesInput}
                value={notesDraft}
                onChangeText={setNotesDraft}
                placeholder="What did the doctor say? Anything worth remembering for next time."
                placeholderTextColor={colors.textSecondary}
                multiline
                autoFocus
              />
              <View style={styles.notesActionRow}>
                <TouchableOpacity style={styles.notesCancelBtn} onPress={cancelNotesEdit} disabled={savingNotes}>
                  <Text style={styles.notesCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.notesSaveBtn} onPress={handleSaveNotes} disabled={savingNotes}>
                  <Text style={styles.notesSaveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : item.visitNotes ? (
            <TouchableOpacity onPress={() => setNotesEditing(true)}>
              <Text style={styles.notesText}>{item.visitNotes}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setNotesEditing(true)}>
              <Text style={styles.notesEmptyText}>Add notes from the visit — what was said, what's next.</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.shareCard} activeOpacity={0.7} onPress={handleSharePartner}>
          <View style={styles.shareIconChip}>
            <Ionicons name="heart-outline" size={20} color={colors.lavenderDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareTitle}>{partner.name ? `Share with ${partner.name}` : 'Share with your partner'}</Text>
            <Text style={styles.shareSub}>
              {partner.email ? `Sends the details to ${partner.email}` : "Add their email in Profile to send it directly"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.doctorCard} activeOpacity={0.7} onPress={() => router.push('/brain-dump')}>
          <View style={styles.doctorIconChip}>
            <Ionicons name="medical-outline" size={20} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.doctorTitle}>Questions for your doctor</Text>
            <Text style={styles.doctorSub}>Jot down anything to ask before this appointment.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {item.custom && (
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
            <Text style={styles.removeBtnText}>Remove from plan</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary, marginHorizontal: spacing.xs },

  scroll: { paddingHorizontal: spacing.md, paddingBottom: 56 },

  notFound:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  notFoundText: { fontSize: 14, color: colors.textSecondary },

  statusPill:       { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, backgroundColor: colors.sage, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, marginBottom: spacing.md },
  statusPillUrgent: { backgroundColor: colors.urgentBg },
  statusPillDone:   { backgroundColor: colors.sage },
  statusPillText:   { fontSize: 12, fontWeight: '700', color: colors.sageDeep },
  statusPillTextUrgent: { color: colors.urgent },
  statusPillTextNeutral: { color: colors.neutralChipDeep },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },

  doneRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bigDate:   { fontFamily: fonts.headline, fontSize: 20, color: colors.textPrimary },
  timeLabel: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontSize: 13, color: colors.textSecondary },
  prepRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: colors.sage + '55', borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  prepText:  { flex: 1, fontSize: 12.5, color: colors.textPrimary, lineHeight: 18 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  rangeText:  { fontFamily: fonts.headline, fontSize: 18, color: colors.textPrimary, marginTop: 2 },
  bookByText: { fontFamily: fonts.headline, fontSize: 18, color: colors.urgent, marginTop: 2 },

  primaryBtn:     { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: spacing.md },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
  secondaryBtn:     { alignItems: 'center', paddingVertical: 10, marginTop: spacing.sm },
  secondaryBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13.5 },

  notesCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  notesHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  notesTitle: { fontFamily: fonts.headline, fontSize: 15, color: colors.textPrimary },
  notesText:  { fontSize: 13.5, color: colors.textPrimary, lineHeight: 19 },
  notesEmptyText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, fontStyle: 'italic' },
  notesInput: { fontSize: 14, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top', backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm },
  notesActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  notesCancelBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  notesCancelBtnText: { fontSize: 13.5, fontWeight: '600', color: colors.textSecondary },
  notesSaveBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 18 },
  notesSaveBtnText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },

  shareCard:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.lavender, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.md },
  shareIconChip: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  shareTitle:    { fontFamily: fonts.headline, fontSize: 14.5, color: colors.textPrimary },
  shareSub:      { fontSize: 12, color: colors.textPrimary, opacity: 0.65, marginTop: 2, lineHeight: 16 },

  doctorCard:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  doctorIconChip: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  doctorTitle:    { fontFamily: fonts.headline, fontSize: 14.5, color: colors.textPrimary },
  doctorSub:      { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },

  removeBtn:     { alignItems: 'center', paddingVertical: spacing.sm },
  removeBtnText: { fontSize: 13.5, fontWeight: '600', color: colors.urgent },
})
