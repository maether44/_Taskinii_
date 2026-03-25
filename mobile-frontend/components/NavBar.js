import React, { useRef, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import {
  Ionicons,
  MaterialCommunityIcons,
  AntDesign,
} from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import Home from "../screens/Home";
import Nutrition from "../screens/Nutrition";
import PostureAI from "../screens/PostureAI";
import Insights from "../screens/Insights";
import Training from "../screens/Training";
import AppTour from "./onBoarding/AppTour";
import YaraAssistant from "./YaraAssistant";

import { useAuth } from "../context/AuthContext";

const Tab = createBottomTabNavigator();

export default function NavBar() {
  const { shouldShowTour, user } = useAuth();
  const navRef = useRef(null);
  const [activeTab, setActiveTab] = useState("Home");

  // console.log("📱 NavBar render - shouldShowTour:", shouldShowTour);

  const handleTabPress = (tabName) => {
    // console.log("📱 NavBar handleTabPress:", tabName);
    if (navRef.current) {
      navRef.current.navigate(tabName);
      setActiveTab(tabName);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        ref={navRef}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#C8F135",
          tabBarInactiveTintColor: "grey",
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: "#E0E0E0",
            backgroundColor: "#161230",
            height: 70,
            paddingBottom: 8,
            paddingTop: 4,
          },
        }}
        screenListeners={{
          state: (e) => {
            const state = e.data.state;
            if (state && state.routes && state.routes[state.index]) {
              const newTab = state.routes[state.index].name;
              // console.log("📱 Tab changed to:", newTab);
              setActiveTab(newTab);
            }
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={Home}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="Nutrition"
          component={Nutrition}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="nutrition" size={size} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="PostureAI"
          component={PostureAI}
          options={{
            tabBarLabel: "Posture",
            tabBarIcon: ({ color, size }) => (
              <AntDesign name="scan" size={size} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="Calendar"
          component={Training}
          options={{
            tabBarLabel: "Training",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="barbell-outline" size={size} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="Insights"
          component={Insights}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="analytics-outline" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>

      <AppTour
        activeTab={activeTab}
        onTabPress={handleTabPress}
        showOnMount={shouldShowTour}
      />

      <YaraAssistant userProfile={user?.user_metadata} />
      
    </View>
  );
}
