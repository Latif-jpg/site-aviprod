-- Migration: Fix Admin Access for Payment Validation
-- This script adds RLS policies to allow Admin users to view all profiles and orders.
-- This is necessary for the Admin Payment Validation screen to enrich payment proofs with seller/buyer details.

-- 1. Profiles Table Policies
-- Check if the policy already exists to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins can view all profiles'
    ) THEN
        CREATE POLICY "Admins can view all profiles" ON public.profiles
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.user_id = auth.uid() AND p.role = 'admin'
            )
        );
    END IF;
END $$;

-- 2. Orders Table Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Admins can view all orders'
    ) THEN
        CREATE POLICY "Admins can view all orders" ON public.orders
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.user_id = auth.uid() AND p.role = 'admin'
            )
        );
    END IF;
END $$;

-- 3. Ensure RLS is enabled (just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Grant Select on views just in case
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
