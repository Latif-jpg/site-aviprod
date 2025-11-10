-- Replaces the function to fix an ambiguous column reference to 'status'
CREATE OR REPLACE FUNCTION public.check_ai_analysis_access()
RETURNS TABLE(status public.access_status, cost INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  analyses_this_month INTEGER;
  max_analyses_allowed INTEGER;
  user_plan_id UUID;
  avicoins_balance INTEGER;
  analysis_cost INTEGER := 5; -- Cost for a single AI analysis
BEGIN
  -- 1. Get user and plan info
  current_user_id := auth.uid();

  SELECT plan_id INTO user_plan_id
  FROM public.user_subscriptions
  -- FIX: Explicitly reference the table column to avoid ambiguity with the returned column
  WHERE user_id = current_user_id AND public.user_subscriptions.status = 'active'
  LIMIT 1;

  IF user_plan_id IS NULL THEN
    SELECT id INTO user_plan_id
    FROM public.subscription_plans
    WHERE price_monthly = 0 AND is_active = TRUE
    LIMIT 1;
  END IF;

  IF user_plan_id IS NULL THEN
    RETURN QUERY SELECT 'denied'::public.access_status, analysis_cost;
    RETURN;
  END IF;

  -- 2. Get plan limits
  SELECT (features->>'ai_analyses_per_month')::INTEGER INTO max_analyses_allowed
  FROM public.subscription_plans
  WHERE id = user_plan_id;

  IF max_analyses_allowed IS NULL THEN
    max_analyses_allowed := 0; -- Default to 0 if not defined
  END IF;

  -- 3. Check if allowed by plan (unlimited or under limit)
  IF max_analyses_allowed = -1 THEN
    RETURN QUERY SELECT 'allowed_by_plan'::public.access_status, 0;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO analyses_this_month
  FROM public.ai_health_analyses
  WHERE user_id = current_user_id AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC');

  IF analyses_this_month < max_analyses_allowed THEN
    RETURN QUERY SELECT 'allowed_by_plan'::public.access_status, 0;
    RETURN;
  END IF;

  -- 4. If limit is reached, check avicoins balance
  SELECT COALESCE(balance, 0) INTO avicoins_balance
  FROM public.user_avicoins
  WHERE user_id = current_user_id;

  IF avicoins_balance >= analysis_cost THEN
    RETURN QUERY SELECT 'requires_payment'::public.access_status, analysis_cost;
    RETURN;
  END IF;

  -- 5. If neither condition is met, deny access
  RETURN QUERY SELECT 'denied'::public.access_status, analysis_cost;
END;
$$;
