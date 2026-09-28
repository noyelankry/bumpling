// Shared scroll-driven state for the radial nav's collapsible fan: every
// scrollable tab screen reports its scroll events here, and RadialTabBar
// reads the resulting Animated.Value to fade/shrink the fan bubbles. Lives
// above the tab navigator in the tree so both sides can reach it.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Animated, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'

type NavVisibilityContextValue = {
  /** 0 = fan collapsed/hidden, 1 = fan fully expanded. Only ever drives
   * opacity (the reserved space itself snaps instantly, separately), so this
   * runs on the native driver for a cheap, jank-free crossfade. */
  expanded: Animated.Value
  /** Non-animated mirror of `expanded`'s target, for pointerEvents (can't read an Animated.Value synchronously). */
  collapsed: boolean
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void
  expand: () => void
}

const NavVisibilityContext = createContext<NavVisibilityContextValue | null>(null)

const COLLAPSE_DELTA = 12 // px of downward scroll before the fan hides
const EXPAND_DELTA = 12   // px of upward scroll before the fan comes back
const NEAR_TOP = 24       // always show the fan once scrolled back near the top
// Below this much total scrollable range, don't attempt the collapse
// behavior at all — the delta-threshold logic is built for long content, and
// on a handful of scrollable pixels it just reads as noise: a fast flick
// reports back-and-forth positions that can cross different thresholds in
// different directions within the same gesture, flickering between states.
const MIN_SCROLLABLE_RANGE = 80

export function NavVisibilityProvider({ children }: { children: ReactNode }) {
  const expanded = useRef(new Animated.Value(1)).current
  const [collapsed, setCollapsedState] = useState(false)
  const collapsedRef = useRef(false)
  const lastOffset = useRef(0)

  const setCollapsed = useCallback((next: boolean) => {
    if (collapsedRef.current === next) return
    collapsedRef.current = next
    setCollapsedState(next)
    Animated.timing(expanded, {
      toValue: next ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }, [expanded])

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
    // Clamp out rubber-band/bounce overshoot (common on short pages, where a
    // fast flick easily overscrolls past the real bottom) — otherwise the
    // bounce-back generates its own scroll events that can flip the state
    // back to expanded right as the gesture settles, even though the user
    // never actually scrolled back up.
    const maxY = Math.max(0, contentSize.height - layoutMeasurement.height)
    if (maxY < MIN_SCROLLABLE_RANGE) {
      setCollapsed(false)
      return
    }
    const y = Math.max(0, Math.min(contentOffset.y, maxY))
    const delta = y - lastOffset.current
    if (y <= NEAR_TOP) {
      setCollapsed(false)
    } else if (delta > COLLAPSE_DELTA) {
      setCollapsed(true)
    } else if (delta < -EXPAND_DELTA) {
      setCollapsed(false)
    }
    lastOffset.current = y
  }, [setCollapsed])

  const expand = useCallback(() => setCollapsed(false), [setCollapsed])

  return (
    <NavVisibilityContext.Provider value={{ expanded, collapsed, onScroll, expand }}>
      {children}
    </NavVisibilityContext.Provider>
  )
}

export function useNavVisibility() {
  const ctx = useContext(NavVisibilityContext)
  if (!ctx) throw new Error('useNavVisibility must be used within NavVisibilityProvider')
  return ctx
}
