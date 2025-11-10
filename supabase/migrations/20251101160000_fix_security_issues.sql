-- Migration: Fix security issues identified by Supabase database linter
-- Date: 2025-11-01
-- Description: Address auth_users_exposed, security_definer_view, and rls_disabled_in_public issues

-- =====================================================
-- 1. Fix auth_users_exposed issues
-- =====================================================

-- Drop existing views and policies completely
DROP VIEW IF EXISTS public.admin_kyc_verifications CASCADE;
DROP VIEW IF EXISTS public.admin_driver_verifications_view CASCADE;

-- Recreate admin_kyc_verifications view without exposing auth.users
CREATE VIEW public.admin_kyc_verifications AS
SELECT
  sv.id,
  sv.user_id,
  sv.real_photo_url,
  sv.id_photo_url,
  sv.verification_status,
  sv.rejection_reason,
  sv.submitted_at,
  sv.reviewed_at,
  sv.reviewed_by,
  sv.created_at,
  sv.updated_at,
  p.full_name,
  p.phone,
  p.location
FROM seller_verifications sv
LEFT JOIN profiles p ON sv.user_id = p.user_id;

-- Enable RLS on the view
ALTER VIEW public.admin_kyc_verifications SET (security_invoker = true);

-- Recreate admin_driver_verifications_view without exposing auth.users
CREATE VIEW public.admin_driver_verifications_view AS
SELECT
    lv.id,
    lv.user_id,
    lv.verification_status,
    lv.submitted_at,
    lv.reviewed_at,
    lv.full_name,
    lv.phone_number,
    lv.full_address AS location,
    lv.profile_photo_url,
    lv.id_document_url,
    lv.selfie_with_id_url,
    lv.vehicle_photo_url,
    lv.insurance_document_url
FROM public.livreur_verifications lv;

-- Enable RLS on the view
ALTER VIEW public.admin_driver_verifications_view SET (security_invoker = true);

-- =====================================================
-- 2. Fix security_definer_view issues
-- =====================================================

-- Recreate views without SECURITY DEFINER

-- seller_orders_view
DROP VIEW IF EXISTS public.seller_orders_view;
CREATE OR REPLACE VIEW public.seller_orders_view
WITH (security_invoker = true) AS
SELECT
    o.id,
    o.buyer_id,
    o.seller_id,
    o.total_price,
    o.status,
    o.created_at,
    o.updated_at,
    buyer_profile.full_name AS buyer_name,
    seller_profile.full_name AS seller_name,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', mp.price,
                'product_name', mp.name
            )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::jsonb
    ) AS items
FROM public.orders o
LEFT JOIN public.profiles buyer_profile ON o.buyer_id = buyer_profile.user_id
LEFT JOIN public.profiles seller_profile ON o.seller_id = seller_profile.user_id
LEFT JOIN public.order_items oi ON o.id = oi.order_id
LEFT JOIN public.marketplace_products mp ON oi.product_id = mp.id
WHERE o.seller_id = auth.uid()
GROUP BY o.id, o.buyer_id, o.seller_id, o.total_price, o.status, o.created_at, o.updated_at,
         buyer_profile.full_name, seller_profile.full_name;

-- marketplace_products_with_seller
DROP VIEW IF EXISTS public.marketplace_products_with_seller;
CREATE OR REPLACE VIEW public.marketplace_products_with_seller
WITH (security_invoker = true) AS
SELECT
    mp.*,
    p.full_name AS seller_name,
    p.phone AS seller_phone,
    p.location AS seller_location
FROM public.marketplace_products mp
LEFT JOIN public.profiles p ON mp.seller_id = p.user_id;

-- seller_stats
DROP VIEW IF EXISTS public.seller_stats;
CREATE OR REPLACE VIEW public.seller_stats
WITH (security_invoker = true) AS
SELECT
    p.user_id,
    p.full_name,
    COUNT(DISTINCT mp.id) AS total_products,
    COUNT(DISTINCT o.id) AS total_orders,
    COALESCE(SUM(o.total_price), 0) AS total_revenue,
    AVG(o.total_price) AS avg_order_value
FROM public.profiles p
LEFT JOIN public.marketplace_products mp ON p.user_id = mp.seller_id
LEFT JOIN public.orders o ON p.user_id = o.seller_id AND o.status = 'completed'
WHERE p.role = 'seller'
GROUP BY p.user_id, p.full_name;

-- driver_deliveries_view (already has security_invoker)
-- deliveries_orders_view
DROP VIEW IF EXISTS public.deliveries_orders_view;
CREATE OR REPLACE VIEW public.deliveries_orders_view
WITH (security_invoker = true) AS
SELECT
    d.id AS delivery_id,
    d.order_id,
    d.status AS delivery_status,
    d.pickup_location,
    d.delivery_location,
    d.estimated_delivery_time,
    d.actual_delivery_time,
    d.created_at AS delivery_created_at,
    o.total_price,
    o.status AS order_status,
    buyer_profile.full_name AS buyer_name,
    seller_profile.full_name AS seller_name
FROM public.deliveries d
JOIN public.orders o ON d.order_id = o.id
LEFT JOIN public.profiles buyer_profile ON o.buyer_id = buyer_profile.user_id
LEFT JOIN public.profiles seller_profile ON o.seller_id = seller_profile.user_id;

-- available_deliveries_view (already has security_invoker)

-- =====================================================
-- 3. Fix rls_disabled_in_public issues
-- =====================================================

-- Enable RLS on tables that don't have it enabled

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_stats_agg ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_commissions_audit ENABLE ROW LEVEL SECURITY;

-- Add appropriate RLS policies for these tables

-- transactions table doesn't exist, skip policies
-- This table may be created elsewhere or not needed

-- seller_stats_agg
CREATE POLICY "Sellers can view their own stats"
ON public.seller_stats_agg FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

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

-- driver_payments
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

-- order_items
CREATE POLICY "Users can view items from their orders"
ON public.order_items FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT id FROM orders WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
  )
);

-- delivery_zones
CREATE POLICY "Authenticated users can view delivery zones"
ON public.delivery_zones FOR SELECT
TO authenticated
USING (true);

-- driver_zones
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

-- delivery_settings
CREATE POLICY "Admins can manage delivery settings"
ON public.delivery_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- delivery_commissions
CREATE POLICY "Admins can view delivery commissions"
ON public.delivery_commissions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- delivery_commissions_audit
CREATE POLICY "Admins can view delivery commissions audit"
ON public.delivery_commissions_audit FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- 4. Grant necessary permissions
-- =====================================================

GRANT SELECT ON public.admin_kyc_verifications TO authenticated;
GRANT SELECT ON public.admin_driver_verifications_view TO authenticated;
GRANT SELECT ON public.seller_orders_view TO authenticated;
GRANT SELECT ON public.marketplace_products_with_seller TO authenticated;
GRANT SELECT ON public.seller_stats TO authenticated;
GRANT SELECT ON public.deliveries_orders_view TO authenticated;