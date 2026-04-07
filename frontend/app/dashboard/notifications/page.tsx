import { unstable_noStore as noStore } from 'next/cache';
import { getCampaigns } from '@/lib/supabase/queries/notifications';
import NotificationsClient from './NotificationsClient';

export default async function NotificationsPage() {
  noStore();
  const campaigns = await getCampaigns().catch(() => []);
  return <NotificationsClient campaigns={campaigns} />;
}
