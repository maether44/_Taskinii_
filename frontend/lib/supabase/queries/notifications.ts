import { createClient } from '@/lib/supabase/server';

export interface Campaign {
  id: string;
  name: string;
  type: 'push' | 'email' | 'sms';
  status: 'draft' | 'scheduled' | 'sent' | 'paused';
  target_segment: Record<string, unknown>;
  sent_count: number;
  open_rate: number;
  scheduled_at: string | null;
  created_at: string;
}

export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as Campaign[];
}
