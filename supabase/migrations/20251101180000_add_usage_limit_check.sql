-- =================================================================
-- MIGRATION: Add Usage Limit Check Function
--
-- Problème: Les limites d'utilisation des plans (ex: nombre d'analyses IA)
-- ne sont pas vérifiées, permettant aux utilisateurs de dépasser leur quota.
--
-- Solution: Créer une fonction RPC `check_usage_limit` que l'application
-- peut appeler avant d'exécuter une action soumise à une limite.
-- =================================================================

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
    -- 1. Récupérer les fonctionnalités du plan de l'utilisateur actuel
    SELECT p.features INTO user_plan_features
    FROM public.user_subscriptions us
    JOIN public.subscription_plans p ON us.plan_id = p.id
    WHERE us.user_id = current_user_id;

    -- Si l'utilisateur n'a pas de plan (ne devrait pas arriver), refuser
    IF user_plan_features IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 2. Extraire la limite pour la fonctionnalité demandée
    usage_limit := (user_plan_features ->> feature_key)::INT;

    -- Si la limite est -1, c'est illimité. L'utilisateur est autorisé.
    IF usage_limit = -1 THEN
        RETURN TRUE;
    END IF;

    -- 3. Calculer l'utilisation actuelle en fonction de la fonctionnalité
    --    Cette section doit être étendue pour chaque fonctionnalité à vérifier.
    IF feature_key = 'ai_analyses_per_month' THEN
        SELECT COUNT(*) INTO current_usage
        FROM public.ai_health_analyses
        WHERE user_id = current_user_id
          AND created_at >= date_trunc('month', NOW());

    ELSIF feature_key = 'max_lots' THEN
        -- Exemple pour les lots. Adaptez la table et la colonne si nécessaire.
        -- SELECT COUNT(*) INTO current_usage FROM public.lots WHERE user_id = current_user_id;
        current_usage := 0; -- Mettez ici la logique pour compter les lots

    ELSE
        -- Par défaut, si la fonctionnalité n'est pas gérée, on ne bloque pas.
        -- On pourrait aussi choisir de bloquer par sécurité.
        current_usage := 0;
    END IF;

    -- 4. Comparer l'utilisation actuelle à la limite
    RETURN current_usage < usage_limit;
END;
$$;

-- Donner la permission aux utilisateurs authentifiés d'appeler cette fonction
GRANT EXECUTE ON FUNCTION public.check_usage_limit(TEXT) TO authenticated;