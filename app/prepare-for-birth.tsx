import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { goBack } from '../lib/navigation'
import { useDirectionalIcon } from '../lib/i18n/useDirectionalIcon'
import { getTopics, loadBirthPrefs, isTopicDone, type BirthPrefsData } from '../lib/birthPrefs'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const EMPTY_PREFS: BirthPrefsData = { answers: {}, supportContacts: [] }

export default function PrepareForBirthScreen() {
  const router = useRouter()
  const { t } = useTranslation('prepareForBirth')
  const { t: tTopics } = useTranslation('birthPrefs')
  const { back: backIcon, forward, arrowForward } = useDirectionalIcon()
  const back = () => goBack(router, '/(tabs)/plan')
  const [prefs, setPrefs] = useState<BirthPrefsData>(EMPTY_PREFS)
  const TOPICS = useMemo(() => getTopics(tTopics), [tTopics])

  useFocusEffect(useCallback(() => {
    loadBirthPrefs().then(setPrefs)
  }, []))

  const doneCount = TOPICS.filter(t => isTopicDone(prefs, t)).length
  const allDone = doneCount === TOPICS.length
  const firstUnanswered = TOPICS.find(t => !isTopicDone(prefs, t))

  function continueFlow() {
    if (allDone) router.push('/birth-preferences-summary')
    else router.push('/birth-preferences')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={back} hitSlop={8}>
          <Ionicons name={backIcon} size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{t('topicsExplored', { done: doneCount, total: TOPICS.length })}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(doneCount / TOPICS.length) * 100}%` }]} />
        </View>

        <TouchableOpacity style={styles.introCard} activeOpacity={0.8} onPress={continueFlow}>
          <View style={styles.introIconChip}>
            <Ionicons name="heart-outline" size={24} color={colors.lavenderDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>{t('introTitle')}</Text>
            <Text style={styles.introSub}>{t('introSub')}</Text>
          </View>
          <Ionicons name={forward} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.listCard}>
          {TOPICS.map((topic, i) => {
            const done = isTopicDone(prefs, topic)
            return (
              <TouchableOpacity
                key={topic.id}
                style={[styles.row, i > 0 && styles.rowDivider]}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/birth-preferences', params: { topic: topic.id } })}
              >
                <View style={styles.rowIconChip}>
                  <Ionicons name={topic.icon as IoniconsName} size={18} color={colors.lavenderDeep} />
                </View>
                <Text style={styles.rowTitle}>{topic.navLabel}</Text>
                <View style={[styles.statusPill, done && styles.statusPillDone]}>
                  {done && <Ionicons name="checkmark" size={12} color={colors.sageDeep} />}
                  <Text style={[styles.statusPillText, done && styles.statusPillTextDone]}>{done ? t('done') : t('notStarted')}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity style={styles.continueBtn} activeOpacity={0.85} onPress={continueFlow}>
          <Text style={styles.continueBtnText}>
            {allDone ? t('viewSummary') : firstUnanswered ? t('continueWith', { topic: firstUnanswered.navLabel }) : t('continue')}
          </Text>
          <Ionicons name={arrowForward} size={18} color="#fff" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary },

  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 56 },

  title:    { fontFamily: fonts.headlineBold, fontSize: 26, color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.sm },

  progressRow:  { marginBottom: 6 },
  progressText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.md, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3, backgroundColor: colors.sageDeep },

  introCard:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.lavender, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.md },
  introIconChip: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  introTitle:   { fontFamily: fonts.headline, fontSize: 16, color: colors.textPrimary },
  introSub:     { fontSize: 12, color: colors.textPrimary, opacity: 0.7, marginTop: 2, lineHeight: 16 },

  listCard: { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  row:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowIconChip: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  rowTitle:   { flex: 1, fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
  statusPill:      { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.neutralChip, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  statusPillDone:  { backgroundColor: colors.sage },
  statusPillText:  { fontSize: 11, fontWeight: '700', color: colors.neutralChipDeep },
  statusPillTextDone: { color: colors.sageDeep },

  continueBtn:     { flexDirection: 'row', gap: 8, backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
