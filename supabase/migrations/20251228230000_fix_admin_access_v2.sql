-- Troubleshoot: Check if profiles and orders tables exist
-- Run this first if you get "relation does not exist" errors
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'orders', 'utilisateurs', 'payments');

-- Migration: Fix Admin Access RLS
-- This migration grants Admin users read access to all profiles and orders.

-- 1. Profiles Table RLS
-- Enable RLS and add policy for Admins
DO $$
BEGIN
    -- Check if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
        CREATE POLICY "Admins can view all profiles"
        ON public.profiles FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
          )
        );
    END IF;
END $$;

-- 2. Orders Table RLS
-- Enable RLS and add policy for Admins
DO $$
BEGIN
    -- Check if orders table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
        CREATE POLICY "Admins can view all orders"
        ON public.orders FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
          )
        );
    END IF;
END $$;
