-- BodyQ Community: Posts Migration
-- Run this in your Supabase SQL editor

-- ─────────────────────────────────────────
-- 1. POSTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content            text NOT NULL,
  media_urls         text[],
  post_type          text CHECK (post_type IN ('workout', 'meal', 'progress', 'general')) DEFAULT 'general',
  workout_session_id uuid REFERENCES workout_sessions(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- 2. LIKES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- ─────────────────────────────────────────
-- 3. COMMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  content           text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 4. TAGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_tags (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag     text NOT NULL
);

-- ─────────────────────────────────────────
-- 5. INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_user_id       ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at    ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id  ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id  ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post  ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id   ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag       ON post_tags(tag);

-- ─────────────────────────────────────────
-- 6. STORAGE BUCKET
-- ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Upload own media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read of media
CREATE POLICY "Public read media" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-media');

-- Allow users to delete their own media
CREATE POLICY "Delete own media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─────────────────────────────────────────
-- 7. RLS
-- ─────────────────────────────────────────
ALTER TABLE posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags     ENABLE ROW LEVEL SECURITY;

-- Posts
CREATE POLICY "Anyone can read posts"   ON posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own posts"  ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts"  ON posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own posts"  ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Likes
CREATE POLICY "Anyone can read likes"   ON post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own likes"  ON post_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Comments
CREATE POLICY "Anyone can read comments"  ON post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own comments" ON post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tags
CREATE POLICY "Anyone can read tags"  ON post_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Post owner manages tags" ON post_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()));

-- ─────────────────────────────────────────
-- 8. FEED VIEW (optional but handy)
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW community_feed AS
SELECT
  p.id,
  p.content,
  p.media_urls,
  p.post_type,
  p.workout_session_id,
  p.created_at,
  pr.id           AS author_id,
  pr.full_name AS author_name,
  pr.avatar_url   AS author_avatar,
  COUNT(DISTINCT pl.id)  AS likes_count,
  COUNT(DISTINCT pc.id)  AS comments_count,
  ARRAY_AGG(DISTINCT pt.tag) FILTER (WHERE pt.tag IS NOT NULL) AS tags
FROM posts p
JOIN profiles pr         ON pr.id = p.user_id
LEFT JOIN post_likes pl  ON pl.post_id = p.id
LEFT JOIN post_comments pc ON pc.post_id = p.id
LEFT JOIN post_tags pt   ON pt.post_id = p.id
GROUP BY p.id, pr.id, pr.full_name, pr.avatar_url
ORDER BY p.created_at DESC;