/**
 * hooks/useSleep.js
 * Thin wrapper over TodayContext for sleep data.
 * Return API is identical to the original hook.
 */
import { useToday } from "../context/TodayContext";

export function useSleep() {
  const { loading, sleepHours, sleepQuality, logSleep, refresh } = useToday();

  return {
    loading,
    sleepHours,
    sleepQuality,
    logSleep,
    refresh,
  };
}
