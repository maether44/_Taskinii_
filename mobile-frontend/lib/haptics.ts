import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export function lightTap() {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function mediumTap() {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function successTap() {
  if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function errorTap() {
  if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
