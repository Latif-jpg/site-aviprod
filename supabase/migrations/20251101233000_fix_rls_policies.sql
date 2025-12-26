-- Migration: Fix RLS Policies After Urgent Blocks
-- Date: 2025-11-01
-- Description: Replace temporary block policies with proper access controls

-- =====================================================
-- Drop temporary block policies and add proper ones
-- =====================================================

-- transactions table doesn't exist, skip policies

-- driver_payments: Drop block policy and add proper policies
DROP POLICY IF EXISTS "block_all_for_now" ON public.driver_payments;

-- Drivers can view their own payments
DROP POLICY IF EXISTS "Drivers can view their own payments" ON public.driver_payments;
CREATE POLICY "Drivers can view their own payments"
ON public.driver_payments FOR SELECT
TO authenticated
USING (
  delivery_id IN (
    SELECT d.id FROM deliveries d
    JOIN livreur_verifications lv ON d.driver_id = lv.id
    WHERE lv.user_id = auth.uid()
  )
);

-- Admins can view all driver payments
DROP POLICY IF EXISTS "Admins can view all driver payments" ON public.driver_payments;
CREATE POLICY "Admins can view all driver payments"
ON public.driver_payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- seller_stats_agg: Drop block policy and add proper policies
DROP POLICY IF EXISTS "block_all_for_now" ON public.seller_stats_agg;

-- Sellers can view their own stats
DROP POLICY IF EXISTS "Sellers can view their own stats" ON public.seller_stats_agg;
CREATE POLICY "Sellers can view their own stats"
ON public.seller_stats_agg FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- Admins can view all seller stats
DROP POLICY IF EXISTS "Admins can view all seller stats" ON public.seller_stats_agg;
CREATE POLICY "Admins can view all seller stats"
ON public.seller_stats_agg FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- order_items: Drop block policy and add proper policies
DROP POLICY IF EXISTS "block_all_for_now" ON public.order_items;

-- Users can view items from their orders
DROP POLICY IF EXISTS "Users can view items from their orders" ON public.order_items;
CREATE POLICY "Users can view items from their orders"
ON public.order_items FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT id FROM orders WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
  )
);

-- Users can insert items for their own orders
DROP POLICY IF EXISTS "Users can insert items for their own orders" ON public.order_items;
CREATE POLICY "Users can insert items for their own orders"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (
  order_id IN (
    SELECT id FROM orders WHERE buyer_id = auth.uid()
  )
);

-- delivery_zones: Drop block policy and add proper policies
DROP POLICY IF EXISTS "block_all_for_now" ON public.delivery_zones;

-- Authenticated users can view delivery zones
DROP POLICY IF EXISTS "Authenticated users can view delivery zones" ON public.delivery_zones;
CREATE POLICY "Authenticated users can view delivery zones"
ON public.delivery_zones FOR SELECT
TO authenticated
USING (true);

-- driver_zones: Drop block policy and add proper policies
DROP POLICY IF EXISTS "block_all_for_now" ON public.driver_zones;

-- Drivers can view zones
DROP POLICY IF EXISTS "Drivers can view zones" ON public.driver_zones;
CREATE POLICY "Drivers can view zones"
ON public.driver_zones FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'driver'
  )
);

-- delivery_settings: Drop block policy and add proper policies
DROP POLICY IF EXISTS "block_all_for_now" ON public.delivery_settings;

-- delivery_commissions: Drop block policy and add proper policies

DROP POLICY IF EXISTS "block_all_for_now" ON public.delivery_commissions;

-- delivery_commissions_audit: Drop block policy and add proper policies

DROP POLICY IF EXISTS "block_all_for_now" ON public.delivery_commissions_audit;