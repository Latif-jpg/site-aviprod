-- supabase/migrations/20251101150000_init_user_defaults.sql

-- 1. Create a function to initialize user subscriptions and avicoins
CREATE OR REPLACE FUNCTION public.create_user_default_entries()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    -- Get the ID of the 'free' subscription plan
    SELECT id INTO free_plan_id FROM public.subscription_plans WHERE name = 'free' LIMIT 1;

    -- If no 'free' plan exists, log an error or handle accordingly
    IF free_plan_id IS NULL THEN
        RAISE WARNING 'No "free" subscription plan found. Defaulting to NULL for plan_id.';
    END IF;

    -- Insert a default entry into user_subscriptions if one doesn't exist
    INSERT INTO public.user_subscriptions (user_id, subscription_type, plan_id)
    VALUES (NEW.id, 'free', free_plan_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Insert a default entry into user_avicoins if one doesn't exist
    INSERT INTO public.user_avicoins (user_id, balance, total_earned, total_spent)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a trigger to call the function after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_default_entries();

-- Optional: Ensure RLS is enabled for user_subscriptions and user_avicoins if not already
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avicoins ENABLE ROW LEVEL SECURITY;

-- Optional: Create RLS policies for user_subscriptions and user_avicoins for authenticated users
DROP POLICY IF EXISTS "Users can view and manage their own subscriptions." ON public.user_subscriptions;
CREATE POLICY "Users can view and manage their own subscriptions."
ON public.user_subscriptions FOR ALL
TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view and manage their own avicoins." ON public.user_avicoins;
CREATE POLICY "Users can view and manage their own avicoins."
ON public.user_avicoins FOR ALL
TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());