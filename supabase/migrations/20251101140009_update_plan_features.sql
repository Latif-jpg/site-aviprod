-- Mise à jour du plan Freemium
UPDATE public.subscription_plans
SET features = '{
  "ai_analyses_per_month": 2,
  "max_lots": 2,
  "daily_health_journal": true,
  "sanitary_prophylaxis": true,
  "marketplace_access": true,
  "marketplace_purchases": true,
  "marketplace_sales_per_month": 2,
  "auto_ration_lots": 0,
  "finance_access": false,
  "export_reports": false
}'::jsonb
WHERE name = 'freemium';

-- Mise à jour du plan Premium
UPDATE public.subscription_plans
SET features = '{
  "ai_analyses_per_month": 15,
  "max_lots": -1,
  "daily_health_journal": true,
  "sanitary_prophylaxis": true,
  "marketplace_access": true,
  "marketplace_purchases": true,
  "marketplace_sales_per_month": -1,
  "auto_ration_lots": 5,
  "finance_access": true,
  "export_reports": false
}'::jsonb
WHERE name = 'premium';

-- Mise à jour du plan Pro
UPDATE public.subscription_plans
SET features = '{
  "ai_analyses_per_month": -1,
  "max_lots": -1,
  "daily_health_journal": true,
  "sanitary_prophylaxis": true,
  "marketplace_access": true,
  "marketplace_purchases": true,
  "marketplace_sales_per_month": -1,
  "auto_ration_lots": -1,
  "finance_access": true,
  "export_reports": true
}'::jsonb
WHERE name = 'pro';
