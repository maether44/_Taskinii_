import { useEffect, useRef, useState } from 'react';
import { callYara }                    from '../lib/groqAPI';
import { getChatHistory, saveMessage } from '../services/chatService';
import { useAuth }                     from '../context/AuthContext';
import { error as logError }           from '../lib/logger';
import { scheduleStore }               from '../store/scheduleStore';
import { supabase }                    from '../lib/supabase'; // ← ADD

function fmtTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function buildWelcome(profile) {
  return profile
    ? `Hey — I'm Yara, your personal coach. I already know your profile so ask me anything about your training, nutrition or recovery. What's on your mind?`
    : "Hey! I'm Yara — your personal coach. I'm here for everything: training, nutrition, recovery, mindset. What's on your mind today?";
}

const SCHEDULE_KEYWORDS = [
  'weekly schedule', 'weekly plan', 'week plan', 'my schedule',
  'workout plan', 'meal plan', 'weekly routine', 'plan my week',
  'generate schedule', 'create schedule', 'make me a plan',
  'full plan', 'training plan', 'give me a plan',
];

const isScheduleRequest = (text) => {
  const lower = text.toLowerCase();
  return SCHEDULE_KEYWORDS.some(k => lower.includes(k));
};

const SCHEDULE_SYSTEM_INJECTION = `
IMPORTANT: The user is asking for a weekly schedule.
You MUST respond with a valid JSON object and nothing else — no markdown, no explanation, no backticks.
The JSON must follow this exact structure:
{
  "response": "Here's your personalised weekly plan! [friendly 1-2 sentence message]",
  "schedule": {
    "days": [
      {
        "day": "Monday",
        "is_rest": false,
        "workout_type": "Push",
        "note": "Focus on chest and shoulders",
        "exercises": [
          { "name": "Bench Press", "sets": 4, "reps": "8-10", "muscle": "Chest", "rest": "90s" },
          { "name": "Overhead Press", "sets": 3, "reps": "10-12", "muscle": "Shoulders", "rest": "60s" }
        ],
        "meals": [
          { "type": "Breakfast", "foods": ["Oats with banana", "2 boiled eggs"], "calories": 420 },
          { "type": "Lunch", "foods": ["Grilled chicken", "Brown rice", "Salad"], "calories": 580 },
          { "type": "Dinner", "foods": ["Salmon", "Sweet potato", "Broccoli"], "calories": 520 },
          { "type": "Snack", "foods": ["Greek yogurt", "Almonds"], "calories": 220 }
        ],
        "sleep_target": 8,
        "steps_target": 9000,
        "water_target": 2500
      }
    ]
  }
}
Generate all 7 days (Mon–Sun). Include 2 rest days. Vary sleep_target (7–9), steps_target (6000–12000), water_target (1800–3000) based on workout intensity.
Tailor exercises, meals, and targets to the user's profile (goal, experience, equipment, diet_pref).
NEVER use COMMAND: syntax. NEVER output anything except the JSON object.
`;

export function useYaraChat(profile, onScheduleReady) {
  const { user }                 = useAuth();
  const [messages,  setMessages] = useState([]);
  const [input,     setInput]    = useState('');
  const [typing,    setTyping]   = useState(false);
  const [open,      setOpen]     = useState(false);
  const apiHistory               = useRef([]);

  useEffect(() => {
    const loadHistory = async () => {
      const welcome = { from: 'yara', text: buildWelcome(profile), time: fmtTime() };

      if (!user) { setMessages([welcome]); return; }

      try {
        const history = await getChatHistory(user.id);
        const safeHistory = Array.isArray(history) ? history : [];
        if (safeHistory.length === 0) {
          setMessages([welcome]);
        } else {
          const uiMessages = safeHistory.map(m => ({
            from: m.role === 'assistant' ? 'yara' : 'user',
            text: m.content,
            time: '',
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

    setInput('');
    setTyping(true);
    setMessages(prev => [...prev, { from: 'user', text: msg, time: fmtTime() }]);

    const isSchedule = isScheduleRequest(msg);

    const historyToSend = isSchedule
      ? [...apiHistory.current, { role: 'user', content: msg + '\n\n' + SCHEDULE_SYSTEM_INJECTION }]
      : [...apiHistory.current, { role: 'user', content: msg }];

    apiHistory.current = [...apiHistory.current, { role: 'user', content: msg }];

    if (user) await saveMessage(user.id, 'user', msg).catch(console.error);

    try {
      const reply = await callYara(historyToSend, profile);

      if (isSchedule) {
        try {
          const clean = reply.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(clean);

          if (parsed?.schedule?.days) {
            const scheduleToSave = {
              ...parsed.schedule,
              generated_at: new Date().toISOString(),
            };

            // 1. Save to local store (for immediate UI update)
            scheduleStore.set(scheduleToSave, user?.id);

            // 2. Save to Supabase (so it persists across logins & devices)
            if (user) {
              supabase
                .from('training_plans')
                .upsert(
                  {
                    user_id:    user.id,
                    plan_json:  scheduleToSave,
                    created_at: new Date().toISOString(),
                  },
                  { onConflict: 'user_id' },
                )
                .then(({ error }) => {
                  if (error) logError('[useYaraChat] Failed to save plan to Supabase:', error.message);
                });
            }

            const responseText = parsed.response || "Here's your weekly plan!";
            apiHistory.current = [...apiHistory.current, { role: 'assistant', content: responseText }];
            if (user) await saveMessage(user.id, 'assistant', responseText).catch(console.error);
            setMessages(prev => [...prev, {
              from: 'yara',
              text: responseText,
              time: fmtTime(),
              schedule: parsed.schedule,
            }]);
            onScheduleReady?.();
            return;
          }
        } catch (_) {
          // JSON parse failed — fall through to normal text reply
        }
      }

      // Normal text reply
      apiHistory.current = [...apiHistory.current, { role: 'assistant', content: reply }];
      if (user) await saveMessage(user.id, 'assistant', reply).catch(console.error);
      setMessages(prev => [...prev, { from: 'yara', text: reply, time: fmtTime() }]);

    } catch (err) {
      logError('Yara error:', err);
      apiHistory.current = apiHistory.current.slice(0, -1);
      setMessages(prev => [...prev, {
        from: 'yara',
        text: 'Sorry, connection issue. Try again!',
        time: fmtTime(),
      }]);
    } finally {
      setTyping(false);
    }
  };

  return { messages, input, setInput, typing, open, setOpen, send };
}if (user) {
  const { data, error } = await supabase  // ← make it await, remove .then()
    .from('training_plans')
    .upsert(
      {
        user_id:    user.id,
        plan_json:  scheduleToSave,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  console.log('SUPABASE SAVE RESULT:', JSON.stringify({ data, error })); // ← log it
}