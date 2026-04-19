import React from 'react';
import { Image, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Screens
import Home from '../screens/Home';
import Nutrition from '../screens/Nutrition';
import Insights from '../screens/Insights';
import Profile from '../screens/Profile';
import Settings from '../screens/Settings';
import Training from '../screens/Training';
import ExerciseList from '../screens/ExerciseList';
import ExerciseInfo from '../screens/ExerciseInfo';
import WorkoutActive from '../screens/workout/WorkoutActive';
import WorkoutSummary from '../screens/workout/WorkoutSummary';
import PostureAI from '../screens/PostureAI';

// New screens
import EditProfileScreen from '../screens/Editprofilescreen';
import WorkoutHistoryScreen from '../screens/Workouthistoryscreen';
import HelpCenter from '../screens/settings/HelpCenter';
import ReportProblem from '../screens/settings/ReportProblem';
import TermsPolicies from '../screens/settings/TermsPolicies';
import TrustCenter from '../screens/settings/TrustCenter';

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
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenter} />
      <Stack.Screen name="ReportProblem" component={ReportProblem} />
      <Stack.Screen name="TermsPolicies" component={TermsPolicies} />
      <Stack.Screen name="TrustCenter" component={TrustCenter} />
      <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
    </Stack.Navigator>
  );
}

export default function NavBar() {
  const { profileAvatarUri } = useAuth();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#C8F135',
          tabBarInactiveTintColor: '#6B5F8A',
          tabBarStyle: {
            backgroundColor: '#0F0B1E',
            borderTopColor: '#1E1A35',
            height: 85,
            paddingBottom: 20,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={Home}
          options={{ tabBarIcon: ({ color }) => <Ionicons name="flash" size={24} color={color} /> }}
        />

        <Tab.Screen
          name="Fuel"
          component={Nutrition}
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="food-apple" size={24} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="Train"
          component={TrainingStack}
          options={{
            tabBarIcon: ({ color }) => <Ionicons name="barbell" size={24} color={color} />,
          }}
        />

        <Tab.Screen
          name="Insights"
          component={Insights}
          options={{
            tabBarIcon: ({ color }) => <Ionicons name="analytics" size={24} color={color} />,
          }}
        />

        <Tab.Screen
          name="Profile"
          component={ProfileStack}
          options={{
            tabBarLabel: () => null,
            tabBarIconStyle: { marginTop: 8 },
            tabBarIcon: ({ color, focused }) =>
              profileAvatarUri ? (
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: focused ? '#C8F135' : '#3d3f1e',
                  }}
                >
                  <Image
                    source={{ uri: profileAvatarUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <Ionicons name="person" size={24} color={color} />
              ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}
