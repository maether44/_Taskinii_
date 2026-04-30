-- Friend invitations for share links / deep links

CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT friend_requests_not_self CHECK (inviter_id <> invitee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_pair_idx
  ON friend_requests (inviter_id, invitee_id);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their friend requests" ON friend_requests;
CREATE POLICY "Users can read their friend requests"
  ON friend_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

DROP POLICY IF EXISTS "Invitee can create invitation response" ON friend_requests;
CREATE POLICY "Invitee can create invitation response"
  ON friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = invitee_id
    AND auth.uid() <> inviter_id
  );

DROP POLICY IF EXISTS "Invitee can update invitation response" ON friend_requests;
CREATE POLICY "Invitee can update invitation response"
  ON friend_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = invitee_id)
  WITH CHECK (
    auth.uid() = invitee_id
    AND status IN ('accepted', 'rejected')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
