-- Populate full_name for existing profiles that don't have it
-- This ensures forum posts display user names correctly

UPDATE public.profiles
SET full_name = COALESCE(
  profiles.full_name,
  auth_users.raw_user_meta_data->>'name',
  auth_users.raw_user_meta_data->>'full_name',
  'Utilisateur'
)
FROM auth.users auth_users
WHERE profiles.user_id = auth_users.id
  AND (profiles.full_name IS NULL OR profiles.full_name = '');

-- Also update any forum posts that might have been created before profile names were populated
-- (This is optional since the view will handle it, but ensures consistency)