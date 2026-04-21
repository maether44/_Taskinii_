import { supabase } from "../lib/supabase";
import { error as logError } from "../lib/logger";

export const getHomeSnapshot = async (userId) => {
  const { data, error } = await supabase.rpc("get_daily_dashboard_v5", {
    p_user_id: userId,
  });

  if (error) {
    logError("Error fetching dashboard snapshot:", error);
    return null;
  }
  return data;
};
