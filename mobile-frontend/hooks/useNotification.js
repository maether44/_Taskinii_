import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { supabase } from "../lib/supabase";

// expo-notifications weekday: 1=Sunday, 2=Monday, ..., 7=Saturday
const WORKOUT_DAY_NAMES = ["", "sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Spread workout days evenly across the week based on count
const WORKOUT_DAYS_MAP = {
  2: [2, 6], // Mon, Fri
  3: [2, 4, 6], // Mon, Wed, Fri
  4: [2, 3, 5, 6], // Mon, Tue, Thu, Fri
  5: [2, 3, 4, 5, 6], // Mon–Fri
  6: [2, 3, 4, 5, 6, 7], // Mon–Sat
};

const TIME_TO_HOUR = {
  morning: 7,
  afternoon: 13,
  evening: 18,
  any: 8,
};

const HYDRATION_ID = "hydration-5pm";
const TEST_WORKOUT_SEND_NOW = true;

const useNotification = (ml, waterGoalMl = 2000) => {
  // ── Notification 1: Hydration reminder at 5pm ──────────────────────────────
  // Fires at 17:00 each day as long as the user hasn't hit their water goal.
  // Cancels automatically once they reach the goal.
  useEffect(() => {
    const syncHydrationReminder = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") return;

        // Always cancel the previous one-shot reminder before rescheduling
        await Notifications.cancelScheduledNotificationAsync(
          HYDRATION_ID,
        ).catch(() => {});

        if (ml >= waterGoalMl) return; // Goal met — no reminder needed

        const now = new Date();
        const reminderTime = new Date();
        reminderTime.setHours(17, 0, 0, 0);

        // If 5pm already passed today, schedule for tomorrow
        if (reminderTime <= now) {
          reminderTime.setDate(reminderTime.getDate() + 1);
        }

        await Notifications.scheduleNotificationAsync({
          identifier: HYDRATION_ID,
          content: {
            title: "Stay Hydrated! 💧",
            body: `You've only had ${ml}ml today — drink up before the day ends!`,
            sound: true,
          },
          trigger: reminderTime,
        });
      } catch (error) {
        console.error("syncHydrationReminder error:", error);
      }
    };

    syncHydrationReminder();
  }, [ml, waterGoalMl]);

  // ── Notification 2: Workout reminders ──────────────────────────────────────
  // Fetches the user's preferred_workout_time and workout_days_per_week from
  // Supabase and schedules a weekly repeating notification for each workout day.
  useEffect(() => {
    const scheduleWorkoutReminders = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") return;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, preferred_workout_time, workout_days_per_week")
          .eq("id", user.id)
          .single();

        if (!profile?.preferred_workout_time || !profile?.workout_days_per_week)
          return;

        // Cancel any previously scheduled workout reminders
        const scheduled =
          await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(
          scheduled
            .filter((n) => n.identifier.startsWith("workout-"))
            .map((n) =>
              Notifications.cancelScheduledNotificationAsync(n.identifier),
            ),
        );

        const hour = TIME_TO_HOUR[profile.preferred_workout_time] ?? 8;
        const weekdays = WORKOUT_DAYS_MAP[profile.workout_days_per_week] ?? [
          2, 4, 6,
        ];
        const name = profile.display_name || "there";

        if (TEST_WORKOUT_SEND_NOW) {
          console.log("Sending test workout reminder immediately...");
          await Notifications.scheduleNotificationAsync({
            identifier: `workout-test-now`,
            content: {
              title: `Time to train, ${name}! 💪`,
              body: "Test notification sent immediately.",
              sound: true,
            },
            trigger: { seconds: 5 },
          });
          return;
        }

        for (const weekday of weekdays) {
          const dayId = WORKOUT_DAY_NAMES[weekday];
          await Notifications.scheduleNotificationAsync({
            identifier: `workout-${dayId}`,
            content: {
              title: `Time to train, ${name}! 💪`,
              body: "Your workout is scheduled for today. Let's get it done!",
              sound: true,
            },
            trigger: {
              weekday, // 1=Sun … 7=Sat (expo-notifications convention)
              hour,
              minute: 0,
              repeats: true,
            },
          });
        }
      } catch (error) {
        console.error("scheduleWorkoutReminders error:", error);
      }
    };

    scheduleWorkoutReminders();
  }, []);
};

export default useNotification;
