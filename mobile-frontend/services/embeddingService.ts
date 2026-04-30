/**
 * mobile-frontend/services/embeddingService.ts
 *
 * Fire-and-forget helper that triggers the embed-user-data edge function
 * after the mobile app mutates user data. Keeps RAG vectors fresh so the
 * next ALEXI conversation has up-to-date context.
 *
 * All calls are non-blocking — failures are logged but never surface to
 * the user or interrupt the calling flow.
 */

import { supabase } from "../lib/supabase";
import { warn } from "../lib/logger";

type ChunkType =
  | "profile"
  | "nutrition_summary"
  | "activity_summary"
  | "workout_session"
  | "meal_log"
  | "memory_fact"
  | "body_metric";

let pendingTypes = new Set<ChunkType>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 3000;

function flush(userId: string) {
  if (pendingTypes.size === 0) return;
  const types = [...pendingTypes];
  pendingTypes = new Set();

  supabase.functions
    .invoke("embed-user-data", { body: { userId, chunkTypes: types } })
    .then(({ error }) => {
      if (error) warn("[embeddingService] refresh failed:", error.message);
    })
    .catch((e: any) => warn("[embeddingService] refresh crashed:", e?.message));
}

/**
 * Schedule a debounced re-embed for the given chunk types.
 * Multiple rapid calls (e.g. logging several foods) collapse into one request.
 */
export function refreshEmbeddings(userId: string, chunkTypes: ChunkType[]) {
  if (!userId || chunkTypes.length === 0) return;
  for (const t of chunkTypes) pendingTypes.add(t);

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => flush(userId), DEBOUNCE_MS);
}

export function refreshAfterFoodLog(userId: string) {
  refreshEmbeddings(userId, ["meal_log", "nutrition_summary"]);
}

export function refreshAfterWorkout(userId: string) {
  refreshEmbeddings(userId, ["workout_session", "activity_summary"]);
}

export function refreshAfterBodyMetric(userId: string) {
  refreshEmbeddings(userId, ["body_metric"]);
}

export function refreshAfterProfileUpdate(userId: string) {
  refreshEmbeddings(userId, ["profile"]);
}

export function refreshAfterWaterLog(userId: string) {
  refreshEmbeddings(userId, ["activity_summary"]);
}

export function refreshAll(userId: string) {
  refreshEmbeddings(userId, [
    "profile",
    "nutrition_summary",
    "activity_summary",
    "workout_session",
    "meal_log",
    "memory_fact",
    "body_metric",
  ]);
}
