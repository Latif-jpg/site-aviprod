-- =================================================================
-- MIGRATION: Crée une fonction RPC pour l'aperçu complet de la santé.
--
-- Problème: L'application charge toutes les données des lots et effectue
-- les calculs de score de santé et de risque côté client, ce qui est inefficace.
--
-- Solution: Créer une fonction RPC `get_health_dashboard_overview` qui effectue
-- tous les calculs côté serveur et retourne un seul objet JSONB optimisé.
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_health_dashboard_overview(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH
    -- 1. Lots actifs de l'utilisateur avec leurs données de base
    active_lots AS (
        SELECT
            id,
            name,
            quantity,
            initial_quantity,
            mortality,
            symptoms,
            -- Calculer dynamiquement le statut de santé basé sur le taux de mortalité
            CASE
                WHEN (mortality::DECIMAL / NULLIF(initial_quantity, 0)) * 100 < 2 THEN 'excellent'
                WHEN (mortality::DECIMAL / NULLIF(initial_quantity, 0)) * 100 < 5 THEN 'good'
                WHEN (mortality::DECIMAL / NULLIF(initial_quantity, 0)) * 100 < 10 THEN 'fair'
                ELSE 'poor'
            END AS health_status,
            entry_date,
            -- Calcul du taux de mortalité directement ici
            CASE
                WHEN initial_quantity > 0 THEN (mortality::DECIMAL / initial_quantity) * 100
                ELSE 0
            END AS mortality_rate
        FROM public.lots
        WHERE user_id = p_user_id AND status = 'active'
    ),
    -- 2. Calcul du score de risque pour chaque lot (logique de liveAI.ts portée en SQL)
    lots_with_risk AS (
        SELECT
            al.*,
            -- Calcul du score de risque basé sur la mortalité et le statut
            (
                SELECT COALESCE(array_length(symptoms, 1), 0)
                FROM public.lots l
                WHERE l.id = al.id
            ) AS symptom_count,
            (
                SELECT EXTRACT(DAY FROM (now() - v.completed_date))
                FROM public.vaccinations v
                WHERE v.user_id = p_user_id AND v.completed_date IS NOT NULL
                ORDER BY v.completed_date DESC
                LIMIT 1
            ) AS days_since_last_vaccine,
            (
                30 + -- Score de base
                LEAST(50, al.mortality_rate * 25) + -- Chaque % de mortalité ajoute des points
                (CASE WHEN al.health_status = 'poor' THEN 20 WHEN al.health_status = 'fair' THEN 10 ELSE 0 END) +
                (LEAST(15, (SELECT COALESCE(array_length(symptoms, 1), 0) FROM public.lots l WHERE l.id = al.id) * 4))
            ) AS risk_score
        FROM active_lots al
    ),
    -- 3. Enrichissement avec la prochaine tâche de prophylaxie
    enriched_lots AS (
        SELECT
            lwr.*,
            (
                SELECT row_to_json(t) FROM (
                    SELECT
                        p.title,
                        p.date::DATE as due_date
                    FROM public.get_sanitary_prophylaxis_plan(lwr.entry_date::DATE) p
                    WHERE p.date::DATE >= CURRENT_DATE
                    ORDER BY p.date::DATE ASC
                    LIMIT 1
                ) t
            ) AS next_prophylaxis_task
        FROM lots_with_risk lwr
    ),
    -- 4. Calcul des KPIs globaux pour le tableau de bord
    health_kpis AS (
        SELECT
            COUNT(*) AS active_lots_count,
            COALESCE(SUM(quantity), 0) AS total_birds,
            -- Score de santé global basé sur le statut
            CASE
                WHEN COUNT(*) > 0 THEN
                    AVG(
                        CASE health_status
                            WHEN 'excellent' THEN 100
                            WHEN 'good' THEN 80
                            WHEN 'fair' THEN 50
                            WHEN 'poor' THEN 20
                            ELSE 80 -- Défaut
                        END
                    )
                ELSE 100 -- Score parfait si pas de lots actifs
            END AS global_health_score,
            -- Taux de mortalité moyen pondéré
            CASE
                WHEN SUM(initial_quantity) > 0 THEN (SUM(mortality)::DECIMAL / SUM(initial_quantity)) * 100
                ELSE 0
            END AS average_mortality_rate,
            (
                SELECT COALESCE(SUM(array_length(symptoms, 1)), 0)
                FROM active_lots
            ) AS total_symptom_count
        FROM active_lots
    )
    -- 5. Construction de l'objet JSON final
    SELECT jsonb_build_object(
        'kpis', (SELECT row_to_json(k) FROM health_kpis k),
        'lots', (SELECT COALESCE(jsonb_agg(l), '[]'::jsonb) FROM enriched_lots l)
    )
    INTO v_result;

    RETURN v_result;
END;
$$;

-- Donner les permissions d'exécution à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_health_dashboard_overview(UUID) TO authenticated;

-- Commentaire pour la documentation
COMMENT ON FUNCTION public.get_health_dashboard_overview(UUID) IS 'Fournit un aperçu complet de la santé de la ferme, incluant KPIs globaux et analyse de risque par lot.';