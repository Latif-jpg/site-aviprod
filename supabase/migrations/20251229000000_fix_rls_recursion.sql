-- Migration: Fix Infinite Recursion in RLS Policies
-- Date: 2025-12-29
-- Description: Resolve "infinite recursion detected" error on profiles table by using a SECURITY DEFINER function.

-- 1. Create a security definer function to check admin role
-- This function runs with the privileges of the creator (bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Profiles Table RLS
-- Remove the recursive policy and use the function
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING ( (SELECT public.is_admin()) );

-- 3. Update Orders Table RLS
-- Also use the function for consistency and better performance
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
TO authenticated
USING ( (SELECT public.is_admin()) );

-- 4. Ensure existing basic policies are still there
-- (Checking for self-access which should always work)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        CREATE POLICY "Users can view their own orders" ON public.orders
            FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Policy might already exist or table missing
END $$;
