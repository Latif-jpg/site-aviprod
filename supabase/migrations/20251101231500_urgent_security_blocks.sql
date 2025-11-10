-- Migration: Urgent Security Blocks
-- Date: 2025-11-01
-- Description: Immediate security fixes to block access to sensitive data

-- =====================================================
-- URGENCE 1 : Bloquer l'accès anon MAINTENANT (30 secondes)
-- =====================================================

-- Revoke all access from anonymous users on sensitive views
REVOKE ALL ON public.admin_kyc_verifications FROM anon;
REVOKE ALL ON public.admin_driver_verifications_view FROM anon;

-- =====================================================
-- URGENCE 2 : Activer RLS sur transactions (1 minute)
-- =====================================================

-- transactions table doesn't exist, skip RLS activation

-- =====================================================
-- URGENCE 3 : Faire pareil pour les paiements
-- =====================================================

-- Enable RLS on driver_payments table
ALTER TABLE public.driver_payments ENABLE ROW LEVEL SECURITY;

-- Create temporary block policy for all users (will be replaced with proper policies)
DROP POLICY IF EXISTS "block_all_for_now" ON public.driver_payments;
CREATE POLICY "block_all_for_now" ON public.driver_payments
  FOR ALL TO anon, authenticated USING (false);

-- =====================================================
-- Additional urgent blocks for other sensitive tables
-- =====================================================

-- Enable RLS on other tables mentioned in security analysis
ALTER TABLE public.seller_stats_agg ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_commissions_audit ENABLE ROW LEVEL SECURITY;

-- Temporary block policies (to be replaced with proper policies after testing)
DROP POLICY IF EXISTS "block_all_for_now" ON public.seller_stats_agg;
CREATE POLICY "block_all_for_now" ON public.seller_stats_agg FOR ALL TO anon, authenticated USING (false);
DROP POLICY IF EXISTS "block_all_for_now" ON public.order_items;
CREATE POLICY "block_all_for_now" ON public.order_items FOR ALL TO anon, authenticated USING (false);
DROP POLICY IF EXISTS "block_all_for_now" ON public.delivery_zones;
CREATE POLICY "block_all_for_now" ON public.delivery_zones FOR ALL TO anon, authenticated USING (false);
DROP POLICY IF EXISTS "block_all_for_now" ON public.driver_zones;
CREATE POLICY "block_all_for_now" ON public.driver_zones FOR ALL TO anon, authenticated USING (false);
DROP POLICY IF EXISTS "block_all_for_now" ON public.delivery_settings;
CREATE POLICY "block_all_for_now" ON public.delivery_settings FOR ALL TO anon, authenticated USING (false);
DROP POLICY IF EXISTS "block_all_for_now" ON public.delivery_commissions;
CREATE POLICY "block_all_for_now" ON public.delivery_commissions FOR ALL TO anon, authenticated USING (false);
DROP POLICY IF EXISTS "block_all_for_now" ON public.delivery_commissions_audit;
CREATE POLICY "block_all_for_now" ON public.delivery_commissions_audit FOR ALL TO anon, authenticated USING (false);