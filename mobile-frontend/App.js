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
import { TodayProvider } from "./context/TodayContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

// Must live inside ThemeProvider to call useTheme()
function AppShell({ onLayout, activeTab, setActiveTab, activeRoute, setActiveRoute }) {
  const { colors, isDark } = useTheme();
  return (
    <AuthProvider>
      <TodayProvider>
        <AlexiVoiceProvider>
          <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayout}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <NavigationContainer
              ref={navigationRef}
              onStateChange={(state) => setActiveRoute(getActiveRouteName(state))}
            >
              <Navigation />
            </NavigationContainer>
            <AlexiGatedAssistant activeRoute={activeRoute} />
            <AppTour activeTab={activeTab} onTabPress={setActiveTab} showOnMount={true} />
            <AlexiScreenBorder />
            {activeRoute !== 'WorkoutActive' && <AlexiCompanion />}
            <AlexiDebugOverlay />
          </View>
        </AlexiVoiceProvider>
      </TodayProvider>
    </AuthProvider>
  );
}
import { AlexiVoiceProvider, AlexiCompanion, AlexiScreenBorder, AlexiDebugOverlay, AlexiEvents } from "./context/AlexiVoiceContext";
import { navigationRef } from "./lib/navigationRef";

// ✅ Custom splash screen
import CustomSplashScreen from "./components/CustomSplashScreen";

// Screens - Auth & Onboarding
import SignIn from "./auth/SignIn";
import SignUp from "./auth/SignUp";
import OnBoardingGoal from "./screens/OnBoardingGoal";

// Navigation Hub
import NavBar from "./components/NavBar";

// Sub-Screens
import MealLogger from "./screens/nutrition/MealLogger";
import FoodDetail from "./screens/nutrition/FoodDetail";
import SleepLog from "./screens/sleep/SleepLog";
import FoodScannerScreen from "./components/food-scanner/FoodScannerScreen";
import WorkoutSummary from "./screens/workout/WorkoutSummary";

// Global Components
import YaraAssistant from './components/YaraAssistant';
import AppTour from './components/onBoarding/AppTour';
import { warn } from './lib/logger';

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
          <Stack.Screen name="MainApp" component={NavBar} />
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
  const [splashDone, setSplashDone] = useState(false); // ✅ NEW
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

  // Route navigation commands emitted by AlexiVoiceContext
  useEffect(() => {
    const offNav = AlexiEvents.on('navigate', ({ screen, params }) => {
      try {
        if (!navigationRef.isReady()) {
          console.warn('[Alexi] navigationRef not ready — queued screen:', screen);
          return;
        }
        console.log('[Alexi] → navigate(', screen, params ? JSON.stringify(params) : '', ')');
        navigationRef.navigate(screen, params);
      } catch (e) {
        console.error('[Alexi] Navigation failed for screen "' + screen + '":', e?.message);
      }
    });
    const offBack = AlexiEvents.on('go_back', () => {
      try {
        if (navigationRef.isReady() && navigationRef.canGoBack()) {
          navigationRef.goBack();
        }
      } catch (e) {
        console.error('[Alexi] goBack failed:', e?.message);
      }
    });
    return () => { offNav(); offBack(); };
  }, []);
  if (!appIsReady) return null;

  // ✅ Fonts ready → show custom splash
  if (!splashDone) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <StatusBar style="light" />
        <CustomSplashScreen onDone={() => setSplashDone(true)} />
      </View>
    );
  }

  // ✅ Splash finished → show the real app
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <TodayProvider>
            <View style={styles.container} onLayout={onLayoutRootView}>
              <StatusBar style="light" />
              <NavigationContainer ref={navigationRef} onStateChange={(state) => setActiveRoute(getActiveRouteName(state))}>
                <Navigation />
              </NavigationContainer>
              {showYaraAssistant && (
                <YaraAssistant onOpenSchedule={() => navigationRef.current?.navigate('Schedule')} />
              )}
              <AppTour activeTab={activeTab} onTabPress={setActiveTab} showOnMount={true} />
            </View>
          </TodayProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: "center", alignItems: "center" },
});

registerRootComponent(App);