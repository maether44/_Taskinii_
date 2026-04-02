import * as Notifications from "expo-notifications";
import { supabase } from "../lib/supabase"; // adjust path
import { Alert } from "react-native";

const handleSendNotification = async () => {
  try {
    // 1. Check / request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Notifications disabled",
        "Please allow notifications to send a test notification."
      );
      return;
    }

    // 2. Fetch the current user's data from Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      Alert.alert("Error", "Could not get current user.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("daily_activity")
      .select("water_ml, daily_calorie_goal, streak") // adjust columns to yours
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      Alert.alert("Error", "Could not load profile data.");
      return;
    }

    // 3. Build notification content based on user data
    const { display_name, daily_calorie_goal, streak } = profile;

    const title = `Hey ${display_name || "there"} 👋`;
    const body = streak
      ? `You're on a ${streak}-day streak! Stay on track — goal: ${daily_calorie_goal} kcal.`
      : `Don't forget your daily goal: ${daily_calorie_goal} kcal today!`;

    // 4. Schedule the notification (trigger: null = fires immediately)
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null,
    });

  } catch (error) {
    console.warn("Failed to send notification:", error);
    Alert.alert("Error", "Could not send notification right now.");
  }
};