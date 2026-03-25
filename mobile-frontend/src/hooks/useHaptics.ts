import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

export function useHaptics() {
  /**
   * Light tap — nav taps, small interactions (toggles, chips)
   */
  const lightTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  /**
   * Medium tap — logging a meal, completing a set, adding water
   */
  const mediumTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  /**
   * Success pulse — scan match, goal hit, water glass filled
   */
  const successPulse = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  /**
   * Error pulse — scan fail, network error, validation fail
   */
  const errorPulse = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  return { lightTap, mediumTap, successPulse, errorPulse };
}
