-- Fix RLS policy for profile creation trigger
-- The trigger needs to insert profiles without RLS restrictions

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create a more permissive policy that allows inserts for the user's own profile OR during signup
CREATE POLICY "Users can insert own profile or trigger can insert" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        auth.uid() IS NULL  -- Allow inserts when no user context (for triggers)
    );

-- Alternative: Temporarily disable RLS for inserts if the above doesn't work
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;