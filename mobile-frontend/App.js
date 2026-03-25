import React, { useState, useEffect, useCallback } from "react";
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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { registerRootComponent } from "expo";

import { supabase } from "./lib/supabase";
import { AuthProvider, useAuth } from "./context/AuthContext";
import SignIn from "./auth/SignIn";
import SignUp from "./auth/SignUp";
import OnBoardingGoal from "./screens/OnBoardingGoal";
import NavBar from "./components/NavBar";
import Profile from "./screens/Profile";
import Nutrition from "./screens/Nutrition";
import Training from "./screens/Training";
import Insights from "./screens/Insights";
import Home from "./screens/Home";
import ExerciseInfo from "./screens/ExerciseInfo";
import ExerciseCard from "./components/ExerciseCard";
import MealLogger from "./screens/nutrition/MealLogger";
import FoodDetail from "./screens/nutrition/FoodDetail";
import SleepLog from "./screens/sleep/SleepLog";
import WorkoutActive from "./screens/workout/WorkoutActive";
import WorkoutSummary from "./screens/workout/WorkoutSummary";
import PostureAI from "./screens/PostureAI";
import FoodScannerScreen from "./components/food-scanner/FoodScannerScreen";
import YaraAssistant from "./components/YaraAssistant";
import AppTour, { resetTour } from "./components/onBoarding/AppTour";

SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();

function Navigation() {
  const { user, isNewUser, loading } = useAuth();

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
        <>
          <Stack.Screen name="SignIn" component={SignIn} />
          <Stack.Screen name="SignUp" component={SignUp} />
        </>
      ) : isNewUser ? (
        <Stack.Screen name="OnBoarding" component={OnBoardingGoal} />
      ) : (
        <>
          <Stack.Screen name="MainApp" component={NavBar} />
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="Nutrition" component={Nutrition} />
          <Stack.Screen name="Training" component={Training} />
          <Stack.Screen name="Insights" component={Insights} />
          <Stack.Screen name="MealLogger" component={MealLogger} />
          <Stack.Screen name="FoodDetail" component={FoodDetail} />
          <Stack.Screen name="SleepLog" component={SleepLog} />
          <Stack.Screen name="WorkoutActive" component={WorkoutActive} />
          <Stack.Screen name="WorkoutSummary" component={WorkoutSummary} />
          <Stack.Screen name="ExerciseCard" component={ExerciseCard} />
          <Stack.Screen name="ExerciseInfo" component={ExerciseInfo} />
          <Stack.Screen name="PostureAI" component={PostureAI} />
          <Stack.Screen name="FoodScanner" component={FoodScannerScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [tourKey, setTourKey] = useState(0);
  const [activeTab, setActiveTab] = useState("Home");

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
        const { data, error } = await supabase.auth.getSession();
        if (error) console.log("Supabase error:", error.message);
        else console.log("Supabase connected!");
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) await SplashScreen.hideAsync();
  }, [appIsReady]);

  if (!appIsReady) return null;

  const replayTour = async () => {
    await resetTour();
    setTourKey((k) => k + 1);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <View style={styles.container} onLayout={onLayoutRootView}>
            <StatusBar style="auto" />
            <NavigationContainer>
              <Navigation />
            </NavigationContainer>
            <YaraAssistant userProfile={userProfile} />
            <AppTour
              key={tourKey}
              activeTab={activeTab}
              onTabPress={setActiveTab}
            />
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0B1E",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
});

registerRootComponent(App);
