-- 1. Create the helper function to check lot limits against the user's subscription
CREATE OR REPLACE FUNCTION public.can_create_lot()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  active_lots_count INTEGER;
  max_lots_allowed INTEGER;
  user_plan_id UUID;
BEGIN
  -- Get the current user's ID from the session
  current_user_id := auth.uid();

  -- Find the user's active subscription plan
  SELECT plan_id INTO user_plan_id
  FROM public.user_subscriptions
  WHERE user_id = current_user_id AND status = 'active'
  LIMIT 1;

  -- If no active subscription, find the default freemium plan (price = 0)
  IF user_plan_id IS NULL THEN
    SELECT id INTO user_plan_id
    FROM public.subscription_plans
    WHERE price_monthly = 0 AND is_active = TRUE
    LIMIT 1;
  END IF;

  -- If no plan can be determined, deny creation as a fallback
  IF user_plan_id IS NULL THEN
    RAISE WARNING 'No active or freemium plan found for user %', current_user_id;
    RETURN FALSE;
  END IF;

  -- Get the max_lots limit from the plan's features JSON
  -- The ->> operator gets a JSON object field as text
  SELECT (features->>'max_lots')::INTEGER INTO max_lots_allowed
  FROM public.subscription_plans
  WHERE id = user_plan_id;

  -- If max_lots is not defined in the plan, deny creation for safety
  IF max_lots_allowed IS NULL THEN
    RAISE WARNING 'max_lots feature not defined for plan %', user_plan_id;
    RETURN FALSE;
  END IF;
  
  -- A value of -1 signifies unlimited lots
  IF max_lots_allowed = -1 THEN
    RETURN TRUE;
  END IF;

  -- Count the user's current active lots
  SELECT COUNT(*) INTO active_lots_count
  FROM public.lots
  WHERE user_id = current_user_id AND status = 'active';

  -- Check if the user is below their limit
  RETURN active_lots_count < max_lots_allowed;
END;
$$;

-- 2. Enable Row Level Security on the 'lots' table
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

-- 3. Drop old policies if they exist to prevent conflicts
DROP POLICY IF EXISTS "Users can create lots if they have not reached their limit" ON public.lots;
DROP POLICY IF EXISTS "Users can manage their own lots" ON public.lots;

-- 4. Create the RLS policies

-- Policy for INSERT: Checks if the user is allowed to create a new lot.
CREATE POLICY "Users can create lots if they have not reached their limit"
ON public.lots FOR INSERT
TO authenticated
WITH CHECK ( public.can_create_lot() );

-- Policy for SELECT, UPDATE, DELETE: Ensures users can only see and manage their own lots.
CREATE POLICY "Users can manage their own lots"
ON public.lots FOR ALL
TO authenticated
USING ( auth.uid() = user_id );
