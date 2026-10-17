// Lets local dev builds skip Supabase sign-in when no project is configured yet.
// __DEV__ is false in release builds, so this never ships there. The
// EXPO_PUBLIC_PREVIEW_BUILD half only gets set by the GitHub Pages deploy
// workflow, for the same reason on that build specifically.
export const DEV_BYPASS_KEY = 'bumpling_dev_bypass'
export const allowDevBypass = __DEV__ || process.env.EXPO_PUBLIC_PREVIEW_BUILD === 'true'
