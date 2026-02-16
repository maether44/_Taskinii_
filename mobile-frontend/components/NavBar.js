import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import Home from '../screens/Home';
import Profile from '../screens/Profile';

const Tab = createBottomTabNavigator();

export default function NavBar() {
    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: 'tomato',
                    tabBarInactiveTintColor: 'gray',
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
                    name="Profile"
                    component={Profile}
                    options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="profile" size={size} color={color} />
                    ),
                    }}
                />

            </Tab.Navigator>
        </NavigationContainer>
    )
}
