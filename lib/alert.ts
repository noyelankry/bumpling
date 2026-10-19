// RN's Alert.alert is a silent no-op on web — every plain error/info
// message needs a window.alert fallback. The confirm-style dialogs
// (destructive actions, multiple buttons) already have their own
// Platform.OS branch inline wherever they're used; this is just for the
// single-message case, which is where the gap actually was.
import { Alert, Platform } from 'react-native'

export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title)
  else Alert.alert(title, message)
}
