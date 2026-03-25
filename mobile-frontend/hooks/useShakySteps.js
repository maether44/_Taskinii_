import { useState, useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';

export function useShakySteps(userId) {
  const [steps, setSteps] = useState(0);
  const lastSync = useRef(0);
  
  // SENSITIVITY SETTINGS
  const THRESHOLD = 2.0; // Lower = more sensitive. 2.0 is very easy to trigger.
  const cooldown = useRef(false);

  useEffect(() => {
    // Set update speed to fast (100ms)
    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(data => {
      const { x, y, z } = data;
      // Calculate total force
      const acceleration = Math.sqrt(x * x + y * y + z * z);

      if (acceleration > THRESHOLD && !cooldown.current) {
        // TRIGGER STEP
        setSteps(prev => prev + 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Cooldown to prevent 1 shake counting as 100 steps
        cooldown.current = true;
        setTimeout(() => { cooldown.current = false; }, 250); // 0.25 seconds between steps

        // SYNC EVERY STEP (For the Demo)
        syncOneStep();
      }
    });

    return () => subscription.remove();
  }, [userId]);

  const syncOneStep = async () => {
    const TODAY = new Date().toISOString().split('T')[0];
    await supabase.rpc('increment_steps', { 
      p_user_id: userId, 
      p_steps: 1, 
      p_date: TODAY 
    });
  };

  return { steps };
}