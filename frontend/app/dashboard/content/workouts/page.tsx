import { unstable_noStore as noStore } from 'next/cache';
import { getWorkoutPlans } from '@/lib/supabase/queries/content';
import WorkoutsClient from './WorkoutsClient';

export default async function WorkoutsPage() {
  noStore();
  const plans = await getWorkoutPlans().catch(() => []);
  return <WorkoutsClient plans={plans} />;
}
