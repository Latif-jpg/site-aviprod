-- =================================================================
-- MIGRATION: Fix Freemium Limits & Fallback Logic
-- =================================================================

-- 1. Mettre à jour les caractéristiques du plan 'freemium' avec les limites strictes
UPDATE public.subscription_plans
SET features = '{
  "ai_analyses_per_month": 2,
  "max_lots": 1,
  "auto_feeding": false,
  "advanced_feeding": false,
  "optimized_feeding": false,
  "product_recommendations": false,
  "full_history": false,
  "sell_on_marketplace": true,
  "export_reports": false,
  "advanced_alerts": false,
  "delivery_discount": 0,
  "delivery_free": false,
  "product_discount": 0,
  "priority_support": false,
  "dedicated_support": false,
  "prophylaxy": false
}'::jsonb
WHERE name = 'freemium';

-- 2. Mettre à jour la fonction check_usage_limit pour gérer le fallback Freemium
CREATE OR REPLACE FUNCTION public.check_usage_limit(
    feature_key TEXT -- ex: 'ai_analyses_per_month'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    current_user_id UUID := auth.uid();
    user_plan_features JSONB;
    usage_limit INT;
    current_usage INT;
BEGIN
    -- 1. Tenter de récupérer les fonctionnalités du plan ACTIF de l'utilisateur
    SELECT p.features INTO user_plan_features
    FROM public.user_subscriptions us
    JOIN public.subscription_plans p ON us.plan_id = p.id
    WHERE us.user_id = current_user_id
      AND us.status = 'active';

    -- 2. Si aucun plan actif, charger les règles du plan 'freemium'
    IF user_plan_features IS NULL THEN
        SELECT features INTO user_plan_features
        FROM public.subscription_plans
        WHERE name = 'freemium'
        LIMIT 1;
    END IF;

    -- Si toujours rien (ne devrait pas arriver si le plan freemium existe), bloquer
    IF user_plan_features IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 3. Gestion des booléens (pour les fonctionnalités on/off comme auto_feeding)
    -- Si la feature dans le JSON est un booléen, on retourne sa valeur directement
    IF jsonb_typeof(user_plan_features -> feature_key) = 'boolean' THEN
        RETURN (user_plan_features ->> feature_key)::BOOLEAN;
    END IF;

    -- 4. Gestion des quotas numériques (ex: ai_analyses_per_month)
    usage_limit := (user_plan_features ->> feature_key)::INT;

    -- Si la limite est -1, c'est illimité
    IF usage_limit = -1 THEN
        RETURN TRUE;
    END IF;

    -- 5. Calculer l'utilisation actuelle
    IF feature_key = 'ai_analyses_per_month' THEN
        SELECT COUNT(*) INTO current_usage
        FROM public.ai_health_analyses
        WHERE user_id = current_user_id
          AND created_at >= date_trunc('month', NOW());
          
    ELSIF feature_key = 'max_lots' THEN
        SELECT COUNT(*) INTO current_usage
        FROM public.batches -- Assumant que la table s'appelle 'batches' pour les lots
        WHERE user_id = current_user_id
          AND status = 'active'; -- On ne compte que les lots actifs
          
    ELSE
        -- Par défaut, 0 utilisation pour les autres compteurs non implémentés
        current_usage := 0;
    END IF;

    -- 6. Vérifier si on est en dessous de la limite
    RETURN current_usage < usage_limit;
END;
$$;
