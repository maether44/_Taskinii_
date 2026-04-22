import AsyncStorage from '@react-native-async-storage/async-storage';
// import { TOUR_VERSION } from '../constants/tourSteps';

// const TOUR_KEY = `@fitapp_tour_v${TOUR_VERSION}`;

const TOUR_KEY = `@fitapp_tour_v0`; // ← reset tour for all users by changing this value

export const hasTourBeenSeen = async () => {
  const val = await AsyncStorage.getItem(TOUR_KEY);
  return !!val;
};

export const markTourSeen = async () => {
  await AsyncStorage.setItem(TOUR_KEY, 'true');
};

export const resetTour = async () => {
  await AsyncStorage.removeItem(TOUR_KEY);
};
