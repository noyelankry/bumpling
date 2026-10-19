import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { goBack } from '../lib/navigation'
import { useDirectionalIcon } from '../lib/i18n/useDirectionalIcon'
import { loadProfile } from '../lib/profileData'
import { showAlert } from '../lib/alert'
import { loadMomPhone } from '../lib/momContact'
import { getTopics, getRelationshipOptions, optionFor, relationshipOption, loadBirthPrefs, isTopicDone, type BirthPrefsData } from '../lib/birthPrefs'
import { buildBirthPlanHtml, exportBirthPlanPdf } from '../lib/birthPlanDocument'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const EMPTY_PREFS: BirthPrefsData = { answers: {}, supportContacts: [] }

export default function BirthPreferencesSummaryScreen() {
  const router = useRouter()
  const { t } = useTranslation('birthPreferencesSummary')
  const { t: tTopics } = useTranslation('birthPrefs')
  const { back: backIcon, forward } = useDirectionalIcon()
  const TOPICS = useMemo(() => getTopics(tTopics), [tTopics])
  const RELATIONSHIP_OPTIONS = useMemo(() => getRelationshipOptions(tTopics), [tTopics])
  const back = () => goBack(router, '/prepare-for-birth')
  const [prefs, setPrefs] = useState<BirthPrefsData>(EMPTY_PREFS)
  const [momName, setMomName] = useState('')
  const [momPhone, setMomPhone] = useState('')
  const [exporting, setExporting] = useState(false)

  useFocusEffect(useCallback(() => {
    loadBirthPrefs().then(setPrefs)
    loadMomPhone().then(setMomPhone)
    loadProfile().then(p => { if (p.full_name) setMomName(p.full_name) })
  }, []))

  async function shareSummary() {
    setExporting(true)
    const html = buildBirthPlanHtml(prefs, { momName, momPhone }, TOPICS, RELATIONSHIP_OPTIONS)
    const result = await exportBirthPlanPdf(html)
    setExporting(false)
    if (!result.ok && result.message) showAlert(t('exportFailedTitle'), result.message)
  }

  const standardTopics = TOPICS.filter(t => t.kind !== 'contacts')
  const supportTopic = TOPICS.find(t => t.kind === 'contacts')

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

        <View style={styles.heroRow}>
          <View style={styles.heroIconChip}>
            <Ionicons name="document-text-outline" size={24} color={colors.lavenderDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{t('title')}</Text>
            <Text style={styles.heroSub}>{t('subtitle')}</Text>
          </View>
        </View>

        {supportTopic && (
          <TouchableOpacity
            style={styles.topicCard}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/birth-preferences', params: { topic: supportTopic.id } })}
          >
            <View style={styles.topicIconChip}>
              <Ionicons name={supportTopic.icon as IoniconsName} size={18} color={colors.lavenderDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.topicTitle}>{supportTopic.navLabel}</Text>
              {prefs.supportContacts.length > 0 ? (
                prefs.supportContacts.map(c => (
                  <Text key={c.id} style={styles.topicValue}>
                    {c.name} · {relationshipOption(RELATIONSHIP_OPTIONS, c.relationship)?.label ?? c.relationship}{c.phone ? ` · ${c.phone}` : ''}
                  </Text>
                ))
              ) : (
                <Text style={styles.topicValue}>{t('notSetYet')}</Text>
              )}
            </View>
            <Ionicons name={forward} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
          {standardTopics.map(topic => {
            const option = optionFor(topic, prefs.answers[topic.id])
            return (
              <TouchableOpacity
                key={topic.id}
                style={styles.topicCard}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/birth-preferences', params: { topic: topic.id } })}
              >
                <View style={styles.topicIconChip}>
                  <Ionicons name={topic.icon as IoniconsName} size={18} color={colors.lavenderDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.topicTitle}>{topic.navLabel}</Text>
                  <Text style={styles.topicValue}>{option ? option.summary : t('notSetYet')}</Text>
                </View>
                <Ionicons name={forward} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="heart-outline" size={18} color={colors.sageDeep} />
          <Text style={styles.noteText}>{t('unpredictableNote')}</Text>
        </View>

        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.editBtn} onPress={back}>
            <Ionicons name="pencil-outline" size={16} color={colors.textPrimary} />
            <Text style={styles.editBtnText}>{t('edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={shareSummary} disabled={exporting}>
            {exporting ? <ActivityIndicator color="#fff" /> : <>
              <Ionicons name="document-outline" size={16} color="#fff" />
              <Text style={styles.shareBtnText}>{t('sharePdf')}</Text>
            </>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { fontFamily: fonts.headline, fontSize: 16, color: colors.textPrimary },

  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 56 },

  heroRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  heroIconChip: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  heroTitle:    { fontFamily: fonts.headline, fontSize: 19, color: colors.textPrimary },
  heroSub:      { fontSize: 12.5, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },

  topicCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, marginBottom: spacing.xs },
  topicIconChip: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  topicTitle: { fontFamily: fonts.headline, fontSize: 14, color: colors.textPrimary },
  topicValue: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },

  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.sage, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.md },
  noteText: { flex: 1, fontSize: 12.5, color: colors.textPrimary, opacity: 0.8, lineHeight: 18 },

  footerRow: { flexDirection: 'row', gap: spacing.sm },
  editBtn: { flex: 1, flexDirection: 'row', gap: 6, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border },
  editBtnText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  shareBtn: { flex: 1.4, flexDirection: 'row', gap: 6, backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
