CREATE OR REPLACE FUNCTION get_user_friends(p_user_id UUID)
RETURNS TABLE(id UUID, full_name TEXT, avatar_url TEXT, bio TEXT, goal TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.goal
  FROM profiles p
  WHERE p.id IN (
    -- Friends where current user is invitee
    SELECT fr.inviter_id
    FROM friend_requests fr
    WHERE fr.invitee_id = p_user_id
      AND fr.status = 'accepted'
    UNION
    -- Friends where current user is inviter
    SELECT fr.invitee_id
    FROM friend_requests fr
    WHERE fr.inviter_id = p_user_id
      AND fr.status = 'accepted'
  )
  ORDER BY p.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
