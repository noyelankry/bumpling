import { useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { colors, spacing, radius, fonts } from '../../lib/theme'
import { BabyMark, FetusIllustration, MoodFace } from '../../components/illustrations'
import { useLanguage } from '../../lib/i18n/LanguageProvider'
import { useDirectionalIcon } from '../../lib/i18n/useDirectionalIcon'
import { useViewportSize } from '../../components/DesktopWebFrame'
import { ONBOARDING_KEY } from '../../lib/onboarding'
import { supabase } from '../../lib/supabase'

function getSlides(t: TFunction<'onboarding'>) {
  return [
    {
      key: 'plan',
      titleBlack: t('slidePlan.titleBlack'),
      titleGreen: t('slidePlan.titleGreen'),
      body: t('slidePlan.body'),
      Preview: PlanPreview,
    },
    {
      key: 'today',
      titleBlack: t('slideToday.titleBlack'),
      titleGreen: t('slideToday.titleGreen'),
      body: t('slideToday.body'),
      Preview: TodayPreview,
    },
    {
      key: 'health',
      titleBlack: t('slideHealth.titleBlack'),
      titleGreen: t('slideHealth.titleGreen'),
      body: t('slideHealth.body'),
      Preview: HealthPreview,
    },
    {
      key: 'allinone',
      titleBlack: t('slideAllInOne.titleBlack'),
      titleGreen: t('slideAllInOne.titleGreen'),
      body: t('slideAllInOne.body'),
      Preview: AllInOnePreview,
    },
    {
      key: 'disclaimer',
      titleBlack: t('slideDisclaimer.titleBlack'),
      titleGreen: t('slideDisclaimer.titleGreen'),
      body: t('slideDisclaimer.body'),
      Preview: DisclaimerPreview,
    },
  ]
}

function PlanPreview() {
  const { t } = useTranslation('onboarding')
  const { isRTL } = useLanguage()
  const side = (pct: `${number}%`) => ({ left: isRTL ? undefined : pct, right: isRTL ? pct : undefined })
  return (
    <View style={preview.card}>
      <Text style={preview.cardTitle}>{t('preview.needsAttention')}</Text>
      <View style={preview.planRow}>
        <View style={preview.planIconChip}>
          <Ionicons name="body-outline" size={16} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={preview.planRowTitle}>{t('preview.cvs')}</Text>
          <Text style={preview.planRowMeta}>{t('preview.bookBy')}</Text>
        </View>
      </View>
      <View style={preview.trackWrap}>
        <View style={preview.trackLine} />
        <View style={[preview.trackSegment, side('8%'), { width: '18%', backgroundColor: colors.peachDeep }]} />
        <View style={[preview.trackSegment, side('34%'), { width: '22%', backgroundColor: colors.sageDeep }]} />
        <View style={[preview.trackSegment, side('64%'), { width: '20%', backgroundColor: colors.lavenderDeep }]} />
      </View>
      <View style={preview.monthRow}>
        <Text style={preview.monthLabel}>{t('preview.monthJul')}</Text>
        <Text style={preview.monthLabel}>{t('preview.monthAug')}</Text>
        <Text style={preview.monthLabel}>{t('preview.monthSep')}</Text>
      </View>
    </View>
  )
}

function TodayPreview() {
  const { t } = useTranslation('onboarding')
  return (
    <View style={preview.card}>
      <Text style={preview.eyebrow}>{t('preview.pregnant')}</Text>
      <View style={preview.heroRow}>
        <Text style={preview.heroNum}>14</Text>
        <View>
          <Text style={preview.heroWeeks}>{t('preview.weeks')}</Text>
          <Text style={preview.heroDays}>{t('preview.plusDays')}</Text>
        </View>
      </View>
      <View style={preview.tipRow}>
        <Ionicons name="sparkles-outline" size={13} color={colors.lavenderDeep} />
        <Text style={preview.tipText}>{t('preview.weeklyTip')}</Text>
      </View>
    </View>
  )
}

function HealthPreview() {
  const { t } = useTranslation('onboarding')
  const moods: Array<'happy' | 'calm' | 'okay' | 'tired' | 'anxious'> = ['happy', 'calm', 'okay', 'tired', 'anxious']
  const symptoms = [t('preview.nausea'), t('preview.fatigue'), t('preview.backache')]
  return (
    <View style={preview.card}>
      <Text style={preview.cardTitle}>{t('preview.howFeeling')}</Text>
      <View style={preview.moodRow}>
        {moods.map((m, i) => (
          <View key={m} style={[preview.moodChip, i === 1 && preview.moodChipActive]}>
            <MoodFace mood={m} size={20} color={i === 1 ? '#fff' : colors.textSecondary} />
          </View>
        ))}
      </View>
      <View style={preview.symptomRow}>
        {symptoms.map((s, i) => (
          <View key={s} style={[preview.symptomChip, i === 0 && preview.symptomChipActive]}>
            <Text style={[preview.symptomChipText, i === 0 && preview.symptomChipTextActive]}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function AllInOnePreview() {
  const { t } = useTranslation('onboarding')
  return (
    <View style={[preview.card, { padding: 12 }]}>
      <View style={preview.miniHeader}>
        <View style={preview.miniHeaderLeft}>
          <BabyMark size={16} />
          <Text style={preview.miniAppName}>Bumpling</Text>
        </View>
      </View>
      <Text style={[preview.cardTitle, { marginTop: 8 }]}>{t('preview.thingsNeedAttention')}</Text>
      <View style={preview.planRow}>
        <View style={preview.planIconChip}>
          <Ionicons name="calendar-outline" size={14} color={colors.sageDeep} />
        </View>
        <Text style={preview.planRowTitle}>{t('preview.earlyAnatomyScan')}</Text>
      </View>
      <View style={preview.miniNav}>
        {(['calendar-outline', 'leaf-outline', 'person-outline'] as const).map((icon, i) => (
          <View key={icon} style={[preview.miniNavDot, i === 0 && preview.miniNavDotActive]}>
            <Ionicons name={icon} size={13} color={i === 0 ? '#fff' : colors.textSecondary} />
          </View>
        ))}
      </View>
    </View>
  )
}

function DisclaimerPreview() {
  const { t } = useTranslation('onboarding')
  return (
    <View style={preview.card}>
      <View style={preview.disclaimerIconChip}>
        <Ionicons name="heart-outline" size={22} color={colors.primaryDark} />
      </View>
      <Text style={[preview.cardTitle, { marginTop: 10, textAlign: 'center' }]}>{t('preview.notADoctor')}</Text>
      <View style={preview.tipRow}>
        <Ionicons name="information-circle-outline" size={13} color={colors.lavenderDeep} />
        <Text style={preview.tipText}>{t('preview.alwaysAsk')}</Text>
      </View>
    </View>
  )
}

export default function OnboardingScreen() {
  const router = useRouter()
  const { t } = useTranslation('onboarding')
  const { arrowForward } = useDirectionalIcon()
  const { width } = useViewportSize()
  const [step, setStep] = useState<'welcome' | 'slides'>('welcome')
  const [slideIndex, setSlideIndex] = useState(0)
  // A manually-animated track instead of FlatList.scrollToIndex: react-native-web's
  // RTL scroll handling doesn't reliably move the underlying scroll position when
  // the document direction is rtl (scrollToIndex becomes a silent no-op). Each
  // slide is positioned with a literal `left` offset — never auto-mirrored — and
  // the whole track slides via `transform`, which RN also never flips for RTL, so
  // the same math works unchanged in both reading directions.
  const translateX = useRef(new Animated.Value(0)).current
  const SLIDES = getSlides(t)

  async function finishOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    const { data } = await supabase.auth.getClaims()
    router.replace(data?.claims ? '/(tabs)' : '/(auth)/login')
  }

  function goNext() {
    if (slideIndex < SLIDES.length - 1) {
      const next = slideIndex + 1
      setSlideIndex(next)
      Animated.timing(translateX, { toValue: -next * width, duration: 300, useNativeDriver: true }).start()
    } else {
      finishOnboarding()
    }
  }

  if (step === 'welcome') {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.imageArea}>
          <View style={styles.imagePlaceholder}>
            <FetusIllustration size={200} />
          </View>
          <View style={styles.logoOverlay}>
            <View style={styles.logoIcon}>
              <BabyMark size={40} />
            </View>
            <Text style={styles.logoText}>BUMPLING</Text>
            <Text style={styles.tagline}>{t('tagline')}</Text>
          </View>
        </View>

        <View style={styles.welcomeBottom}>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => setStep('slides')}>
            <Text style={styles.ctaBtnText}>{t('getStarted')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={finishOnboarding} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>
              {t('haveAccount')}
              <Text style={styles.loginLinkBold}>{t('logIn')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.slidesContainer}>
      <TouchableOpacity style={styles.skipBtn} onPress={finishOnboarding}>
        <Text style={styles.skipText}>{t('skip')}</Text>
      </TouchableOpacity>

      <View style={styles.track}>
        <Animated.View style={[styles.trackInner, { transform: [{ translateX }] }]}>
          {SLIDES.map((item, i) => {
            const Preview = item.Preview
            return (
              <View key={item.key} style={[styles.slide, { width, left: i * width }]}>
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
          })}
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === slideIndex && styles.dotActive]} />
          ))}
        </View>

        {slideIndex === SLIDES.length - 1 ? (
          <TouchableOpacity style={styles.letsGoBtn} onPress={finishOnboarding}>
            <Text style={styles.letsGoBtnText}>{t('letsGo')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.arrowBtn} onPress={goNext}>
            <Ionicons name={arrowForward} size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

const preview = StyleSheet.create({
  card:      { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, width: '100%', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  cardTitle: { fontFamily: fonts.headline, fontSize: 13, color: colors.textPrimary, marginBottom: 10 },

  disclaimerIconChip: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },

  planRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  planIconChip:  { width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  planRowTitle:  { fontSize: 12.5, fontWeight: '600', color: colors.textPrimary },
  planRowMeta:   { fontSize: 11, fontWeight: '700', color: colors.urgent, marginTop: 1 },

  trackWrap:    { height: 10, justifyContent: 'center', marginBottom: 6 },
  trackLine:    { height: 3, borderRadius: 2, backgroundColor: colors.border, width: '100%' },
  trackSegment: { position: 'absolute', height: 6, borderRadius: 3, opacity: 0.9 },
  monthRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  monthLabel:   { fontSize: 10, fontWeight: '700', color: colors.textSecondary },

  eyebrow:   { fontSize: 10, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  heroRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4, marginBottom: 10 },
  heroNum:   { fontFamily: fonts.headlineBold, fontSize: 40, color: colors.textPrimary, lineHeight: 40 },
  heroWeeks: { fontFamily: fonts.headline, fontSize: 14, color: colors.textPrimary },
  heroDays:  { fontFamily: fonts.headline, fontSize: 12, color: colors.primaryDark },
  tipRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.lavender, borderRadius: radius.sm, padding: 8 },
  tipText:   { flex: 1, fontSize: 11, color: colors.textPrimary },

  moodRow:   { flexDirection: 'row', gap: 6, marginBottom: 10 },
  moodChip:  { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.neutralChip, alignItems: 'center', justifyContent: 'center' },
  moodChipActive: { backgroundColor: colors.primary },
  symptomRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  symptomChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.neutralChip },
  symptomChipActive: { backgroundColor: colors.sage },
  symptomChipText: { fontSize: 10.5, fontWeight: '600', color: colors.textSecondary },
  symptomChipTextActive: { color: colors.sageDeep },

  miniHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniAppName:    { fontSize: 11, fontWeight: '800', color: colors.textPrimary },
  miniNav:        { flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'center' },
  miniNavDot:     { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.neutralChip, alignItems: 'center', justifyContent: 'center' },
  miniNavDotActive: { backgroundColor: colors.primary },
})

const styles = StyleSheet.create({
  welcomeContainer:  { flex: 1, backgroundColor: colors.background },
  imageArea:         { flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  imagePlaceholder:  { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.peach },
  logoOverlay:       { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: spacing.lg, paddingTop: spacing.lg, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  logoIcon:          { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  logoText:          { fontFamily: fonts.headlineBold, fontSize: 32, color: colors.primary, letterSpacing: 2 },
  tagline:           { fontSize: 15, color: colors.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: spacing.lg },
  welcomeBottom:     { padding: spacing.md, paddingBottom: 56, gap: spacing.sm },
  ctaBtn:            { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  ctaBtnText:        { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginLink:         { alignItems: 'center', paddingVertical: spacing.xs },
  loginLinkText:     { fontSize: 14, color: colors.textSecondary },
  loginLinkBold:     { color: colors.primary, fontWeight: '700' },

  slidesContainer:   { flex: 1, backgroundColor: colors.background },
  skipBtn:           { alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  skipText:          { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
  track:             { flex: 1, overflow: 'hidden' },
  trackInner:        { flex: 1 },
  slide:             { position: 'absolute', top: 0, bottom: 0, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  slideTitle:        { fontFamily: fonts.headlineBold, fontSize: 28, color: colors.textPrimary, lineHeight: 36, marginBottom: spacing.sm },
  slideTitleGreen:   { color: colors.primary },
  slideBody:         { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md },
  previewContainer:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  footer:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: 36, paddingTop: spacing.sm },
  dots:              { flexDirection: 'row', gap: 6 },
  dot:               { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive:         { width: 20, backgroundColor: colors.primary },
  arrowBtn:          { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center' },
  letsGoBtn:         { backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 28 },
  letsGoBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
})
