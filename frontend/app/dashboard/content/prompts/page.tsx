'use client';

import { useState } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';

interface Prompt {
  id: string;
  name: string;
  category: 'posture' | 'nutrition' | 'motivation' | 'workout' | 'progress';
  model: string;
  temperature: number;
  maxTokens: number;
  body: string;
  active: boolean;
  lastEdited: string;
}

const PROMPTS: Prompt[] = [
  {
    id: '1', name: 'Posture Analysis System', category: 'posture', model: 'llama-3.3-70b-versatile',
    temperature: 0.3, maxTokens: 512,
    body: 'You are BodyQ\'s posture analysis expert. Given the user\'s recent rep quality data and form scores, provide concise, actionable posture correction advice. Be encouraging but specific. Max 3 bullet points.',
    active: true, lastEdited: '2 days ago',
  },
  {
    id: '2', name: 'Nutrition Coach RAG', category: 'nutrition', model: 'llama-3.3-70b-versatile',
    temperature: 0.5, maxTokens: 768,
    body: 'You are BodyQ\'s nutrition advisor. Use the provided user data (macros, calories, goals) to give personalized meal suggestions. Always align recommendations with the user\'s fitness goal. Keep responses under 200 words.',
    active: true, lastEdited: '5 days ago',
  },
  {
    id: '3', name: 'Workout Suggestion', category: 'workout', model: 'llama-3.1-8b-instant',
    temperature: 0.6, maxTokens: 512,
    body: 'Based on the user\'s recent workout history, muscle groups trained, and fitness level, suggest the ideal next workout session. Include sets, reps, and rest guidance.',
    active: true, lastEdited: '1 week ago',
  },
  {
    id: '4', name: 'Daily Motivation', category: 'motivation', model: 'llama-3.1-8b-instant',
    temperature: 0.9, maxTokens: 256,
    body: 'Generate a powerful, personalized motivational message for the user based on their recent progress. Reference specific achievements if available. Keep it under 60 words.',
    active: true, lastEdited: '3 days ago',
  },
  {
    id: '5', name: 'Progress Review', category: 'progress', model: 'llama-3.3-70b-versatile',
    temperature: 0.4, maxTokens: 1024,
    body: 'Analyze the user\'s last 30 days of workout data, body metrics, and nutrition logs. Provide a structured progress review with: 1) What\'s working, 2) Areas for improvement, 3) Next 2-week focus.',
    active: false, lastEdited: '2 weeks ago',
  },
];

const CATEGORY_COLORS: Record<Prompt['category'], string> = {
  posture:    'var(--bq-purple)',
  nutrition:  '#22c55e',
  motivation: 'var(--bq-lime)',
  workout:    'var(--chart-blue)',
  progress:   '#f59e0b',
};

const card: React.CSSProperties = {
  background: 'var(--bq-surface-1)',
  border: '1px solid var(--bq-border)',
  borderRadius: 12, padding: 20,
};

export default function PromptsPage() {
  const [selected, setSelected] = useState<Prompt>(PROMPTS[0]);
  const [body, setBody] = useState(PROMPTS[0].body);
  const [temperature, setTemperature] = useState(PROMPTS[0].temperature);
  const [maxTokens, setMaxTokens] = useState(PROMPTS[0].maxTokens);
  const [saved, setSaved] = useState(false);

  function selectPrompt(p: Prompt) {
    setSelected(p);
    setBody(p.body);
    setTemperature(p.temperature);
    setMaxTokens(p.maxTokens);
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="AI Prompts"
        description="Manage system prompts and model parameters for the AI coaching engine"
        action={
          <button style={{
            background: 'var(--bq-purple)', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontFamily: 'var(--font-inter)', fontSize: 13,
            fontWeight: 600, color: '#fff', cursor: 'pointer',
          }}>+ New Prompt</button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Prompt list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PROMPTS.map((p) => (
            <button
              key={p.id}
              onClick={() => selectPrompt(p)}
              style={{
                background: selected.id === p.id ? 'var(--bq-purple-dim)' : 'var(--bq-surface-1)',
                border: selected.id === p.id ? '1px solid rgba(124,92,252,0.4)' : '1px solid var(--bq-border)',
                borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600, color: 'var(--bq-text-1)' }}>
                  {p.name}
                </span>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: p.active ? '#22c55e' : 'var(--bq-muted)',
                }} />
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{
                  background: `${CATEGORY_COLORS[p.category]}15`,
                  color: CATEGORY_COLORS[p.category],
                  borderRadius: 4, padding: '1px 7px', fontSize: 10,
                  fontFamily: 'var(--font-inter)', fontWeight: 600, textTransform: 'capitalize',
                }}>{p.category}</span>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'var(--bq-text-3)' }}>
                  Edited {p.lastEdited}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {saved && (
            <div style={{
              background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.3)',
              borderRadius: 8, padding: '10px 16px', fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-lime)',
            }}>
              Prompt saved successfully.
            </div>
          )}

          {/* Meta */}
          <div style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Model</p>
              <select style={{
                width: '100%', background: 'var(--bq-surface-3)', border: '1px solid var(--bq-border)',
                borderRadius: 7, padding: '8px 10px', fontFamily: 'var(--font-inter)', fontSize: 13,
                color: 'var(--bq-text-1)', outline: 'none',
              }}>
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
              </select>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Temperature: {temperature}
              </p>
              <input
                type="range" min={0} max={1} step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(+e.target.value)}
                style={{ width: '100%', accentColor: 'var(--bq-purple)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'var(--bq-text-3)' }}>Precise</span>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'var(--bq-text-3)' }}>Creative</span>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Max Tokens: {maxTokens}
              </p>
              <input
                type="range" min={128} max={2048} step={128}
                value={maxTokens}
                onChange={(e) => setMaxTokens(+e.target.value)}
                style={{ width: '100%', accentColor: 'var(--bq-lime)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'var(--bq-text-3)' }}>128</span>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'var(--bq-text-3)' }}>2048</span>
              </div>
            </div>
          </div>

          {/* Prompt body */}
          <div style={card}>
            <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 13, color: 'var(--bq-text-1)', marginBottom: 10 }}>
              System Prompt — {selected.name}
            </p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              style={{
                width: '100%', background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)',
                borderRadius: 8, padding: '14px', fontFamily: 'var(--font-mono, monospace)', fontSize: 13,
                color: 'var(--bq-text-1)', outline: 'none', resize: 'vertical', lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-text-3)' }}>
                {body.length} chars · ~{Math.ceil(body.length / 4)} tokens
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setBody(selected.body); setTemperature(selected.temperature); setMaxTokens(selected.maxTokens); }}
                  style={{
                    background: 'none', border: '1px solid var(--bq-border)', borderRadius: 7,
                    padding: '8px 16px', fontFamily: 'var(--font-inter)', fontSize: 13,
                    color: 'var(--bq-text-2)', cursor: 'pointer',
                  }}
                >Reset</button>
                <button
                  onClick={handleSave}
                  style={{
                    background: 'var(--bq-purple)', border: 'none', borderRadius: 7,
                    padding: '8px 20px', fontFamily: 'var(--font-inter)', fontSize: 13,
                    fontWeight: 600, color: '#fff', cursor: 'pointer',
                  }}
                >Save Prompt</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
