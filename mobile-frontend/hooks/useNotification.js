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
const TEST_WORKOUT_SEND_NOW = false;

const useNotification = (ml, waterGoalMl = 2000) => {
  // ── Notification 1: Hydration reminder TEST MODE ──────────────────────────
  // Fires in 10 seconds if the user hasn't hit 2000ml water intake.
  useEffect(() => {
    const syncHydrationReminder = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          // console.log(
          //   "[HydrationReminder] Notification permission not granted",
          // );
          return;
        }

        // Cancel any previous hydration reminder
        await Notifications.cancelScheduledNotificationAsync(
          HYDRATION_ID,
        ).catch(() => {});

        if (ml >= 2000) {
          // console.log(
          //   `[HydrationReminder] Water goal met (${ml}ml), no notification scheduled.`,
          // );
          return;
        }

        // Schedule for 5pm today, or tomorrow if past 5pm
        const now = new Date();
        const reminderTime = new Date();
        reminderTime.setHours(17, 0, 0, 0);
        if (reminderTime <= now) {
          reminderTime.setDate(reminderTime.getDate() + 1);
        }

        console.log(
          `[HydrationReminder] Scheduling notification for ${reminderTime}`,
        );
        await Notifications.scheduleNotificationAsync({
          identifier: HYDRATION_ID,
          content: {
            title: "BodyQ",
            body: "reminder to drink water! 💧",
            sound: true,
          },
          trigger: { type: "date", date: reminderTime },
        });
        console.log("[HydrationReminder] Notification scheduled.");
      } catch (error) {
        console.error("syncHydrationReminder error:", error);
      }
    };

    syncHydrationReminder();
  }, [ml]);

  // ── Notification 2: Workout reminders ──────────────────────────────────────
  // Fetches the user's preferred_workout_time and workout_days_per_week from
  // Supabase and schedules a weekly repeating notification for each workout day.
  useEffect(() => {
    const scheduleWorkoutReminder = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        console.log(
          "[WorkoutReminder] Notification permission status:",
          status,
        );
        if (status !== "granted") {
          console.log("[WorkoutReminder] Notification permission not granted");
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        console.log("[WorkoutReminder] Supabase user:", user);
        if (!user) {
          console.log("[WorkoutReminder] No user found");
          return;
        }

        const { data: profile} = await supabase
          .from("profiles")
          .select("preferred_workout_time")
          .eq("id", user.id)
          .single();

        if (!profile?.preferred_workout_time) {
          console.log("[WorkoutReminder] No preferred_workout_time found");
          return;
        }

        // Cancel any previously scheduled workout reminders
        const scheduled =
          await Notifications.getAllScheduledNotificationsAsync();
        // console.log(
        //   "[WorkoutReminder] Scheduled notifications before cancel:",
        //   scheduled,
        // );
        await Promise.all(
          scheduled
            .filter((n) => n.identifier.startsWith("workout-"))
            .map((n) =>
              Notifications.cancelScheduledNotificationAsync(n.identifier),
            ),
        );

        const hour = TIME_TO_HOUR[profile.preferred_workout_time] ?? 8;
        console.log("[WorkoutReminder] Hour for notification:", hour);

        // For testing: if TEST_WORKOUT_SEND_NOW is true, schedule in 10 seconds
        let reminderTime;
        if (TEST_WORKOUT_SEND_NOW) {
          reminderTime = new Date(Date.now() + 10000); // 10 seconds from now
          console.log(
            "[WorkoutReminder] TEST MODE: Scheduling in 10 seconds at",
            reminderTime,
          );
        } else {
          const now = new Date();
          reminderTime = new Date();
          reminderTime.setHours(hour, 0, 0, 0);
          if (reminderTime <= now) {
            reminderTime.setDate(reminderTime.getDate() + 1);
          }
          console.log("[WorkoutReminder] Scheduling for:", reminderTime);
        }

        // Set notification body based on preferred_workout_time
        let workoutBody = "Time to exercise!";
        if (profile.preferred_workout_time === "any") {
          workoutBody = "Don't forget to workout!";
        }

        await Notifications.scheduleNotificationAsync({
          identifier: `workout-time`,
          content: {
            title: "BodyQ",
            body: workoutBody,
            sound: true,
          },
          trigger: { type: "date", date: reminderTime },
        });
        console.log("[WorkoutReminder] Notification scheduled.");
      } catch (error) {
        console.error("scheduleWorkoutReminders error:", error);
      }
    };

    scheduleWorkoutReminder();
  }, []);
};

export default useNotification;
