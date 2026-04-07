import { unstable_noStore as noStore } from 'next/cache';
import { getAuditLog } from '@/lib/supabase/queries/audit';
import AuditClient from './AuditClient';

export default async function AuditPage() {
  noStore();
  const entries = await getAuditLog(100, 0).catch(() => []);
  return <AuditClient entries={entries} />;
}
