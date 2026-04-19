-- =============================================================================
-- Migration: Vector-based RAG infrastructure
-- File: supabase/migrations/20260419000000_rag_vector_embeddings.sql
--
-- PURPOSE
--   Replaces Yara's keyword-based query classification with semantic vector
--   search. Instead of regex-matching the user query to decide which RPCs to
--   call, the edge function will:
--     1. Embed the user query into a 384-dim vector
--     2. Run cosine similarity against pre-embedded user data chunks
--     3. Inject only the top-k relevant chunks into the LLM prompt
--
--   This migration sets up:
--     - pgvector extension
--     - rag_chunks table (stores text chunks + embeddings per user)
--     - match_rag_chunks RPC (cosine similarity search)
--     - upsert_rag_chunk RPC (idempotent insert/update for the embedding pipeline)
--     - delete_stale_rag_chunks RPC (cleanup when source data changes)
--     - RLS policies
-- =============================================================================

-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Main chunks table
CREATE TABLE IF NOT EXISTS rag_chunks (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What kind of data this chunk represents
  chunk_type  text        NOT NULL CHECK (chunk_type IN (
                            'profile', 'nutrition_summary', 'activity_summary',
                            'workout_session', 'body_metric', 'meal_log',
                            'memory_fact', 'ai_history', 'workout_plan'
                          )),

  -- Stable identifier for the source row so we can upsert when it changes.
  -- e.g. "workout_session:<uuid>" or "meal_log:2026-04-19:breakfast"
  source_key  text        NOT NULL,

  -- The plain-text content that was embedded
  content     text        NOT NULL,

  -- Optional structured metadata (dates, calorie counts, etc.)
  metadata    jsonb       NOT NULL DEFAULT '{}',

  -- The embedding vector (384 dimensions — matches gte-small / all-MiniLM-L6-v2)
  embedding   vector(384) NOT NULL,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, source_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS rag_chunks_user_type_idx
  ON rag_chunks (user_id, chunk_type);

-- IVFFlat index for fast approximate nearest-neighbor search.
-- lists = 100 is a good default for up to ~100k rows; rebuild if the table
-- grows significantly beyond that.
CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
  ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3. RLS
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_rag_chunks" ON rag_chunks;
CREATE POLICY "service_role_full_access_rag_chunks"
  ON rag_chunks FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "users_read_own_rag_chunks" ON rag_chunks;
CREATE POLICY "users_read_own_rag_chunks"
  ON rag_chunks FOR SELECT
  USING (auth.uid() = user_id);


-- =============================================================================
-- RPCs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- match_rag_chunks(p_user_id, p_query_embedding, p_match_count, p_match_threshold)
--
-- Core semantic search: returns the top-k most similar chunks for a user,
-- filtered by a minimum cosine similarity threshold.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_rag_chunks(
  p_user_id          uuid,
  p_query_embedding  vector(384),
  p_match_count      integer DEFAULT 8,
  p_match_threshold  float   DEFAULT 0.5
)
RETURNS TABLE (
  id          uuid,
  chunk_type  text,
  source_key  text,
  content     text,
  metadata    jsonb,
  similarity  float
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rc.id,
    rc.chunk_type,
    rc.source_key,
    rc.content,
    rc.metadata,
    1 - (rc.embedding <=> p_query_embedding) AS similarity
  FROM rag_chunks rc
  WHERE rc.user_id = p_user_id
    AND 1 - (rc.embedding <=> p_query_embedding) >= p_match_threshold
  ORDER BY rc.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

GRANT EXECUTE ON FUNCTION match_rag_chunks(uuid, vector(384), integer, float)
  TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- upsert_rag_chunk(...)
--
-- Idempotent insert/update. The embedding pipeline calls this for each chunk
-- it produces. On conflict (same user + source_key), it updates the content,
-- embedding, and metadata.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_rag_chunk(
  p_user_id    uuid,
  p_chunk_type text,
  p_source_key text,
  p_content    text,
  p_metadata   jsonb,
  p_embedding  vector(384)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO rag_chunks (user_id, chunk_type, source_key, content, metadata, embedding)
  VALUES (p_user_id, p_chunk_type, p_source_key, p_content, p_metadata, p_embedding)
  ON CONFLICT (user_id, source_key)
  DO UPDATE SET
    chunk_type = EXCLUDED.chunk_type,
    content    = EXCLUDED.content,
    metadata   = EXCLUDED.metadata,
    embedding  = EXCLUDED.embedding,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_rag_chunk(uuid, text, text, text, jsonb, vector(384))
  TO service_role;


-- -----------------------------------------------------------------------------
-- delete_stale_rag_chunks(p_user_id, p_chunk_type, p_keep_source_keys)
--
-- After a full re-embed of a chunk_type, delete any chunks whose source_key
-- is no longer in the fresh set. This prevents stale data from polluting
-- search results when the user deletes a meal or workout.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_stale_rag_chunks(
  p_user_id          uuid,
  p_chunk_type       text,
  p_keep_source_keys text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM rag_chunks
  WHERE user_id    = p_user_id
    AND chunk_type = p_chunk_type
    AND source_key <> ALL(p_keep_source_keys)
  ;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_stale_rag_chunks(uuid, text, text[])
  TO service_role;


-- -----------------------------------------------------------------------------
-- get_rag_chunk_stats(p_user_id)
--
-- Diagnostic: returns chunk counts per type so the embedding pipeline can
-- decide what needs refreshing.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_rag_chunk_stats(p_user_id uuid)
RETURNS TABLE (
  chunk_type    text,
  chunk_count   bigint,
  oldest_update timestamptz,
  newest_update timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rc.chunk_type,
    COUNT(*)           AS chunk_count,
    MIN(rc.updated_at) AS oldest_update,
    MAX(rc.updated_at) AS newest_update
  FROM rag_chunks rc
  WHERE rc.user_id = p_user_id
  GROUP BY rc.chunk_type
  ORDER BY rc.chunk_type;
$$;

GRANT EXECUTE ON FUNCTION get_rag_chunk_stats(uuid)
  TO authenticated, service_role;
