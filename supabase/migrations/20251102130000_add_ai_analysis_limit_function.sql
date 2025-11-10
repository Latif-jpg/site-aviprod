-- Function to check if a user can perform an AI analysis based on their subscription limits
CREATE OR REPLACE FUNCTION public.can_perform_ai_analysis()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  analyses_this_month INTEGER;
  max_analyses_allowed INTEGER;
  user_plan_id UUID;
BEGIN
  -- 1. Get the current user's ID from the session
  current_user_id := auth.uid();

  -- 2. Find the user's active subscription plan
  SELECT plan_id INTO user_plan_id
  FROM public.user_subscriptions
  WHERE user_id = current_user_id AND status = 'active'
  LIMIT 1;

  -- 3. If no active subscription, find the default freemium plan (price = 0)
  IF user_plan_id IS NULL THEN
    SELECT id INTO user_plan_id
    FROM public.subscription_plans
    WHERE price_monthly = 0 AND is_active = TRUE
    LIMIT 1;
  END IF;

  -- 4. If no plan can be determined, deny creation as a fallback
  IF user_plan_id IS NULL THEN
    RAISE WARNING 'No active or freemium plan found for user %', current_user_id;
    RETURN FALSE;
  END IF;

  -- 5. Get the max_analyses limit from the plan's features JSON
  SELECT (features->>'ai_analyses_per_month')::INTEGER INTO max_analyses_allowed
  FROM public.subscription_plans
  WHERE id = user_plan_id;

  -- If max_analyses is not defined in the plan, deny for safety
  IF max_analyses_allowed IS NULL THEN
    RAISE WARNING 'ai_analyses_per_month not defined for plan %', user_plan_id;
    RETURN FALSE;
  END IF;
  
  -- A value of -1 signifies unlimited analyses
  IF max_analyses_allowed = -1 THEN
    RETURN TRUE;
  END IF;

  -- 6. Count the user's analyses in the current calendar month
  SELECT COUNT(*) INTO analyses_this_month
  FROM public.ai_health_analyses
  WHERE user_id = current_user_id 
    AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC');

  -- 7. Check if the user is below their limit
  RETURN analyses_this_month < max_analyses_allowed;
END;
$$;
