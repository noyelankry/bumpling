// TODO(prepare-for-birth): placeholder only — real design still pending.
//
// Planned feature (from product discussion): a "Prepare for birth" flow that
// surfaces as a built-in plan item around week 30-32, with an "Explore" CTA
// (see the teaser card in app/(tabs)/plan.tsx). Lets the mom plan and log
// birth preferences, with guiding questions to help her think it through.
// Sections:
//   - Birth preferences
//   - Hospital bag
//   - Questions for your care team
//   - Who's coming with you
//   - After-birth preferences
// Should end in a summary view she can save and share/export to show her
// maternity team (PDF? plain share sheet? TBD at design time).
//
// Not yet decided: whether this becomes a real CareItem (windowStartWeek
// 30-32) wired into the attention/journey/upcoming sections like other plan
// items, or a separate standalone entity — intentionally deferred.

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fonts } from '../lib/theme'
import { goBack } from '../lib/navigation'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const SECTIONS: { icon: IoniconsName; label: string }[] = [
  { icon: 'heart-outline', label: 'Birth preferences' },
  { icon: 'bag-outline', label: 'Hospital bag' },
  { icon: 'help-circle-outline', label: 'Questions for your care team' },
  { icon: 'people-outline', label: "Who's coming with you" },
  { icon: 'leaf-outline', label: 'After-birth preferences' },
]

export default function PrepareForBirthScreen() {
  const router = useRouter()
  const back = () => goBack(router, '/(tabs)/plan')

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={back} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prepare for birth</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.heroRow}>
          <View style={styles.heroIconChip}>
            <Ionicons name="heart-outline" size={24} color={colors.lavenderDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Let's get you ready</Text>
            <Text style={styles.heroSub}>
              Plan and log your birth preferences, then save a summary to share with your maternity team.
            </Text>
          </View>
        </View>

        <View style={styles.listCard}>
          {SECTIONS.map((section, i) => (
            <View key={section.label} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={styles.rowIconChip}>
                <Ionicons name={section.icon} size={18} color={colors.lavenderDeep} />
              </View>
              <Text style={styles.rowTitle}>{section.label}</Text>
              <View style={styles.soonPill}>
                <Text style={styles.soonPillText}>Soon</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.comingSoonCard}>
          <Ionicons name="construct-outline" size={18} color={colors.sageDeep} />
          <Text style={styles.comingSoonText}>
            This is a placeholder — we're still designing this. Your preferences, a guided summary, and
            share/export options to bring to your maternity team are all on the way.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.textPrimary },

  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 56 },

  heroRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  heroIconChip: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  heroTitle:    { fontFamily: fonts.headline, fontSize: 19, color: colors.textPrimary },
  heroSub:      { fontSize: 12.5, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },

  listCard: { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  row:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowIconChip: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  rowTitle:   { flex: 1, fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
  soonPill:      { backgroundColor: colors.neutralChip, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  soonPillText:  { fontSize: 11, fontWeight: '700', color: colors.neutralChipDeep },

  comingSoonCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.sage, borderRadius: radius.lg, padding: spacing.sm },
  comingSoonText: { flex: 1, fontSize: 12.5, color: colors.textPrimary, opacity: 0.75, lineHeight: 18 },
})
