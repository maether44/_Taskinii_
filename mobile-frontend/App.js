import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { supabase } from "./lib/supabase";
import { AuthProvider, useAuth } from "./context/AuthContext";

import SignIn from "./auth/SignIn";
import SignUp from "./auth/SignUp";
import Profile from "./screens/Profile";
import NavBar from "./components/NavBar";
import OnBoardingGoal from "./screens/OnBoardingGoal";
import MealLogger from "./screens/nutrition/MealLogger";
import FoodDetail from "./screens/nutrition/FoodDetail";
import SleepLog from "./screens/sleep/SleepLog";
import WorkoutActive from "./screens/workout/WorkoutActive";
import WorkoutSummary from "./screens/workout/WorkoutSummary";
import ExerciseInfo from "./screens/ExerciseInfo";
import ExerciseCard from "./components/ExerciseCard";
import AppTour from "./components/onBoarding/AppTour";


// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();

// Navigation component that uses auth context
function Navigation() {
  const { user, isNewUser, loading } = useAuth();

  console.log("🔐 Auth State:", {
    user: user?.email || "No user",
    isNewUser,
    userName: user?.user_metadata?.full_name || "No name",
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6F4BF2" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Not logged in → auth screens
        <>
          <Stack.Screen name="SignIn" component={SignIn} />
          <Stack.Screen name="SignUp" component={SignUp} />
        </>
      ) : isNewUser ? (
        // Logged in but onboarding not done → onboarding
        <Stack.Screen name="OnBoarding" component={OnBoardingGoal} />
      ) : (
        // Fully set up → main app
        <>
          <Stack.Screen name="MainApp" component={NavBar} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="MealLogger" component={MealLogger} />
          <Stack.Screen name="FoodDetail" component={FoodDetail} />
          <Stack.Screen name="SleepLog" component={SleepLog} />
          <Stack.Screen name="WorkoutActive" component={WorkoutActive} />
          <Stack.Screen name="WorkoutSummary" component={WorkoutSummary} />
          <Stack.Screen name="ExerciseCard" component={ExerciseCard} />
          <Stack.Screen name="ExerciseInfo" component={ExerciseInfo} />
          <Stack.Screen name="AppTour" component={AppTour} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          "Outfit-Regular": Outfit_400Regular,
          "Outfit-Medium": Outfit_500Medium,
          "Outfit-SemiBold": Outfit_600SemiBold,
          "Outfit-Bold": Outfit_700Bold,
          "Inter-Regular": Inter_400Regular,
          "Inter-SemiBold": Inter_600SemiBold,
        });

        console.log("🔍 Testing Supabase connection...");
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.log("❌ Supabase connection error:", error.message);
        } else {
          console.log("✅ Successfully connected to Supabase!");
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.container} onLayout={onLayoutRootView}>
          <StatusBar style="auto" />
          <NavigationContainer>
            <Navigation />
          </NavigationContainer>
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
});
