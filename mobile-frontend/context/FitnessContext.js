// context/FitnessContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { scheduleStore } from '../store/scheduleStore';

const FitnessContext = createContext();

export function FitnessProvider({ children }) {
  const [weeklyPlan, setWeeklyPlan] = useState(scheduleStore.get());
  const [calories, setCalories] = useState({ eaten: 0, goal: 1924 });
  const [todayWorkout, setTodayWorkout] = useState(() => {
    const plan = scheduleStore.get();
    const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    return plan?.days?.[todayIdx] ?? null;
  });

  useEffect(() => {
    // Sync with scheduleStore updates
    const unsub = scheduleStore.subscribe((plan) => {
      setWeeklyPlan(plan);
      const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
      setTodayWorkout(plan?.days?.[todayIdx] ?? null);
    });
    fetchCalories();
    return unsub;
  }, []);

  const fetchCalories = async () => {
    const { data } = await supabase
      .from('daily_logs')
      .select('calories_eaten, calorie_goal')
      .eq('date', new Date().toISOString().split('T')[0])
      .single();
    if (data) setCalories({ eaten: data.calories_eaten, goal: data.calorie_goal });
  };

  return (
    <FitnessContext.Provider value={{ weeklyPlan, calories, todayWorkout, fetchCalories }}>
      {children}
    </FitnessContext.Provider>
  );
}

export const useFitness = () => useContext(FitnessContext);