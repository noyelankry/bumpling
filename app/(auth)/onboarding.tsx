import { useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, SafeAreaView, useWindowDimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, radius } from '../../lib/theme'

const ONBOARDING_KEY = 'bumpling_onboarding_seen'

// ─── Slide content ────────────────────────────────────────────────────────────

const SLIDES = [
  {
    key: 'goals',
    titleBlack: 'Your goals,',
    titleGreen: 'our guidance',
    body: 'Track your nutrition, hit your macros and reach your goals with personalised insights.',
    Preview: GoalsPreview,
  },
  {
    key: 'logging',
    titleBlack: 'Smart logging,',
    titleGreen: 'made simple',
    body: 'Log meals in seconds with AI or choose from thousands of foods and recipes.',
    Preview: LoggingPreview,
  },
  {
    key: 'habits',
    titleBlack: 'Healthy habits,',
    titleGreen: 'every day',
    body: 'From steps to water and coffee, build better habits and see your consistency grow.',
    Preview: HabitsPreview,
  },
  {
    key: 'allinone',
    titleBlack: 'All in one place,',
    titleGreen: 'all for you',
    body: 'Meals, recipes, goals and grocery lists — everything you need in one beautiful app.',
    Preview: AllInOnePreview,
  },
]

// ─── Slide preview components ─────────────────────────────────────────────────

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <View style={preview.barRow}>
      <View style={[preview.barDot, { backgroundColor: color }]} />
      <Text style={preview.barLabel}>{label}</Text>
      <View style={preview.barTrack}>
        <View style={[preview.barFill, { width: `${(value / max) * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={preview.barValue}>{value} / {max} g</Text>
    </View>
  )
}

function GoalsPreview() {
  return (
    <View style={preview.card}>
      <Text style={preview.cardTitle}>Daily Progress</Text>
      <View style={preview.ringRow}>
        <View style={preview.ring}>
          <Text style={preview.ringNum}>726</Text>
          <Text style={preview.ringSub}>/ 2100 kcal</Text>
        </View>
        <View style={preview.bars}>
          <MiniBar label="Protein" value={76}  max={150} color={colors.protein} />
          <MiniBar label="Carbs"   value={130} max={250} color={colors.carbs} />
          <MiniBar label="Fats"    value={28}  max={70}  color={colors.fat} />
          <MiniBar label="Fiber"   value={18}  max={30}  color={colors.fiber} />
        </View>
      </View>
    </View>
  )
}

function LoggingPreview() {
  return (
    <View style={preview.card}>
      <View style={preview.bubble}>
        <Text style={preview.bubbleText}>I had grilled chicken, quinoa, and avocado with olive oil</Text>
        <Ionicons name="sparkles" size={14} color={colors.primary} style={{ marginTop: 4, alignSelf: 'flex-end' }} />
      </View>
      <Text style={[preview.cardTitle, { marginTop: 10, marginBottom: 6 }]}>Detected Meal</Text>
      {[
        { name: 'Grilled Chicken', g: '150 g', kcal: '231 kcal' },
        { name: 'Quinoa',          g: '100 g', kcal: '120 kcal' },
        { name: 'Avocado',         g: '50 g',  kcal: '80 kcal' },
        { name: 'Olive Oil',       g: '1 tsp', kcal: '40 kcal' },
      ].map(row => (
        <View key={row.name} style={preview.mealRow}>
          <Text style={preview.mealName}>{row.name}</Text>
          <Text style={preview.mealMeta}>{row.g}</Text>
          <Text style={preview.mealKcal}>{row.kcal}</Text>
        </View>
      ))}
      <View style={preview.mealTotal}>
        <Text style={preview.mealTotalLabel}>Total</Text>
        <Text style={preview.mealTotalKcal}>471 kcal</Text>
      </View>
    </View>
  )
}

function StatCard({ icon, label, value, total, color }: { icon: any; label: string; value: string; total: string; color: string }) {
  const pct = (parseFloat(value) / parseFloat(total)) * 100
  return (
    <View style={preview.statCard}>
      <View style={preview.statTop}>
        <Ionicons name={icon} size={22} color={color} />
        <Text style={preview.statLabel}>{label}</Text>
      </View>
      <Text style={preview.statValue}>{value} <Text style={preview.statTotal}>/ {total}</Text></Text>
      <View style={preview.statTrack}>
        <View style={[preview.statFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

function HabitsPreview() {
  return (
    <View style={{ gap: 8, width: '100%' }}>
      <StatCard icon="footsteps-outline" label="Steps"  value="7,842" total="10,000" color={colors.primary} />
      <StatCard icon="water-outline"     label="Water"  value="5"     total="8 cups" color="#60A5FA" />
      <StatCard icon="cafe-outline"      label="Coffee" value="2"     total="3 cups" color="#D97706" />
    </View>
  )
}

function AllInOnePreview() {
  return (
    <View style={[preview.card, { padding: 10 }]}>
      <View style={preview.miniHeader}>
        <Text style={preview.miniAppName}>BUMPLING</Text>
        <Ionicons name="notifications-outline" size={14} color={colors.textPrimary} />
      </View>
      <Text style={preview.miniSection}>Daily Progress</Text>
      <View style={preview.miniProgress}>
        <View style={preview.miniRing}>
          <Text style={preview.miniRingNum}>726</Text>
          <Text style={preview.miniRingSub}>kcal</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          {[
            { l: 'P', v: 76,  m: 150, c: colors.protein },
            { l: 'C', v: 130, m: 250, c: colors.carbs },
            { l: 'F', v: 28,  m: 70,  c: colors.fat },
            { l: 'Fi', v: 18, m: 30,  c: colors.fiber },
          ].map(b => (
            <View key={b.l} style={preview.miniBarRow}>
              <Text style={preview.miniBarLabel}>{b.l}</Text>
              <View style={preview.miniBarTrack}>
                <View style={[preview.miniBarFill, { width: `${(b.v / b.m) * 100}%`, backgroundColor: b.c }]} />
              </View>
              <Text style={preview.miniBarValue}>{b.v} / {b.m} g</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[preview.miniSection, { marginTop: 8 }]}>Today's Meals</Text>
      {[
        { meal: 'Breakfast', kcal: '452 kcal' },
        { meal: 'Lunch',     kcal: '274 kcal' },
        { meal: 'Dinner',    kcal: '0 kcal' },
      ].map(row => (
        <View key={row.meal} style={preview.mealRow}>
          <View style={preview.mealThumb} />
          <Text style={[preview.mealName, { flex: 1, fontSize: 11 }]}>{row.meal}</Text>
          <Text style={[preview.mealKcal, { fontSize: 10 }]}>{row.kcal}</Text>
        </View>
      ))}
    </View>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const [step, setStep] = useState<'welcome' | 'slides'>('welcome')
  const [slideIndex, setSlideIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)

  async function finishOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    router.replace('/(auth)/login')
  }

  function goNext() {
    if (slideIndex < SLIDES.length - 1) {
      const next = slideIndex + 1
      flatListRef.current?.scrollToIndex({ index: next, animated: true })
      setSlideIndex(next)
    } else {
      finishOnboarding()
    }
  }

  if (step === 'welcome') {
    return (
      <View style={styles.welcomeContainer}>
        {/* Food image area */}
        <View style={styles.imageArea}>
          <View style={styles.imagePlaceholder} />
          {/* Logo overlay */}
          <View style={styles.logoOverlay}>
            <View style={styles.logoIcon}>
              <Ionicons name="leaf" size={32} color={colors.primary} />
            </View>
            <Text style={styles.logoText}>BUMPLING</Text>
            <Text style={styles.tagline}>Better habits. Better you.</Text>
          </View>
        </View>

        {/* Bottom */}
        <View style={styles.welcomeBottom}>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => setStep('slides')}>
            <Text style={styles.ctaBtnText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={finishOnboarding} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={styles.loginLinkBold}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.slidesContainer}>
      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={finishOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const Preview = item.Preview
          return (
            <View style={[styles.slide, { width }]}>
              <Text style={styles.slideTitle}>
                {item.titleBlack}{'\n'}
                <Text style={styles.slideTitleGreen}>{item.titleGreen}</Text>
              </Text>
              <Text style={styles.slideBody}>{item.body}</Text>
              <View style={styles.previewContainer}>
                <Preview />
              </View>
            </View>
          )
        }}
      />

      {/* Footer: dots + button */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === slideIndex && styles.dotActive]} />
          ))}
        </View>

        {slideIndex === SLIDES.length - 1 ? (
          <TouchableOpacity style={styles.letsGoBtn} onPress={finishOnboarding}>
            <Text style={styles.letsGoBtnText}>Let's Go!</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.arrowBtn} onPress={goNext}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

// ─── Preview styles ───────────────────────────────────────────────────────────

const preview = StyleSheet.create({
  card:          { backgroundColor: '#fff', borderRadius: radius.md, padding: 14, width: '100%', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTitle:     { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 10 },
  ringRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ring:          { width: 70, height: 70, borderRadius: 35, borderWidth: 5, borderColor: colors.primary + '33', alignItems: 'center', justifyContent: 'center' },
  ringNum:       { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  ringSub:       { fontSize: 8, color: colors.textSecondary },
  bars:          { flex: 1, gap: 5 },
  barRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barDot:        { width: 6, height: 6, borderRadius: 3 },
  barLabel:      { fontSize: 9, color: colors.textSecondary, width: 30 },
  barTrack:      { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  barFill:       { height: '100%', borderRadius: 2 },
  barValue:      { fontSize: 8, color: colors.textSecondary, width: 42, textAlign: 'right' },
  bubble:        { backgroundColor: colors.primary + '15', borderRadius: 12, borderTopLeftRadius: 2, padding: 10, marginBottom: 4 },
  bubbleText:    { fontSize: 12, color: colors.textPrimary, lineHeight: 18 },
  mealRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, borderTopWidth: 1, borderTopColor: colors.border },
  mealName:      { flex: 1, fontSize: 11, color: colors.textPrimary },
  mealMeta:      { fontSize: 10, color: colors.textSecondary, marginRight: 8 },
  mealKcal:      { fontSize: 11, fontWeight: '600', color: colors.textPrimary },
  mealTotal:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.border },
  mealTotalLabel:{ fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  mealTotalKcal: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  statCard:      { backgroundColor: '#fff', borderRadius: radius.md, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  statTop:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statLabel:     { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  statValue:     { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  statTotal:     { fontSize: 14, fontWeight: '400', color: colors.textSecondary },
  statTrack:     { height: 5, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  statFill:      { height: '100%', borderRadius: 3 },
  miniHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  miniAppName:   { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  miniSection:   { fontSize: 9, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
  miniProgress:  { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
  miniRing:      { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: colors.primary + '44', alignItems: 'center', justifyContent: 'center' },
  miniRingNum:   { fontSize: 9, fontWeight: '800', color: colors.textPrimary },
  miniRingSub:   { fontSize: 6, color: colors.textSecondary },
  miniBarRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniBarLabel:  { fontSize: 7, color: colors.textSecondary, width: 10 },
  miniBarTrack:  { flex: 1, height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  miniBarFill:   { height: '100%', borderRadius: 2 },
  miniBarValue:  { fontSize: 7, color: colors.textSecondary, width: 28, textAlign: 'right' },
  mealThumb:     { width: 20, height: 20, borderRadius: 4, backgroundColor: colors.border, marginRight: 6 },
})

// ─── Screen styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  welcomeContainer:  { flex: 1, backgroundColor: colors.background },
  imageArea:         { flex: 1, position: 'relative' },
  imagePlaceholder:  { flex: 1, backgroundColor: colors.primary + '18' },
  logoOverlay:       { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: spacing.lg, paddingTop: spacing.lg, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  logoIcon:          { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  logoText:          { fontSize: 36, fontWeight: '900', color: colors.primary, letterSpacing: 2 },
  tagline:           { fontSize: 16, color: colors.textSecondary, marginTop: 4 },
  welcomeBottom:     { padding: spacing.md, paddingBottom: 56, gap: spacing.sm },
  ctaBtn:            { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  ctaBtnText:        { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginLink:         { alignItems: 'center', paddingVertical: spacing.xs },
  loginLinkText:     { fontSize: 14, color: colors.textSecondary },
  loginLinkBold:     { color: colors.primary, fontWeight: '700' },

  slidesContainer:   { flex: 1, backgroundColor: colors.background },
  skipBtn:           { alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  skipText:          { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
  slide:             { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  slideTitle:        { fontSize: 30, fontWeight: '800', color: colors.textPrimary, lineHeight: 38, marginBottom: spacing.sm },
  slideTitleGreen:   { color: colors.primary },
  slideBody:         { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md },
  previewContainer:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  footer:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: 36, paddingTop: spacing.sm },
  dots:              { flexDirection: 'row', gap: 6 },
  dot:               { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive:         { width: 20, backgroundColor: colors.primary },
  arrowBtn:          { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  letsGoBtn:         { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 28 },
  letsGoBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
})
