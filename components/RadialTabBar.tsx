import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Line } from 'react-native-svg'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { colors, radius } from '../lib/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const ICON: Record<string, { name: IoniconsName; color: string }> = {
  index: { name: 'home-outline', color: colors.primary },
  plan: { name: 'calendar-outline', color: colors.textPrimary },
  health: { name: 'leaf-outline', color: colors.lavenderDeep },
  more: { name: 'person-outline', color: colors.primary },
}

const STAGE_HEIGHT = 150
const PILL_HEIGHT = 52
const BUBBLE = 56
const FAN_RADIUS = 84
// Angles (standard math convention, 90° = straight up) spread the three
// non-Today tabs across the top of the arc; hardcoded for the fixed 4-tab set.
const FAN_ANGLES = [150, 90, 30]

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

  // "Today" is always the anchored pill and the other three are always the
  // fan bubbles, in the same fixed spots, no matter which tab is active —
  // focus is shown with a highlight on that item, not by rearranging the bar.
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

  return (
    <View style={styles.wrap}>
      <View style={styles.stage} onLayout={onStageLayout}>
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
      </View>

      <View style={[styles.pillRow, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.pill, activeKey !== pillRoute.key && styles.pillInactive]}
          activeOpacity={0.85}
          onPress={() => goTo(pillRoute.key, pillRoute.name)}
        >
          <DotGrid />
          <Text style={styles.pillText}>{pillTitle}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap:  { backgroundColor: colors.background },
  stage: { height: STAGE_HEIGHT, position: 'relative' },

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
