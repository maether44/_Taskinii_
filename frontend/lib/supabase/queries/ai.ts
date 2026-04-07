import { createClient } from '@/lib/supabase/server';

export interface AISession {
  id: string;
  user_id: string;
  type: string;
  duration: number;
  accuracy: number | null;
  created_at: string;
  error: string | null;
  user_name?: string;
}

export async function getRecentAISessions(limit = 10): Promise<AISession[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('ai_sessions')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((s) => ({
    ...s,
    user_name: (s.profiles as { full_name: string } | null)?.full_name ?? 'Unknown',
  }));
}

export async function getAIAccuracyTrend(days = 30) {
  const supabase = createClient();
  const from = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .from('ai_sessions')
    .select('created_at, accuracy, type')
    .eq('type', 'posture')
    .gte('created_at', from)
    .order('created_at');

  const map: Record<string, { sum: number; count: number }> = {};
  (data ?? []).forEach((s) => {
    const d = s.created_at.split('T')[0];
    if (!map[d]) map[d] = { sum: 0, count: 0 };
    if (s.accuracy) { map[d].sum += s.accuracy; map[d].count++; }
  });

  return Object.entries(map).map(([date, { sum, count }]) => ({
    date,
    accuracy: count > 0 ? Math.round(sum / count) : null,
    target: 95,
  }));
}

export async function getAIErrorLog(limit = 50) {
  const supabase = createClient();
  const { data } = await supabase
    .from('ai_sessions')
    .select('id, user_id, type, created_at, error, profiles(full_name)')
    .not('error', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
