-- Enable RLS on user_subscriptions table if not already enabled
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role can manage user subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;

-- Policy for service_role: Allows the service role to insert, update, and delete user subscriptions.
-- This is necessary for the payment webhook to activate/update subscriptions.
CREATE POLICY "Service role can manage user subscriptions"
ON public.user_subscriptions FOR ALL
TO service_role
USING (TRUE) WITH CHECK (TRUE);

-- Policy for authenticated users: Allows users to view their own subscriptions.
CREATE POLICY "Users can view their own subscriptions"
ON public.user_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
