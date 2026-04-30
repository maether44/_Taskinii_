-- Allow authenticated users to read all profiles (for profile search, community features, etc.)
-- This is safe because we're only exposing public profile data (id, full_name, avatar_url)
-- Private data (email, etc.) is not exposed

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing read policy to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users read all profiles" ON profiles;

-- Create policy allowing authenticated users to read all profiles
CREATE POLICY "Authenticated users read all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can still only update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can still only insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
