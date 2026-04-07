'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/* -------------------------------------------------------
   getAdminTeam — load all admin + super_admin profiles
------------------------------------------------------- */
export async function getAdminTeam() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, last_active')
    .in('role', ['admin', 'super_admin'])
    .order('role', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/* -------------------------------------------------------
   inviteAdmin — create auth user + set role via service key
   Falls back to inviteUserByEmail when service key is set.
------------------------------------------------------- */
export async function inviteAdmin(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const role  = (formData.get('role')  as string) ?? 'admin';

  if (!email) return { error: 'Email is required.' };
  if (!['admin', 'super_admin'].includes(role)) return { error: 'Invalid role.' };

  try {
    const admin = createAdminClient();

    // Invite the user (sends a magic-link email)
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { role },
    });
    if (inviteErr) return { error: inviteErr.message };

    // Upsert their profile row so the role is set even before they accept
    if (invited?.user?.id) {
      await admin.from('profiles').upsert({
        id:    invited.user.id,
        email,
        role,
      }, { onConflict: 'id' });
    }

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { error: msg };
  }
}

/* -------------------------------------------------------
   removeAdmin — demote role back to 'user'
------------------------------------------------------- */
export async function removeAdmin(userId: string) {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', userId);

    if (error) return { error: error.message };
    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { error: msg };
  }
}
