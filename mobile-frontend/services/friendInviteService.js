import { supabase } from '../lib/supabase';

export async function getFriendInvite({ inviterId, inviteeId }) {
  if (!inviterId || !inviteeId) return null;

  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, inviter_id, invitee_id, status, created_at, responded_at')
    .eq('inviter_id', inviterId)
    .eq('invitee_id', inviteeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data || null;
}

export async function respondToFriendInvite({ inviterId, inviteeId, decision }) {
  if (!inviterId) throw new Error('Inviter id is required.');
  if (!inviteeId) throw new Error('Invitee id is required.');
  if (!['accepted', 'rejected'].includes(decision)) {
    throw new Error('Invalid decision.');
  }

  const existing = await getFriendInvite({ inviterId, inviteeId });

  if (existing) {
    const { data, error } = await supabase
      .from('friend_requests')
      .update({ status: decision, responded_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('id, inviter_id, invitee_id, status, created_at, responded_at')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .insert({
      inviter_id: inviterId,
      invitee_id: inviteeId,
      status: decision,
      responded_at: new Date().toISOString(),
    })
    .select('id, inviter_id, invitee_id, status, created_at, responded_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getFriendsForUser(userId) {
  if (!userId) return [];

  const { data, error } = await supabase.rpc('get_user_friends', {
    p_user_id: userId,
  });

  if (error) throw new Error(error.message);
  return data || [];
}

