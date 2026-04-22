import { supabase } from '../lib/supabase';

function deriveHandle(name) {
  const base = String(name || 'user')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ ]/g, '')
    .replace(/\s+/g, '_');
  return `@${base || 'user'}`;
}

export async function listThreads(ownerId) {
  if (!ownerId) return [];

  const { data, error } = await supabase.from('inbox').select('*');
  if (error) {
    const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
    throw new Error(detail || 'Could not load inbox conversations.');
  }

  return (data || [])
    .filter((row) => !!row.last_message_at)
    .map((row) => ({
      id: row.conversation_id,
      peerId: row.other_user_id,
      peerName: row.other_user_name || 'Unknown user',
      peerHandle: deriveHandle(row.other_user_name),
      peerAvatarUri: row.other_user_avatar || null,
      lastMessage: row.last_message || '',
      updatedAt: row.last_message_at,
      unreadCount: Number(row.unread_count || 0),
    }))
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

export async function ensureThread(ownerId, peer) {
  if (!ownerId) throw new Error('Missing owner id.');
  if (!peer?.id) throw new Error('Missing peer id.');

  const { data: conversationId, error: rpcError } = await supabase.rpc(
    'get_or_create_conversation',
    {
      user_a: ownerId,
      user_b: peer.id,
    },
  );

  if (rpcError) {
    const detail = [rpcError?.message, rpcError?.details, rpcError?.hint]
      .filter(Boolean)
      .join(' | ');
    throw new Error(detail || 'Could not open conversation.');
  }

  const { data: inboxRow } = await supabase
    .from('inbox')
    .select('*')
    .eq('conversation_id', conversationId)
    .maybeSingle();

  return {
    id: conversationId,
    peerId: peer.id,
    peerName: inboxRow?.other_user_name || peer?.name || 'Unknown user',
    peerHandle: inboxRow?.other_user_name
      ? deriveHandle(inboxRow.other_user_name)
      : peer?.handle || '@user',
    peerAvatarUri: inboxRow?.other_user_avatar || peer?.avatarUri || null,
    lastMessage: inboxRow?.last_message || '',
    updatedAt: inboxRow?.last_message_at || new Date().toISOString(),
    unreadCount: Number(inboxRow?.unread_count || 0),
  };
}

export async function getThreadMessages(ownerId, threadId) {
  if (!ownerId || !threadId) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, content, media_url, created_at')
    .eq('conversation_id', threadId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) {
    const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
    throw new Error(detail || 'Could not load thread messages.');
  }

  return (data || []).map((message) => ({
    id: message.id,
    sender: message.sender_id === ownerId ? 'me' : 'them',
    text: message.content || (message.media_url ? '[Attachment]' : ''),
    createdAt: message.created_at,
  }));
}

export async function sendThreadMessage(ownerId, threadId, text) {
  const trimmed = (text || '').trim();
  if (!trimmed || !ownerId || !threadId) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: threadId,
      sender_id: ownerId,
      content: trimmed,
    })
    .select('id, sender_id, content, created_at')
    .single();

  if (error) {
    const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
    throw new Error(detail || 'Could not send message.');
  }

  return {
    id: data.id,
    sender: data.sender_id === ownerId ? 'me' : 'them',
    text: data.content || '',
    createdAt: data.created_at,
  };
}

export async function markThreadRead(ownerId, threadId) {
  if (!ownerId || !threadId) return;

  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', threadId)
    .eq('user_id', ownerId);

  if (error) {
    const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
    throw new Error(detail || 'Could not mark conversation as read.');
  }
}

export async function deleteThreadIfEmpty(ownerId, threadId) {
  if (!ownerId || !threadId) return;

  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', threadId)
    .eq('is_deleted', false)
    .limit(1);

  if (error || (data || []).length > 0) return;
}
