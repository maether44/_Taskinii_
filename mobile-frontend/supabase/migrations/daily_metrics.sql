-- ─────────────────────────────────────────────────────────────────────────────
-- BodyQ — daily_metrics table
-- Run once in Supabase: Dashboard → SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_metrics (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date            date    NOT NULL DEFAULT CURRENT_DATE,
  calories_burned integer DEFAULT 0,
  UNIQUE (user_id, date)
);

ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily metrics"
  ON daily_metrics FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
