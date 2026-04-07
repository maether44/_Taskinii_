import { createClient } from '@/lib/supabase/server';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  plan: string | null;
  status: string;
  created_at: string;
  last_active: string | null;
  country: string | null;
  total_sessions: number;
  role: string | null;
}

export interface UserFilters {
  search?: string;
  plan?: string;
  status?: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export async function getUsers(filters: UserFilters = {}) {
  const supabase = createClient();
  const { search, plan, status, page = 1, perPage = 25, sortBy = 'created_at', sortDir = 'desc' } = filters;

  let query = supabase
    .from('profiles')
    .select('id, email, full_name, plan, status, created_at, last_active, country, role', { count: 'exact' });

  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (plan && plan !== 'all') query = query.eq('plan', plan);
  if (status && status !== 'all') query = query.eq('status', status);

  query = query.order(sortBy, { ascending: sortDir === 'asc' });
  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    users: (data ?? []).map((u) => ({ ...u, total_sessions: 0 })) as AdminUser[],
    total: count ?? 0,
  };
}

export async function getUserById(id: string): Promise<AdminUser | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  return data ? { ...data, total_sessions: 0 } : null;
}

export async function getTopActiveUsers(limit = 8) {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, plan, last_active')
    .gte('last_active', today)
    .order('last_active', { ascending: false })
    .limit(limit);
  return data ?? [];
}
