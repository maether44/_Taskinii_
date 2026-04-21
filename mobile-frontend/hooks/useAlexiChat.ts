import { useEffect, useRef, useState } from "react";
import { callYaraCoach } from "../lib/groqAPI";
import { getChatHistory, saveMessage } from "../services/chatService";
import { useAuth } from "../context/AuthContext";

function fmtTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function buildWelcome(profile) {
  return profile
    ? `Hey — I'm Alexi, your personal coach. I already know your profile so ask me anything about your training, nutrition or recovery. What's on your mind?`
    : "Hey! I'm Alexi — your personal coach. I'm here for everything: training, nutrition, recovery, mindset. What's on your mind today?";
}

export function useAlexiChat(profile) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const apiHistory = useRef([]);

  // Load persisted chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      // Always show welcome message first
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
          // Rebuild UI messages from DB history
          const uiMessages = safeHistory.map((m) => ({
            from: m.role === "assistant" ? "alexi" : "user",
            text: m.content,
            time: "",
          }));
          setMessages([welcome, ...uiMessages]);
          apiHistory.current = safeHistory; // restore context for Groq
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

    apiHistory.current = [...apiHistory.current, { role: "user", content: msg }];

    // Save user message to DB
    if (user) await saveMessage(user.id, "user", msg).catch(console.error);

    try {
      const reply = await callYaraCoach(apiHistory.current, profile, null);
      apiHistory.current = [...apiHistory.current, { role: "assistant", content: reply }];

      // Save Alexi's reply to DB
      if (user) await saveMessage(user.id, "assistant", reply).catch(console.error);

      setMessages((prev) => [...prev, { from: "alexi", text: reply, time: fmtTime() }]);
    } catch (err) {
      console.error("[AlexiChat] error:", err);
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
