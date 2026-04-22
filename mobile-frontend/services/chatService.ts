import { supabase } from '../lib/supabase';

export const getChatHistory = async (userId) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
};

export const saveMessage = async (userId, role, content) => {
  const { error } = await supabase.from('chat_messages').insert({ user_id: userId, role, content });

  if (error) throw new Error(error.message);
};
