-- BodyQ 1-1 Chat Migration
-- Run this in your Supabase SQL editor

-- ─────────────────────────────────────────
-- 1. CONVERSATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 2. PARTICIPANTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_participants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at      timestamptz DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

-- ─────────────────────────────────────────
-- 3. MESSAGES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content          text,
  media_url        text,
  is_deleted       boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_or_media CHECK (content IS NOT NULL OR media_url IS NOT NULL)
);

-- ─────────────────────────────────────────
-- 4. INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conv_participants_user    ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv    ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation     ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender          ON messages(sender_id);

-- ─────────────────────────────────────────
-- 5. HELPER FUNCTION
-- Finds existing conversation between 2 users,
-- or creates a new one. Returns conversation_id.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_conversation(user_a uuid, user_b uuid)
RETURNS uuid AS $$
DECLARE
  conv_id uuid;
BEGIN
  -- Look for an existing 1-1 conversation between the two users
  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user_a
    AND cp2.user_id = user_b
  LIMIT 1;

  -- If none found, create one
  IF conv_id IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES RETURNING id INTO conv_id;
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, user_a);
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, user_b);
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────
-- 6. STORAGE BUCKET FOR CHAT MEDIA
-- ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false)
ON CONFLICT DO NOTHING;

-- Only participants can upload
CREATE POLICY "Upload chat media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Only participants can read (private bucket — use signed URLs)
CREATE POLICY "Read own chat media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─────────────────────────────────────────
-- 7. RLS
-- ─────────────────────────────────────────
ALTER TABLE conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                  ENABLE ROW LEVEL SECURITY;

-- Conversations: only visible to participants
CREATE POLICY "Participants can see conversation" ON conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
        AND user_id = auth.uid()
    )
  );

-- Participants: users can only see rows they're part of
CREATE POLICY "Read own participations" ON conversation_participants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Update own last_read_at" ON conversation_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Messages: only participants of the conversation can read/send
CREATE POLICY "Participants read messages" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants send messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- Soft delete: only sender can delete their own message
CREATE POLICY "Sender soft deletes message" ON messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

-- ─────────────────────────────────────────
-- 8. INBOX VIEW
-- Shows each conversation with the latest message
-- and unread count for the current user
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW inbox AS
SELECT
  c.id                          AS conversation_id,
  other_cp.user_id              AS other_user_id,
  pr.full_name               AS other_user_name,
  pr.avatar_url                 AS other_user_avatar,
  last_msg.content              AS last_message,
  last_msg.created_at           AS last_message_at,
  last_msg.sender_id            AS last_sender_id,
  COUNT(unread.id)              AS unread_count
FROM conversations c
JOIN conversation_participants my_cp
  ON my_cp.conversation_id = c.id AND my_cp.user_id = auth.uid()
JOIN conversation_participants other_cp
  ON other_cp.conversation_id = c.id AND other_cp.user_id != auth.uid()
JOIN profiles pr
  ON pr.id = other_cp.user_id
LEFT JOIN LATERAL (
  SELECT content, created_at, sender_id
  FROM messages
  WHERE conversation_id = c.id AND is_deleted = false
  ORDER BY created_at DESC
  LIMIT 1
) last_msg ON true
LEFT JOIN messages unread
  ON unread.conversation_id = c.id
  AND unread.is_deleted = false
  AND unread.sender_id != auth.uid()
  AND unread.created_at > my_cp.last_read_at
GROUP BY c.id, other_cp.user_id, pr.full_name, pr.avatar_url,
         last_msg.content, last_msg.created_at, last_msg.sender_id
ORDER BY last_message_at DESC NULLS LAST;

-- ─────────────────────────────────────────
-- 9. ENABLE REALTIME
-- ─────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE messages;