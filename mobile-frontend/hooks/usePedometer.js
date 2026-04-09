import { useState, useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import { supabase } from '../lib/supabase';
import * as Haptics from 'expo-haptics';

export function usePedometer(userId) {
  const [stepCount, setStepCount] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastSyncedSteps = useRef(0);

  useEffect(() => {
    let subscription;

    const subscribe = async () => {
      try {
        // 1. Check if device has pedometer
        const available = await Pedometer.isAvailableAsync();
        setIsAvailable(available);
        console.log('✓ Pedometer available:', available);

        if (!available) {
          setSyncError('Pedometer not available on this device');
          return;
        }

        // 2. Request permissions
        const { status } = await Pedometer.requestPermissionsAsync();
        setPermissionStatus(status);
        console.log('✓ Permission status:', status);

        if (status !== 'granted') {
          setSyncError('Pedometer permission denied');
          return;
        }

        // 3. Start watching steps
        subscription = Pedometer.watchStepCount(result => {
          setStepCount(result.steps);
          setSyncError(null);

          const newStepsSinceLastSync = result.steps - lastSyncedSteps.current;

          // Sync every 10 steps (adjust as needed)
          if (newStepsSinceLastSync >= 10) {
            console.log(`📊 ${newStepsSinceLastSync} new steps detected, syncing...`);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            syncStepsToDb(newStepsSinceLastSync);
            lastSyncedSteps.current = result.steps;
          }
        });

        console.log('✓ Pedometer subscribed');
      } catch (error) {
        const msg = error?.message || 'Unknown error';
        console.error('❌ Pedometer setup error:', msg);
        setSyncError(msg);
      }
    };

    subscribe();
    return () => {
      if (subscription) {
        subscription.remove();
        console.log('✓ Pedometer unsubscribed');
      }
    };
  }, [userId]);

  const syncStepsToDb = async (stepsToAdd) => {
    if (!userId) {
      console.error('❌ No userId provided');
      setSyncError('No user ID');
      return;
    }

    setIsSyncing(true);
    const TODAY = new Date().toISOString().split('T')[0];

    try {
      const { error } = await supabase.rpc('increment_steps', {
        p_user_id: userId,
        p_steps: stepsToAdd,
        p_date: TODAY,
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`✓ Synced ${stepsToAdd} steps to database`);
      setSyncError(null);
    } catch (error) {
      const msg = error?.message || 'Sync failed';
      console.error('❌ Sync error:', msg);
      setSyncError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual sync for testing
  const manualSync = async () => {
    const newSteps = stepCount - lastSyncedSteps.current;
    if (newSteps > 0) {
      await syncStepsToDb(newSteps);
      lastSyncedSteps.current = stepCount;
    }
  };

  return {
    stepCount,
    isAvailable,
    permissionStatus,
    syncError,
    isSyncing,
    manualSync, // For testing
  };
}