-- Fix forum table foreign keys to reference profiles instead of auth.users
-- This allows PostgREST to properly handle joins for user profile data

-- Drop existing foreign key constraints
ALTER TABLE forum_topics DROP CONSTRAINT IF EXISTS forum_topics_user_id_fkey;
ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS forum_posts_user_id_fkey;
ALTER TABLE forum_post_likes DROP CONSTRAINT IF EXISTS forum_post_likes_user_id_fkey;
ALTER TABLE forum_topic_subscriptions DROP CONSTRAINT IF EXISTS forum_topic_subscriptions_user_id_fkey;

-- Add new foreign key constraints referencing profiles(id)
ALTER TABLE forum_topics ADD CONSTRAINT forum_topics_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE forum_post_likes ADD CONSTRAINT forum_post_likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE forum_topic_subscriptions ADD CONSTRAINT forum_topic_subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create a view for posts with author information
CREATE OR REPLACE VIEW forum_posts_with_author AS
SELECT
  p.*,
  prof.full_name as author_name,
  prof.avatar_url as author_avatar
FROM forum_posts p
LEFT JOIN profiles prof ON p.user_id = prof.id;

-- Drop the function if it exists with different signature
DROP FUNCTION IF EXISTS get_forum_author_info(UUID);

-- Create a security definer function to get public profile info for forum
CREATE FUNCTION get_forum_author_info(target_user_id UUID)
RETURNS TABLE(full_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT p.full_name, p.avatar_url
    FROM public.profiles p
    WHERE p.id = target_user_id;
END;
$$;

-- Add policy to allow viewing profiles for forum PostgREST queries
DROP POLICY IF EXISTS "Authenticated users can view profiles for forum" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles for forum" ON public.profiles
    FOR SELECT TO authenticated USING (true);