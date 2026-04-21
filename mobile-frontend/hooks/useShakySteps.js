import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useShakySteps(userId) {
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const TODAY = new Date().toISOString().split("T")[0];

    supabase
      .from("daily_activity")
      .select("steps")
      .eq("user_id", userId)
      .eq("date", TODAY)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.steps != null) setSteps(data.steps);
      });
  }, [userId]);

  return { steps };
}
