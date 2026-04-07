import { createClient } from '@/lib/supabase/server';

export interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  ip: string | null;
  created_at: string;
  admin_name?: string;
}

export async function getAuditLog(limit = 50, offset = 0): Promise<AuditEntry[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('audit_log')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return (data ?? []).map((e) => ({
    ...e,
    admin_name: (e.profiles as { full_name: string } | null)?.full_name ?? 'System',
    details: (e.details as Record<string, unknown>) ?? {},
  }));
}

export async function writeAuditEntry(
  adminId: string,
  action: string,
  resource: string,
  details: Record<string, unknown>
) {
  const supabase = createClient();
  await supabase.from('audit_log').insert({ admin_id: adminId, action, resource, details });
}
