import { invokeEdgePublic, supabase } from "../lib/supabase";

const INTERNAL_LINE_RE = /^[^\n]*(COMMAND\s*:|MEMORIES\s*:|log_water|log_sleep|log_weight|log_food|log_workout|forget_fact|navigate)[^\n]*$/gim;

function cleanAiResponse(text) {
  if (!text) return text;
  return text.replace(INTERNAL_LINE_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

async function extractEdgeFunctionMessage(error) {
  if (!error) return "";

  if (error?.context) {
    try {
      const payload = await error.context.json();
      if (payload?.reason) return payload.reason;
      if (payload?.error) return payload.error;
      if (payload?.message) return payload.message;
    } catch {
      try {
        const text = await error.context.text();
        if (text) return text;
      } catch {
        // Ignore follow-up parse failures.
      }
    }
  }

  if (error?.payload) {
    return String(error.payload?.reason || error.payload?.error || error.payload?.message || "");
  }

  return error?.message || "";
}

export async function invokeAiAssistant(body) {
  try {
    const { data, error } = await supabase.functions.invoke("ai-assistant", { body });
    if (error) {
      const detail = await extractEdgeFunctionMessage(error);
      throw new Error(detail || error.message);
    }
    return data;
  } catch (error) {
    const message = error?.message || "";
    if (/invalid jwt/i.test(message) || /non-2xx/i.test(message) || /unsupported jwt/i.test(message) || /ES256/i.test(message)) {
      return invokeEdgePublic("ai-assistant", body);
    }
    throw error;
  }
}

export function sanitizeAiAssistantText(text) {
  return cleanAiResponse(text);
}

export async function getAiAssistantErrorMessage(error) {
  return extractEdgeFunctionMessage(error);
}
