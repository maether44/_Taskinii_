import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { Train } from 'lucide-react-native';

import Home from '../screens/Home';
import Profile from '../screens/Profile';
import ExerciseList from '../screens/ExerciseList';
import Nutrition from '../screens/Nutrition';
import PostureAI from '../screens/PostureAI';
import Insights from '../screens/Insights';
import Training from '../screens/Training';

const Tab = createBottomTabNavigator();

export default function NavBar() {
    return (
            <Tab.Navigator
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: '#C8F135',
                    tabBarInactiveTintColor: 'grey',
                    tabBarStyle: {
                        borderTopWidth: 1,
                        borderTopColor: '#E0E0E0',
                        backgroundColor: '#161230',
                        height: 70,
                        paddingBottom: 8,
                        paddingTop: 4,
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
                    name="Exercises"
                    component={ExerciseList}
                    options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="barbell" size={size} color={color} />
                    ),
                    }}
                />

                {/* <Tab.Screen
                    name="Profile"
                    component={Profile}
                    options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                    }}
                /> */}

                <Tab.Screen
                    name="PostureAI"
                    component={PostureAI}
                    options={{
                    tabBarIcon: ({ color, size }) => (
                        <AntDesign name="scan" size={size} color={color} />
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
                    name="Calendar"
                    component={Training}
                    options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar-outline" size={size} color={color} />
                    ),
                    }}
                />

                {/* <Tab.Screen
                    name="Insights"
                    component={Insights}
                    options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="stats-chart" size={size} color={color} />
                    ),
                    }}
                /> */}

            </Tab.Navigator>
    )
}
