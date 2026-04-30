import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { getChatHistory, saveMessage } from "../services/chatService";
import { useAuth } from "../context/AuthContext";
import { error as logError } from "../lib/logger";

const SCHEDULE_SYSTEM_INJECTION =
  "If the user is asking for a schedule/routine/plan, respond with a concise, structured schedule. " +
  "Use bullet points and include timings when possible. Keep it actionable and personalized.";

function isScheduleRequest(text: string) {
  const t = (text || "").toLowerCase();
  return (
    t.includes("schedule") ||
    t.includes("routine") ||
    t.includes("plan") ||
    t.includes("timetable") ||
    t.includes("calendar") ||
    t.includes("weekly") ||
    t.includes("daily plan")
  );
}

function fmtTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function buildWelcome(profile) {
  return profile
    ? `Hey — I'm ALEXI, your personal coach. I already know your profile so ask me anything about your training, nutrition or recovery. What's on your mind?`
    : "Hey! I'm ALEXI — your personal coach. I'm here for everything: training, nutrition, recovery, mindset. What's on your mind today?";
}

function buildTodaySnapshot(profile) {
  if (!profile) return undefined;
  return {
    date: new Date().toISOString().split("T")[0],
    calorie_target: profile.daily_calories ?? profile.calTarget,
    protein_target: profile.protein_target ?? profile.protein,
    carbs_target: profile.carbs_target,
    fat_target: profile.fat_target,
  };
}

export function useAlexiChat(profile) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const apiHistory = useRef([]);

  useEffect(() => {
    const loadHistory = async () => {
      const welcome = { from: "alexi", text: buildWelcome(profile), time: fmtTime() };

      if (!user) {
        setMessages([welcome]);
        return;
      }

      try {
        const history = await getChatHistory(user.id);
        const safeHistory = Array.isArray(history) ? history : [];
        if (safeHistory.length === 0) {
          setMessages([welcome]);
        } else {
          const uiMessages = safeHistory.map((m) => ({
            from: m.role === "assistant" ? "alexi" : "user",
            text: m.content,
            time: "",
          }));
          setMessages([welcome, ...uiMessages]);
          apiHistory.current = safeHistory;
        }
      } catch {
        setMessages([welcome]);
      }
    };

    loadHistory();
  }, [user]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || typing) return;

    setInput("");
    setTyping(true);
    setMessages((prev) => [...prev, { from: "user", text: msg, time: fmtTime() }]);

    const isSchedule = isScheduleRequest(msg);

    // Inject schedule instructions into the history if needed
    const historyToSend = isSchedule
      ? [...apiHistory.current, { role: "user", content: msg + "\n\n" + SCHEDULE_SYSTEM_INJECTION }]
      : [...apiHistory.current, { role: "user", content: msg }];

    apiHistory.current = [...apiHistory.current, { role: "user", content: msg }];

    if (user) await saveMessage(user.id, "user", msg).catch(console.error);

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          userId: user?.id,
          query: msg,
          history: historyToSend,
          clientContext: {
            profile: profile ?? undefined,
            today: buildTodaySnapshot(profile),
          },
        },
      });

      if (error) throw error;

      const reply = data?.response ?? "I'm having trouble connecting. Try again in a moment.";
      apiHistory.current = [...apiHistory.current, { role: "assistant", content: reply }];

      if (user) await saveMessage(user.id, "assistant", reply).catch(console.error);
      setMessages((prev) => [...prev, { from: "alexi", text: reply, time: fmtTime() }]);
    } catch (err) {
      logError("ALEXI error:", err);
      apiHistory.current = apiHistory.current.slice(0, -1);
      setMessages((prev) => [
        ...prev,
        {
          from: "alexi",
          text: "Sorry, connection issue. Try again!",
          time: fmtTime(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return { messages, input, setInput, typing, open, setOpen, send };
}
