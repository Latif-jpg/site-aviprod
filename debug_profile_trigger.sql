-- Debug the profile creation trigger
-- Check current trigger and function status

-- 1. Check if the function exists and get its definition
SELECT
    proname AS function_name,
    pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 2. Check the trigger definition
SELECT
    tg.tgname AS trigger_name,
    pg_get_triggerdef(tg.oid) AS definition
FROM pg_trigger tg
JOIN pg_class tbl ON tg.tgrelid = tbl.oid
JOIN pg_namespace ns ON tbl.relnamespace = ns.oid
WHERE ns.nspname = 'auth'
  AND tbl.relname = 'users'
  AND tg.tgname = 'on_auth_user_created_profile';

-- 3. Check if profiles table exists and its structure
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- 4. Check profiles table columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 5. Create a safer version of the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Extract name from user metadata safely
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Utilisateur');

    -- Insert profile with error handling
    BEGIN
        INSERT INTO public.profiles (
            id,
            user_id,
            full_name,
            role,
            is_online,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            NEW.id,
            user_name,
            'user',
            false,
            NOW(),
            NOW()
        );
    EXCEPTION
        WHEN unique_violation THEN
            -- Profile already exists, ignore
            RAISE NOTICE 'Profile already exists for user %', NEW.id;
        WHEN OTHERS THEN
            -- Log the error but don't fail the signup
            RAISE NOTICE 'Error creating profile for user %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Test the function manually (replace with actual user ID)
-- SELECT public.handle_new_user();