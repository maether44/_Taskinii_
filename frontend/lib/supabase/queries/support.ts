import { createClient } from '@/lib/supabase/server';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  messages: Array<{ role: string; text: string; ts: string }>;
  created_at: string;
  user_name?: string;
}

export async function getTickets(status?: string): Promise<SupportTicket[]> {
  const supabase = createClient();
  let q = supabase
    .from('support_tickets')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false });
  if (status && status !== 'all') q = q.eq('status', status);
  const { data } = await q;
  return (data ?? []).map((t) => ({
    ...t,
    user_name: (t.profiles as { full_name: string } | null)?.full_name ?? 'Unknown',
    messages: (t.messages as SupportTicket['messages']) ?? [],
  }));
}

export async function updateTicketStatus(id: string, status: string) {
  const supabase = createClient();
  await supabase.from('support_tickets').update({ status }).eq('id', id);
}
