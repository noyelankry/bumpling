import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { colors, radius } from '../lib/theme'
import { useLanguage } from '../lib/i18n/LanguageProvider'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const ICON: Record<string, { name: IoniconsName; color: string }> = {
  index: { name: 'home-outline', color: colors.primary },
  plan: { name: 'calendar-outline', color: colors.textPrimary },
  'brain-dump': { name: 'bulb-outline', color: colors.moodOkay },
  health: { name: 'leaf-outline', color: colors.lavenderDeep },
}

const STAGE_HEIGHT = 100
const PILL_HEIGHT = 44
const PILL_ROW_BOTTOM_PADDING = 20
const BUBBLE = 46
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

  // "Today" is always the anchored pill and the other three are always the
  // fan tabs, in the same fixed spots, no matter which tab is active — focus
  // is shown with a highlight on that item, not by rearranging the bar.
  const pillRoute = state.routes.find(r => r.name === 'index')!
  const fanRoutes = state.routes.filter(r => r.name !== 'index')
  const activeKey = state.routes[state.index].key
  const pillTitle = descriptors[pillRoute.key].options.title ?? pillRoute.name

  const onStageLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)

  const goTo = (routeKey: string, routeName: string) => {
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true })
    if (!event.defaultPrevented) navigation.navigate(routeName)
  }

  const centerX = width / 2
  const positions = fanRoutes.map((route, i) => ({
    route,
    cx: centerX + (isRTL ? -FAN_OFFSETS[i].dx : FAN_OFFSETS[i].dx),
    cy: STAGE_HEIGHT + FAN_OFFSETS[i].dy,
  }))

  const pillRowHeight = PILL_HEIGHT + insets.bottom + PILL_ROW_BOTTOM_PADDING

  return (
    <View style={styles.root}>
      <View style={{ height: STAGE_HEIGHT }} />

      <View
        onLayout={onStageLayout}
        pointerEvents="box-none"
        style={[styles.fanOverlay, { bottom: pillRowHeight, height: STAGE_HEIGHT }]}
      >
        {width > 0 && positions.map(({ route, cx, cy }) => {
          const { options } = descriptors[route.key]
          const icon = ICON[route.name] ?? ICON.index
          const label = options.title ?? route.name
          const focused = route.key === activeKey
          return (
            <View key={route.key} style={{ position: 'absolute', left: cx - LABEL_WIDTH / 2, top: cy - BUBBLE / 2, width: LABEL_WIDTH, alignItems: 'center' }}>
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
        })}
      </View>

      <View style={[styles.pillRow, { paddingBottom: insets.bottom + PILL_ROW_BOTTOM_PADDING }]}>
        <TouchableOpacity
          style={[styles.pill, activeKey === pillRoute.key && styles.pillActive]}
          activeOpacity={0.85}
          onPress={() => goTo(pillRoute.key, pillRoute.name)}
        >
          <Text style={[styles.pillText, activeKey === pillRoute.key ? styles.pillTextActive : styles.pillTextInactive]}>{pillTitle}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, position: 'relative' },
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
