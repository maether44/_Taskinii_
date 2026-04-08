/**
 * navigationRef.js
 *
 * Singleton navigation ref that can be used outside of React components
 * (e.g., AriaVoiceContext command handler, AriaEvents listeners).
 *
 * Usage:
 *   In App.js:       <NavigationContainer ref={navigationRef} ...>
 *   Anywhere else:   navigationRef.navigate('Train')
 */
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();
