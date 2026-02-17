-- =================================================================
-- MIGRATION: Update AI Analysis Quotas per Plan
-- =================================================================

-- 1. Mise à jour du plan 'freemium' (2 analyses / mois)
UPDATE public.subscription_plans
SET features = features || '{"ai_analyses_per_month": 2}'::jsonb
WHERE name = 'freemium';

-- 2. Mise à jour du plan 'premium' (10 analyses / mois)
UPDATE public.subscription_plans
SET features = features || '{"ai_analyses_per_month": 10}'::jsonb
WHERE name = 'premium';

-- 3. Mise à jour du plan 'pro' (Analyse illimitée : -1)
UPDATE public.subscription_plans
SET features = features || '{"ai_analyses_per_month": -1}'::jsonb
WHERE name = 'pro';
