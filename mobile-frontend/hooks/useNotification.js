import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { warn } from '../lib/logger';
import { listThreads } from '../services/dmService';

const TIME_TO_HOUR = {
  morning: 7,
  afternoon: 13,
  evening: 18,
  any: 8,
};

const HYDRATION_ID = 'hydration-5pm';
const TEST_WORKOUT_SEND_NOW = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const useNotification = (ml, waterGoalMl = 2000, enabledNotifications = {}) => {
  const { workout: notifWorkout = true, water: notifWater = true } = enabledNotifications;

  useEffect(() => {
    const syncHydrationReminder = async () => {
      try {
        if (!notifWater) {
          console.log('[HydrationReminder] Disabled in profile settings. Cancelling reminder.');
          await Notifications.cancelScheduledNotificationAsync(HYDRATION_ID).catch(() => {});
          return;
        }

        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;

        await Notifications.cancelScheduledNotificationAsync(HYDRATION_ID).catch(() => {});

        if (ml >= waterGoalMl) return;

        const now = new Date();
        const reminderTime = new Date();
        reminderTime.setHours(17, 0, 0, 0);
        if (reminderTime <= now) {
          reminderTime.setDate(reminderTime.getDate() + 1);
        }

        console.log(`[HydrationReminder] Scheduling notification for ${reminderTime}`);
        await Notifications.scheduleNotificationAsync({
          identifier: HYDRATION_ID,
          content: {
            title: 'BodyQ',
            body: 'reminder to drink water! 💧',
            sound: true,
          },
          trigger: { type: 'date', date: reminderTime },
        });
        console.log('[HydrationReminder] Notification scheduled.');
      } catch (error) {
        console.error('syncHydrationReminder error:', error);
      }
    };

    syncHydrationReminder();
  }, [ml, waterGoalMl, notifWater]);

  useEffect(() => {
    const scheduleWorkoutReminder = async () => {
      try {
        if (!notifWorkout) {
          const scheduled = await Notifications.getAllScheduledNotificationsAsync();
          const workoutScheduled = scheduled.filter((n) => n.identifier.startsWith('workout-'));
          await Promise.all(
            workoutScheduled.map((n) =>
              Notifications.cancelScheduledNotificationAsync(n.identifier),
            ),
          );
          console.log(
            `[WorkoutReminder] Disabled in profile settings. Cancelled ${workoutScheduled.length} scheduled reminder(s).`,
          );
          return;
        }

        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          console.log('[WorkoutReminder] Notification permission not granted');
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.log('[WorkoutReminder] No user found');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_workout_time')
          .eq('id', user.id)
          .single();

        if (!profile?.preferred_workout_time) {
          console.log('[WorkoutReminder] No preferred_workout_time found');
          return;
        }

        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(
          scheduled
            .filter((n) => n.identifier.startsWith('workout-'))
            .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
        );

        const hour = TIME_TO_HOUR[profile.preferred_workout_time] ?? 8;
        console.log('[WorkoutReminder] Hour for notification:', hour);

        let reminderTime;
        if (TEST_WORKOUT_SEND_NOW) {
          reminderTime = new Date(Date.now() + 10000);
          console.log('[WorkoutReminder] TEST MODE: Scheduling in 10 seconds at', reminderTime);
        } else {
          const now = new Date();
          reminderTime = new Date();
          reminderTime.setHours(hour, 0, 0, 0);
          if (reminderTime <= now) {
            reminderTime.setDate(reminderTime.getDate() + 1);
          }
          console.log('[WorkoutReminder] Scheduling for:', reminderTime);
        }

        let workoutBody = 'Time to exercise!';
        if (profile.preferred_workout_time === 'any') {
          workoutBody = "Don't forget to workout!";
        }

        await Notifications.scheduleNotificationAsync({
          identifier: 'workout-time',
          content: {
            title: 'BodyQ',
            body: workoutBody,
            sound: true,
          },
          trigger: { type: 'date', date: reminderTime },
        });
        console.log('[WorkoutReminder] Notification scheduled.');
      } catch (error) {
        console.error('scheduleWorkoutReminders error:', error);
      }
    };

    scheduleWorkoutReminder();
  }, [notifWorkout]);
};

export const useUnreadMessageNotifications = (userId, activeRoute) => {
  useEffect(() => {
    let mounted = true;
    let previousUnreadByThreadId = new Map();
    let hasSeededUnread = false;

    const ensureNotificationPermission = async () => {
      const current = await Notifications.getPermissionsAsync();
      if (current.status === 'granted') return true;

      const requested = await Notifications.requestPermissionsAsync();
      return requested.status === 'granted';
    };

    const snapshotUnread = async () => {
      const rows = await listThreads(userId);
      const unreadByThread = new Map();

      (rows || []).forEach((thread) => {
        unreadByThread.set(thread.id, Number(thread.unreadCount || 0));
      });

      return { rows, unreadByThread };
    };

    const seedUnreadSnapshot = async () => {
      if (!userId) return;

      try {
        const { unreadByThread } = await snapshotUnread();
        if (!mounted) return;
        previousUnreadByThreadId = unreadByThread;
        hasSeededUnread = true;
      } catch (error) {
        warn('[DM notifications] Failed to seed unread snapshot:', error?.message || error);
      }
    };

    const notifyUnreadIncrease = async (threadId) => {
      if (!hasSeededUnread || !threadId) return;

      try {
        const hasPermission = await ensureNotificationPermission();
        if (!hasPermission) return;

        const { rows, unreadByThread } = await snapshotUnread();
        if (!mounted) return;

        const previousUnread = Number(previousUnreadByThreadId.get(threadId) || 0);
        const nextUnread = Number(unreadByThread.get(threadId) || 0);
        previousUnreadByThreadId = unreadByThread;

        if (nextUnread <= previousUnread) return;
        if (activeRoute === 'DMThread') return;

        const thread = (rows || []).find((row) => row.id === threadId);
        const peerName = thread?.peerName || 'Someone';

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'New message',
            body:
              nextUnread > 1
                ? `${peerName} sent a message (${nextUnread} unread)`
                : `${peerName} sent you a message`,
            sound: true,
            data: { type: 'dm', threadId },
          },
          trigger: null,
        });
      } catch (error) {
        warn('[DM notifications] Failed to schedule notification:', error?.message || error);
      }
    };

    seedUnreadSnapshot();

    if (!userId) {
      return () => {
        mounted = false;
      };
    }

    const channel = supabase
      .channel(`dm-unread-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${userId}`,
        },
        async (payload) => {
          const conversationId = payload?.new?.conversation_id;
          await notifyUnreadIncrease(conversationId);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, activeRoute]);
};

export const useUnreadMessageSummary = (userId) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    try {
      const rows = await listThreads(userId);
      const totalUnread = (rows || []).reduce(
        (total, thread) => total + Number(thread.unreadCount || 0),
        0,
      );
      setUnreadCount(totalUnread);
    } catch (error) {
      warn('[DM badge] Failed to refresh unread count:', error?.message || error);
    }
  }, [userId]);

  useEffect(() => {
    refreshUnreadCount();

    if (!userId) return undefined;

    const channel = supabase
      .channel(`dm-badge-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${userId}`,
        },
        refreshUnreadCount,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        refreshUnreadCount,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshUnreadCount]);

  return { unreadCount, refreshUnreadCount };
};

export default useNotification;
