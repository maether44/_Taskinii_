import { supabase } from '../lib/supabase';

export const getHomeSnapshot = async (userId) => {
  const { data, error } = await supabase.rpc('get_daily_dashboard_v5', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error fetching dashboard snapshot:', error);
    return null;
  }
  return data;
};