-- Fix the profile creation trigger
-- The issue is that we're setting the id column which has a default value

-- Corrected trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Extract name safely
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Utilisateur');

    -- Insert profile - DON'T set id, let it use the default gen_random_uuid()
    BEGIN
        INSERT INTO public.profiles (
            user_id,        -- This is the foreign key to auth.users
            full_name,
            role,
            is_online,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,         -- user_id references auth.users(id)
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
            -- Log error but don't fail signup
            RAISE NOTICE 'Error creating profile for user %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test: Check if the function works
-- This should succeed now