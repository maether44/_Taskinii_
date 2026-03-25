import { useState, useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import { supabase } from '../lib/supabase';
import * as Haptics from 'expo-haptics';

export function usePedometer(userId) {
  const [stepCount, setStepCount] = useState(0);
  const lastSyncedSteps = useRef(0); // Keeps track of what we already sent to DB

  useEffect(() => {
    let subscription;

    const subscribe = async () => {
      const { status } = await Pedometer.requestPermissionsAsync();
      if (status !== 'granted') return;

      const isAvailable = await Pedometer.isAvailableAsync();
      console.log('Is Pedometer available?', isAvailable);

      const { status: permStatus } = await Pedometer.getPermissionsAsync();
      console.log('Pedometer Permission Status:', permStatus);

      if (isAvailable) {
        subscription = Pedometer.watchStepCount(result => {
          setStepCount(result.steps);

          // Calculate how many NEW steps since the last sync
          const newStepsSinceLastSync = result.steps - lastSyncedSteps.current;

          // TEST MODE: Sync every 5 steps
          if (newStepsSinceLastSync >= 5) {
            console.log(`Syncing ${newStepsSinceLastSync} steps to Supabase...`);
            
            // Level 5 Detail: Subtle vibration when syncing
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            
            syncStepsToDb(newStepsSinceLastSync);
            lastSyncedSteps.current = result.steps; // Update the marker
          }
        });
      }
    };

    subscribe();
    return () => subscription && subscription.remove();
  }, [userId]);

  const syncStepsToDb = async (stepsToAdd) => {
    const TODAY = new Date().toISOString().split('T')[0];
    
    // Call the SQL function we created in Step 2
    const { error } = await supabase.rpc('increment_steps', { 
      p_user_id: userId, 
      p_steps: stepsToAdd, 
      p_date: TODAY 
    });

    if (error) console.error("Sync Error:", error.message);
  };

  return { stepCount };
}