import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from "@expo-google-fonts/outfit";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { registerRootComponent } from "expo";

// Context & Supabase
import { supabase } from "./lib/supabase";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Screens - Auth & Onboarding
import SignIn from "./auth/SignIn";
import SignUp from "./auth/SignUp";
import OnBoardingGoal from "./screens/OnBoardingGoal";

// Navigation Hub
import NavBar from "./components/NavBar";

// Sub-Screens (These pop up over the tabs)
import MealLogger from "./screens/nutrition/MealLogger";
import FoodDetail from "./screens/nutrition/FoodDetail";
import SleepLog from "./screens/sleep/SleepLog";
import FoodScannerScreen from "./components/food-scanner/FoodScannerScreen";
import WorkoutSummary from "./screens/workout/WorkoutSummary";

// Global Components
import YaraAssistant from "./components/YaraAssistant";
import AppTour from "./components/onBoarding/AppTour";

SplashScreen.preventAutoHideAsync();
const Stack = createStackNavigator();

function getActiveRouteName(state) {
  if (!state) return null;
  const route = state.routes[state.index ?? 0];
  if (route.state) return getActiveRouteName(route.state);
  return route.name;
}

function Navigation() {
  const { user, isNewUser, loading } = useAuth();

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#C8F135" />
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
          {/* 1. This handles Home, Training, Fuel, Insights, and Profile */}
          <Stack.Screen name="MainApp" component={NavBar} />

          {/* 2. These are the sub-pages you need access to from anywhere */}
          <Stack.Screen name="MealLogger" component={MealLogger} />
          <Stack.Screen name="FoodDetail" component={FoodDetail} />
          <Stack.Screen name="SleepLog" component={SleepLog} />
          <Stack.Screen name="FoodScanner" component={FoodScannerScreen} />
          <Stack.Screen name="WorkoutSummary" component={WorkoutSummary} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");
  const [activeRoute, setActiveRoute] = useState(null);

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
        await supabase.auth.getSession();
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <View style={styles.container} onLayout={onLayoutRootView}>
            <StatusBar style="light" />
            <NavigationContainer
              onStateChange={(state) => setActiveRoute(getActiveRouteName(state))}
            >
              <Navigation />
            </NavigationContainer>
            {activeRoute !== 'WorkoutActive' && <YaraAssistant />}
            <AppTour activeTab={activeTab} onTabPress={setActiveTab} showOnMount={true} />
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0B1E" },
  centered: { justifyContent: "center", alignItems: "center" },
});

registerRootComponent(App);