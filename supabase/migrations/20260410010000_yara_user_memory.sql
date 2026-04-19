-- =============================================================================
-- Migration: Yara cross-session memory
-- File: supabase/migrations/20260410010000_yara_user_memory.sql
--
-- PURPOSE
--   Persist long-lived facts about each user (injuries, dietary restrictions,
--   equipment, schedule, preferences, dislikes) so Yara can reference them
--   across conversations without the user having to repeat themselves.
--
--   The edge function reads these memories at request time and writes new
--   ones inline based on what the user says (see ai-assistant/index.ts).
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_memory (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category        text        NOT NULL CHECK (category IN (
                                'injury', 'medical', 'diet', 'equipment',
                                'schedule', 'preference', 'dislike', 'goal', 'other'
                              )),
  fact            text        NOT NULL,
  fact_normalized text        GENERATED ALWAYS AS (lower(fact)) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fact_normalized)
);

CREATE INDEX IF NOT EXISTS user_memory_user_recent_idx
  ON user_memory (user_id, last_used_at DESC);

ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_user_memory" ON user_memory;
CREATE POLICY "users_manage_own_user_memory"
  ON user_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- get_user_memory(p_user_id uuid, p_limit int default 30)
-- Returns the most recently referenced memories as a JSON array.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_memory(
  p_user_id uuid,
  p_limit   integer DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.last_used_at DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT id, category, fact, created_at, last_used_at
    FROM user_memory
    WHERE user_id = p_user_id
    ORDER BY last_used_at DESC
    LIMIT p_limit
  ) m;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_memory(uuid, integer) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- add_user_memory(p_user_id uuid, p_category text, p_fact text)
-- Idempotent insert. Updates last_used_at on conflict instead of duplicating.
-- Returns the row id.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_user_memory(
  p_user_id  uuid,
  p_category text,
  p_fact     text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_fact IS NULL OR length(trim(p_fact)) = 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO user_memory (user_id, category, fact)
  VALUES (p_user_id, p_category, trim(p_fact))
  ON CONFLICT (user_id, fact_normalized)
  DO UPDATE SET last_used_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_user_memory(uuid, text, text) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- delete_user_memory(p_user_id uuid, p_id uuid)
-- Lets the user (or Yara) forget a fact.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_user_memory(
  p_user_id uuid,
  p_id      uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM user_memory WHERE id = p_id AND user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION delete_user_memory(uuid, uuid) TO authenticated, service_role;
