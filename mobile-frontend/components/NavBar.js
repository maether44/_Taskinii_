import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// Screens
import Home from "../screens/Home";
import Nutrition from "../screens/Nutrition";
import Insights from "../screens/Insights";
import Profile from "../screens/Profile";
import Training from "../screens/Training";
import ExerciseList from "../screens/ExerciseList";
import ExerciseInfo from "../screens/ExerciseInfo";
import WorkoutActive from "../screens/workout/WorkoutActive";
import WorkoutSummary from "../screens/workout/WorkoutSummary";
import PostureAI from "../screens/PostureAI";

// New screens
import EditProfileScreen from "../screens/Editprofilescreen";
import WorkoutHistoryScreen from "../screens/Workouthistoryscreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TrainingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TrainingHub" component={Training} />
      <Stack.Screen name="ExerciseList" component={ExerciseList} />
      <Stack.Screen name="ExerciseInfo" component={ExerciseInfo} />
      <Stack.Screen name="PostureAI" component={PostureAI} />
      <Stack.Screen
        name="WorkoutActive"
        component={WorkoutActive}
        options={{ tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="WorkoutSummary"
        component={WorkoutSummary}
        options={{ tabBarStyle: { display: 'none' } }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={Profile} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
    </Stack.Navigator>
  );
}

export default function NavBar() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#C8F135",
          tabBarInactiveTintColor: "#6B5F8A",
          tabBarStyle: {
            backgroundColor: "#0F0B1E",
            borderTopColor: "#1E1A35",
            height: 85,
            paddingBottom: 20,
          },
        }}
      >
        <Tab.Screen name="Home" component={Home}
          options={{ tabBarIcon: ({ color }) => <Ionicons name="flash" size={24} color={color} /> }} />

        <Tab.Screen name="Fuel" component={Nutrition}
          options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="food-apple" size={24} color={color} /> }} />

        <Tab.Screen name="Train" component={TrainingStack}
          options={{ tabBarIcon: ({ color }) => <Ionicons name="barbell" size={24} color={color} /> }} />

        <Tab.Screen name="Insights" component={Insights}
          options={{ tabBarIcon: ({ color }) => <Ionicons name="analytics" size={24} color={color} /> }} />

        <Tab.Screen name="Profile" component={ProfileStack}
          options={{ tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} /> }} />
      </Tab.Navigator>
    </View>
  );
}