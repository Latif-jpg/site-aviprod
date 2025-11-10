-- MIGRATION: Ensure pro plan has all auto-rationing features
-- This migration ensures that the "pro" subscription plan includes all features related to automatic ration creation.

UPDATE public.subscription_plans
SET 
    features = features || '{"auto_feeding": true, "optimized_feeding": true, "auto_ration_lots": -1}'
WHERE 
    name = 'pro';

