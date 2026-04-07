import { unstable_noStore as noStore } from 'next/cache';
import { getUsers } from '@/lib/supabase/queries/users';
import UsersClient from './UsersClient';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  noStore();
  const page = Number(searchParams.page ?? 1);

  const { users, total } = await getUsers({
    search: searchParams.search,
    plan: searchParams.plan,
    status: searchParams.status,
    page,
    perPage: 25,
  }).catch(() => ({ users: [], total: 0 }));

  return <UsersClient users={users} total={total} page={page} />;
}
