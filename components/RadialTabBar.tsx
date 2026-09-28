import { useState } from 'react'
import { Animated, View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Line } from 'react-native-svg'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { colors, radius } from '../lib/theme'
import { useNavVisibility } from '../lib/navVisibility'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const ICON: Record<string, { name: IoniconsName; color: string }> = {
  index: { name: 'home-outline', color: colors.primary },
  plan: { name: 'calendar-outline', color: colors.textPrimary },
  health: { name: 'leaf-outline', color: colors.lavenderDeep },
  more: { name: 'person-outline', color: colors.primary },
}

const STAGE_HEIGHT = 150
const PILL_HEIGHT = 52
const PILL_ROW_BOTTOM_PADDING = 24
const BUBBLE = 56
const FAN_RADIUS = 84
// Angles (standard math convention, 90° = straight up) spread the three
// non-Today tabs across the top of the arc; hardcoded for the fixed 4-tab set.
const FAN_ANGLES = [150, 90, 30]

// The compact, scrolling-state version: a plain row of small icon-only
// circles sitting right above the pill. It's a genuinely smaller reserved
// footprint (not a transform trick), which is what actually gives content
// more room — a separate fixed layout rather than a scaled-down arc, so
// there's no anchor-point math to keep in sync while it resizes.
const COMPACT_HEIGHT = 56
const COMPACT_BUBBLE = 38

function DotGrid() {
  return (
    <View style={styles.dotGrid}>
      <View style={styles.dot} />
      <View style={styles.dot} />
      <View style={styles.dot} />
      <View style={styles.dot} />
    </View>
  )
}

export default function RadialTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const [width, setWidth] = useState(0)
  const { expanded, collapsed } = useNavVisibility()

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
  const positions = fanRoutes.map((route, i) => {
    const angle = (FAN_ANGLES[i] * Math.PI) / 180
    return {
      route,
      cx: centerX + FAN_RADIUS * Math.cos(angle),
      cy: STAGE_HEIGHT - FAN_RADIUS * Math.sin(angle),
    }
  })

  // Tapping the pill while collapsed just reveals the fan again — a real
  // button press, so it works identically for touch and mouse (unlike the
  // scroll-position heuristics, which are a nice-to-have, not the only way in).
  const handlePillPress = () => {
    if (collapsed) { expand(); return }
    goTo(pillRoute.key, pillRoute.name)
  }

  // The reserved space and the fan's visual position are deliberately two
  // separate things now. `spacer` is a plain invisible box that snaps
  // instantly between the two heights (one clean layout pass) — that's what
  // actually gives content more scroll room, and it's discrete rather than
  // animated so it never fights an active scroll gesture. The fan itself
  // renders as an overlay anchored to a FIXED point right above the pill
  // (`bottom: pillRowHeight`, which never changes) — earlier, both variants
  // were positioned bottom:0 *inside* the resizing spacer, so the instant it
  // snapped, their whole anchor point silently relocated with it, and the
  // still-fading bubbles visibly snapped position along with it. Decoupling
  // them means only opacity ever animates; position never does.
  const collapsedOpacity = expanded.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
  const pillRowHeight = PILL_HEIGHT + insets.bottom + PILL_ROW_BOTTOM_PADDING

  return (
    <View style={styles.root}>
      <View style={{ height: collapsed ? COMPACT_HEIGHT : STAGE_HEIGHT }} />

      <View pointerEvents="box-none" style={[styles.fanOverlay, { bottom: pillRowHeight }]}>

        {/* Compact: small icon-only row, no labels, anchored to the bottom. */}
        <Animated.View
          pointerEvents={collapsed ? 'box-none' : 'none'}
          style={[styles.fanVariant, styles.compactRow, { height: COMPACT_HEIGHT, opacity: collapsedOpacity }]}
        >
          {fanRoutes.map(route => {
            const { options } = descriptors[route.key]
            const icon = ICON[route.name] ?? ICON.index
            const focused = route.key === activeKey
            return (
              <TouchableOpacity
                key={route.key}
                style={[styles.compactBubble, focused && styles.bubbleFocused]}
                activeOpacity={0.8}
                onPress={() => goTo(route.key, route.name)}
                accessibilityLabel={options.title ?? route.name}
              >
                <Ionicons name={icon.name} size={16} color={focused ? colors.primary : icon.color} />
              </TouchableOpacity>
            )
          })}
        </Animated.View>

        {/* Expanded: the full radial arc with labels and connecting lines. */}
        <Animated.View
          onLayout={onStageLayout}
          pointerEvents={collapsed ? 'none' : 'box-none'}
          style={[styles.fanVariant, { height: STAGE_HEIGHT, opacity: expanded }]}
        >
          {width > 0 && (
            <Svg width={width} height={STAGE_HEIGHT} style={StyleSheet.absoluteFill} pointerEvents="none">
              {positions.map(({ route, cx, cy }) => (
                <Line
                  key={route.key}
                  x1={centerX}
                  y1={STAGE_HEIGHT}
                  x2={cx}
                  y2={cy}
                  stroke={route.key === activeKey ? colors.primary : colors.primaryLight}
                  strokeWidth={1.3}
                  strokeDasharray="1,5"
                  strokeLinecap="round"
                />
              ))}
            </Svg>
          )}

          {width > 0 && positions.map(({ route, cx, cy }) => {
            const { options } = descriptors[route.key]
            const icon = ICON[route.name] ?? ICON.index
            const label = options.title ?? route.name
            const focused = route.key === activeKey
            return (
              <View key={route.key} style={{ position: 'absolute', left: cx - BUBBLE / 2, top: cy - BUBBLE / 2 }}>
                <TouchableOpacity
                  style={[styles.bubble, focused && styles.bubbleFocused]}
                  activeOpacity={0.8}
                  onPress={() => goTo(route.key, route.name)}
                >
                  <Ionicons name={icon.name} size={20} color={focused ? colors.primary : icon.color} />
                </TouchableOpacity>
                <Text style={[styles.bubbleLabel, focused && styles.bubbleLabelFocused]}>{label}</Text>
              </View>
            )
          })}
        </Animated.View>

      </View>

      <View style={[styles.pillRow, { paddingBottom: insets.bottom + PILL_ROW_BOTTOM_PADDING }]}>
        <TouchableOpacity
          style={[styles.pill, activeKey !== pillRoute.key && styles.pillInactive]}
          activeOpacity={0.85}
          onPress={handlePillPress}
        >
          <DotGrid />
          <Text style={styles.pillText}>{pillTitle}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, position: 'relative' },
  fanOverlay: { position: 'absolute', left: 0, right: 0, height: STAGE_HEIGHT },
  fanVariant: { position: 'absolute', left: 0, right: 0, bottom: 0 },

  compactRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22 },
  compactBubble: {
    width: COMPACT_BUBBLE, height: COMPACT_BUBBLE, borderRadius: COMPACT_BUBBLE / 2,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  bubble: {
    width: BUBBLE, height: BUBBLE, borderRadius: BUBBLE / 2,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleFocused: { borderWidth: 2, borderColor: colors.primary },
  bubbleLabel: { marginTop: 6, fontSize: 11, fontWeight: '600', color: colors.textPrimary, textAlign: 'center', width: BUBBLE + 24, marginLeft: -12 },
  bubbleLabelFocused: { color: colors.primary, fontWeight: '700' },

  pillRow: { alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: PILL_HEIGHT, paddingHorizontal: 20, borderRadius: radius.pill,
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pillInactive: { backgroundColor: colors.primaryLight, shadowOpacity: 0.12 },
  pillText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },

  dotGrid: { width: 14, height: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.85)' },
})
