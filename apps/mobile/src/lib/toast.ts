import { Alert, Platform, ToastAndroid } from 'react-native';

export function showToast(message: string): void {
  const safeMessage = message.trim() || 'Something went wrong';

  if (Platform.OS === 'android') {
    ToastAndroid.show(safeMessage, ToastAndroid.SHORT);
    return;
  }

  Alert.alert('Error', safeMessage);
}
