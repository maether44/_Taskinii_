// App.js — BodyQ root
// Uses flat navigate() pattern (no React Navigation) matching existing screens

import { registerRootComponent } from 'expo';
import { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

import AppTour, { resetTour } from './components/AppTour';
import NavBar from './components/NavBar';
import YaraAssistant from './components/YaraAssistant';

import Home     from './screens/Home';
import Insights from './screens/Insights';
import Nutrition from './screens/Nutrition';
import PostureAI from './screens/PostureAI';
import Profile  from './screens/Profile';
import Training from './screens/Training';

import FoodScannerScreen from './components/FoodScanner/FoodScannerScreen';
import MealLogger   from './screens/nutrition/MealLogger';
import SleepLog     from './screens/sleep/SleepLog';
import WorkoutActive  from './screens/workout/WorkoutActive';
import WorkoutSummary from './screens/workout/WorkoutSummary';
import OnboardingGoal from './screens/onboarding/OnboardingGoal';

export default function App() {
  const [onboarded,    setOnboarded]    = useState(false);
  const [userProfile,  setUserProfile]  = useState(null);
  const [activeTab,    setActiveTab]    = useState('Home');
  const [subScreen,    setSubScreen]    = useState(null);  // { screen, props }
  const [tourKey,      setTourKey]      = useState(0);

  const navigate = (screen, props = {}) => setSubScreen({ screen, props });
  const goBack   = () => setSubScreen(null);

  // ── Onboarding ──────────────────────────────────────────────────────────────
  if (!onboarded) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0814" />
        <OnboardingGoal
          onComplete={profile => {
            setUserProfile(profile);
            setOnboarded(true);
          }}
        />
      </View>
    );
  }

  // ── Sub-screens ─────────────────────────────────────────────────────────────
  if (subScreen) {
    const { screen, props } = subScreen;

    if (screen === 'WorkoutActive') return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
        <WorkoutActive
          workout={props.workout}
          onFinish={result =>
            navigate('WorkoutSummary', {
              result,
              workoutName: props.workout?.name,
              workout: props.workout,
            })
          }
        />
      </View>
    );

    if (screen === 'WorkoutSummary') return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
        <WorkoutSummary
          result={props.result}
          workoutName={props.workoutName}
          onHome={goBack}
          onGoAgain={() => navigate('WorkoutActive', { workout: props.workout })}
        />
      </View>
    );

    if (screen === 'MealLogger') return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
        <MealLogger
          mealSlot={props.mealSlot}
          onSave={(items, totals) => {
            props.onSaved?.();
            goBack();
          }}
          onClose={goBack}
        />
      </View>
    );

    if (screen === 'SleepLog') return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
        <SleepLog onSave={goBack} onClose={goBack} />
      </View>
    );

    if (screen === 'FoodScanner') return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
        <FoodScannerScreen
          currentCalories={props.currentCalories}
          currentProtein={props.currentProtein}
          currentCarbs={props.currentCarbs}
          currentFat={props.currentFat}
          goalCalories={props.goalCalories}
          goalProtein={props.goalProtein}
          goalCarbs={props.goalCarbs}
          goalFat={props.goalFat}
          onLogged={() => { props.onLogged?.(); goBack(); }}
          onClose={goBack}
        />
      </View>
    );
  }

  // ── Main app ─────────────────────────────────────────────────────────────────
  const renderScreen = () => {
    switch (activeTab) {
      case 'Home':      return <Home      navigate={navigate} />;
      case 'Nutrition': return <Nutrition navigate={navigate} />;
      case 'PostureAI': return <PostureAI navigate={navigate} />;
      case 'Training':  return <Training  navigate={navigate} />;
      case 'Insights':  return <Insights  navigate={navigate} />;
      case 'Profile':   return (
        <Profile
          navigate={navigate}
          replayTour={async () => {
            await resetTour();
            setTourKey(k => k + 1);
          }}
        />
      );
      default:          return <Home navigate={navigate} />;
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0814" />
      <View style={s.screen}>{renderScreen()}</View>
      <NavBar activeTab={activeTab} onTabPress={setActiveTab} />
      <YaraAssistant userProfile={userProfile} />
      <AppTour key={tourKey} activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#0A0814' },
  screen: { flex: 1 },
});

registerRootComponent(App);