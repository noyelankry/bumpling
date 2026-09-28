// Disables ScrollView dragging entirely when content doesn't actually
// overflow its viewport, so short screens (or ones that start short and grow)
// never allow a phantom scroll/bounce — and never spuriously trigger the nav
// collapse behavior over a few stray pixels of overscroll.
import { useCallback, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'

export function useAutoScrollEnabled() {
  const [containerHeight, setContainerHeight] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)

  // Locked to the FIRST measurement (the screen's normal resting state, with
  // the nav fully expanded) rather than kept live. The nav bar collapsing
  // hands back real screen space, which changes this ScrollView's own
  // measured height — if that fed back into `scrollEnabled` live, a
  // borderline-short page could flip to "doesn't need to scroll" mid-drag,
  // right as the collapse it caused. Whether a page needs scrolling shouldn't
  // depend on a state the scrolling itself triggers.
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerHeight(prev => prev || e.nativeEvent.layout.height)
  }, [])

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    setContentHeight(height)
  }, [])

  // Default to scrollable until both are measured, so a genuinely long page
  // is never briefly locked before its real size is known.
  const scrollEnabled = containerHeight === 0 || contentHeight === 0 || contentHeight > containerHeight

  return { scrollEnabled, onLayout, onContentSizeChange }
}
