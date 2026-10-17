import { ReactNode, createContext, useContext } from 'react'
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, radius, spacing, fonts } from '../lib/theme'
import { BabyMark } from './illustrations'

const DESKTOP_BREAKPOINT = 700
const FRAME_WIDTH = 430
const MIN_FRAME_HEIGHT = 560
const MAX_FRAME_HEIGHT = 900
const OUTER_MARGIN = 56
const BLOB = 560

// Screens that size themselves off the window (full-bleed horizontal
// FlatLists, Dimensions-based carousels) need to measure the frame's
// 430px box on desktop web, not the real browser window behind it.
// useViewportSize() stands in for RN's useWindowDimensions() for that
// purpose: it returns the frame's size when one is wrapping the tree,
// and falls back to the real window size everywhere else (native,
// mobile web, no frame).
const ViewportContext = createContext<{ width: number; height: number } | null>(null)

export function useViewportSize() {
  const framed = useContext(ViewportContext)
  const real = useWindowDimensions()
  return framed ?? real
}

// Mobile web (narrow viewport) renders the app untouched, same as native.
// Only a wide browser window gets framed as "the phone, viewed on a desktop".
export function DesktopWebFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  const { width, height } = useWindowDimensions()
  const isDesktopWeb = Platform.OS === 'web' && width > DESKTOP_BREAKPOINT

  if (!isDesktopWeb) return <>{children}</>

  const frameHeight = Math.min(MAX_FRAME_HEIGHT, Math.max(MIN_FRAME_HEIGHT, height - OUTER_MARGIN * 2))

  return (
    <View style={[styles.page, { minHeight: height }]}>
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <View style={styles.brandRow}>
        <BabyMark size={26} />
        <Text style={styles.brandText}>Bumpling</Text>
        <View style={styles.previewPill}>
          <Text style={styles.previewPillText}>{t('webPreview')}</Text>
        </View>
      </View>

      <View style={[styles.frame, { width: FRAME_WIDTH, height: frameHeight }]}>
        <View style={styles.frameInner}>
          <ViewportContext.Provider value={{ width: FRAME_WIDTH, height: frameHeight }}>
            {children}
          </ViewportContext.Provider>
        </View>
      </View>

      <Text style={styles.footerNote}>{t('webFrameFooter')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },

  blobTopRight: {
    position: 'absolute',
    top: -BLOB * 0.6,
    right: -BLOB * 0.6,
    width: BLOB,
    height: BLOB,
    borderRadius: BLOB / 2,
    backgroundColor: colors.peach,
    opacity: 0.4,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -BLOB * 0.6,
    left: -BLOB * 0.6,
    width: BLOB,
    height: BLOB,
    borderRadius: BLOB / 2,
    backgroundColor: colors.lavender,
    opacity: 0.4,
  },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  brandText: { fontFamily: fonts.headline, fontSize: 18, color: colors.textPrimary, letterSpacing: 0.5 },
  previewPill: { backgroundColor: colors.neutralChip, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  previewPillText: { fontSize: 11, fontWeight: '700', color: colors.neutralChipDeep },

  frame: {
    backgroundColor: colors.card,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.16,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 24 },
  },
  frameInner: { flex: 1 },

  footerNote: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: FRAME_WIDTH,
  },
})
