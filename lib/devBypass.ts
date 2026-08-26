// Lets local dev builds skip Supabase sign-in when no project is configured yet.
// __DEV__ is false in release builds, so this never ships.
export const DEV_BYPASS_KEY = 'bumpling_dev_bypass'
