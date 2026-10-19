import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { colors, radius } from '../lib/theme'
import { useLanguage } from '../lib/i18n/LanguageProvider'
import { currentRole } from '../lib/carePlan'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const ICON: Record<string, { name: IoniconsName; color: string }> = {
  index: { name: 'home-outline', color: colors.primary },
  plan: { name: 'calendar-outline', color: colors.textPrimary },
  'brain-dump': { name: 'bulb-outline', color: colors.moodOkay },
  health: { name: 'leaf-outline', color: colors.lavenderDeep },
}

const STAGE_HEIGHT = 100
const PILL_ROW_BOTTOM_PADDING = 20
const BUBBLE = 46
const PILL_HEIGHT = BUBBLE // Kept equal on purpose — two separately-tuned numbers that happened to be close still read as mismatched next to each other.
const LABEL_WIDTH = BUBBLE + 20
// Explicit (dx, dy) offsets from the pill's top-center, rather than one
// shared polar radius — a circular arc ties horizontal spread and vertical
// reach to the same number, so shrinking the line length always crowded the
// bubbles together. These let the fan sit low and short (small dy) while
// still spreading Plan/Health out wide (large dx). Hardcoded for the fixed
// 4-tab set (Today pill + 3 fan tabs), in fanRoutes order.
const FAN_OFFSETS = [
  { dx: -82, dy: -44 },
  { dx: 0, dy: -61 },
  { dx: 82, dy: -44 },
]

export default function RadialTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { isRTL } = useLanguage()
  const [width, setWidth] = useState(0)
  const [isPartner, setIsPartner] = useState(false)

  useEffect(() => {
    currentRole().then(role => setIsPartner(role === 'partner'))
  }, [])

  // "Today" is always the anchored pill and the other three are always the
  // fan tabs, in the same fixed spots, no matter which tab is active — focus
  // is shown with a highlight on that item, not by rearranging the bar.
  const pillRoute = state.routes.find(r => r.name === 'index')!
  // expo-router's `href: null` on the Health Tabs.Screen (see (tabs)/_layout.tsx)
  // didn't reliably hide it from this fully custom tab bar — checking role
  // directly here instead of trusting that to have filtered state.routes.
  const fanRoutes = state.routes.filter(r => r.name !== 'index' && !(isPartner && r.name === 'health'))
  const activeKey = state.routes[state.index].key
  const pillTitle = descriptors[pillRoute.key].options.title ?? pillRoute.name

  const onStageLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)

  const goTo = (routeKey: string, routeName: string) => {
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true })
    if (!event.defaultPrevented) navigation.navigate(routeName)
  }

  const centerX = width / 2
  // The 3-offset spread assumes exactly 3 fan tabs (Plan/Brain Dump/Health).
  // A partner's Health tab is hidden, leaving 2 — use the left/right offsets
  // and skip the center-high one, rather than 0+1 which bunches both tabs
  // toward one side.
  const offsetFor = (i: number) => fanRoutes.length === 2 ? [FAN_OFFSETS[0], FAN_OFFSETS[2]][i] : FAN_OFFSETS[i]
  const positions = fanRoutes.map((route, i) => ({
    route,
    cx: centerX + (isRTL ? -offsetFor(i).dx : offsetFor(i).dx),
    cy: STAGE_HEIGHT + offsetFor(i).dy,
  }))

  const pillRowHeight = PILL_HEIGHT + insets.bottom + PILL_ROW_BOTTOM_PADDING

  function Bubble({ route }: { route: typeof fanRoutes[number] }) {
    const { options } = descriptors[route.key]
    const icon = ICON[route.name] ?? ICON.index
    const label = options.title ?? route.name
    const focused = route.key === activeKey
    return (
      <View style={{ width: LABEL_WIDTH, alignItems: 'center' }}>
        <TouchableOpacity
          style={[styles.bubble, focused && { backgroundColor: icon.color, borderColor: icon.color }]}
          activeOpacity={0.8}
          onPress={() => goTo(route.key, route.name)}
        >
          <Ionicons name={icon.name} size={17} color={focused ? '#fff' : icon.color} />
        </TouchableOpacity>
        <Text style={[styles.bubbleLabel, focused && { color: icon.color, fontWeight: '700' }]}>{label}</Text>
      </View>
    )
  }

  const Pill = (
    <TouchableOpacity
      style={[styles.pill, activeKey === pillRoute.key && styles.pillActive]}
      activeOpacity={0.85}
      onPress={() => goTo(pillRoute.key, pillRoute.name)}
    >
      <Text style={[styles.pillText, activeKey === pillRoute.key ? styles.pillTextActive : styles.pillTextInactive]}>{pillTitle}</Text>
    </TouchableOpacity>
  )

  // A partner only has 2 fan tabs (Health hidden) — the fan/stage layout
  // below was hand-tuned for 3 and reads lopsided with 2 floating bubbles
  // over an off-center pill, even with balanced left/right offsets. A flat
  // row — all three level, same size — looks right at this tab count:
  // three equal destinations, not an anchor hub with two satellites, so
  // Today renders as a Bubble here too rather than the larger pill shape.
  if (fanRoutes.length === 2) {
    return (
      <View style={[styles.root, styles.flatRow, { paddingBottom: insets.bottom + PILL_ROW_BOTTOM_PADDING }]}>
        <Bubble route={fanRoutes[isRTL ? 1 : 0]} />
        <Bubble route={pillRoute} />
        <Bubble route={fanRoutes[isRTL ? 0 : 1]} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <View style={{ height: STAGE_HEIGHT }} />

      <View
        onLayout={onStageLayout}
        pointerEvents="box-none"
        style={[styles.fanOverlay, { bottom: pillRowHeight, height: STAGE_HEIGHT }]}
      >
        {width > 0 && positions.map(({ route, cx, cy }) => (
          <View key={route.key} style={{ position: 'absolute', left: cx - LABEL_WIDTH / 2, top: cy - BUBBLE / 2, width: LABEL_WIDTH, alignItems: 'center' }}>
            <Bubble route={route} />
          </View>
        ))}
      </View>

      <View style={[styles.pillRow, { paddingBottom: insets.bottom + PILL_ROW_BOTTOM_PADDING }]}>
        {Pill}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, position: 'relative' },
  flatRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 10 },
  fanOverlay: { position: 'absolute', left: 0, right: 0 },

  bubble: {
    width: BUBBLE, height: BUBBLE, borderRadius: BUBBLE / 2,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleLabel: { marginTop: 4, fontSize: 10, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },

  pillRow: { alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: PILL_HEIGHT, paddingHorizontal: 16, borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pillActive: {
    backgroundColor: colors.primary, borderColor: colors.primary,
    shadowColor: colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pillText:         { fontWeight: '700', fontSize: 13 },
  pillTextActive:   { color: colors.textOnPrimary },
  pillTextInactive: { color: colors.primary },
})
