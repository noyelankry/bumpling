import type { useRouter } from 'expo-router'

// router.back() throws a dev warning (and does nothing) when there's no history
// to pop — e.g. a page reload, or a screen reached without a prior push. Falls
// back to a known-good destination instead of a no-op back button.
export function goBack(router: ReturnType<typeof useRouter>, fallback: Parameters<ReturnType<typeof useRouter>['replace']>[0]) {
  if (router.canGoBack()) router.back()
  else router.replace(fallback)
}
