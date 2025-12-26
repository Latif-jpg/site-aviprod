-- =================================================================
-- MIGRATION: Crée une fonction RPC complète pour l'analyse financière par l'IA.
--
-- Problème: L'agent FinancialAdvisor effectue de multiples requêtes pour collecter
-- les données nécessaires à ses analyses, ce qui est lent et inefficace.
--
-- Solution: Créer une fonction RPC unique `get_comprehensive_financial_analysis`
-- qui agrège toutes les données côté serveur et retourne un seul objet JSONB.
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_comprehensive_financial_analysis(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Important pour accéder aux tables avec les droits du serveur
AS $$
DECLARE
    v_result JSONB;
    v_period_duration INT;
    v_previous_start_date DATE;
    v_previous_end_date DATE;
BEGIN
    -- Calculer la durée de la période pour définir la période précédente
    v_period_duration := p_end_date - p_start_date;
    v_previous_start_date := p_start_date - (v_period_duration + 1) * INTERVAL '1 day';
    v_previous_end_date := p_end_date - (v_period_duration + 1) * INTERVAL '1 day';

    WITH
    -- 1. Transactions de la période actuelle
    current_transactions AS (
        SELECT * FROM public.financial_records
        WHERE user_id = p_user_id AND record_date BETWEEN p_start_date AND p_end_date
    ),
    -- 2. Transactions de la période précédente
    previous_transactions AS (
        SELECT * FROM public.financial_records
        WHERE user_id = p_user_id AND record_date BETWEEN v_previous_start_date AND v_previous_end_date
    ),
    -- 3. Agrégats de la période actuelle
    current_summary AS (
        SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_revenue,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses
        FROM current_transactions
    ),
    -- 4. Agrégats de la période précédente
    previous_summary AS (
        SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_revenue,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses
        FROM previous_transactions
    ),
    -- 5. Dépenses par catégorie pour la période actuelle
    expenses_by_category AS (
        SELECT jsonb_object_agg(category, total)
        FROM (
            SELECT category, SUM(amount) as total
            FROM current_transactions
            WHERE type = 'expense'
            GROUP BY category
        ) AS categorized
    ),
    -- 6. Profil financier de l'utilisateur
    user_profile AS (
        SELECT row_to_json(p)
        FROM public.user_financial_profiles p
        WHERE p.user_id = p_user_id
        LIMIT 1
    )
    -- 7. Construction de l'objet JSON final
    SELECT jsonb_build_object(
        'period', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date
        ),
        'current_period', jsonb_build_object(
            'revenue', (SELECT total_revenue FROM current_summary),
            'expenses', (SELECT total_expenses FROM current_summary),
            'profit', (SELECT total_revenue - total_expenses FROM current_summary),
            'profit_margin', CASE
                WHEN (SELECT total_revenue FROM current_summary) > 0
                THEN ((SELECT total_revenue - total_expenses FROM current_summary) / (SELECT total_revenue FROM current_summary)) * 100
                ELSE 0
            END,
            'expenses_by_category', (SELECT * FROM expenses_by_category)
        ),
        'previous_period', jsonb_build_object(
            'revenue', (SELECT total_revenue FROM previous_summary),
            'expenses', (SELECT total_expenses FROM previous_summary),
            'profit', (SELECT total_revenue - total_expenses FROM previous_summary)
        ),
        'transactions', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM current_transactions t),
        'user_financial_profile', (SELECT * FROM user_profile)
    )
    INTO v_result;

    RETURN v_result;
END;
$$;

-- Donner les permissions d'exécution à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_comprehensive_financial_analysis(UUID, DATE, DATE) TO authenticated;

-- Commentaire pour la documentation
COMMENT ON FUNCTION public.get_comprehensive_financial_analysis(UUID, DATE, DATE) IS 'Fournit une analyse financière complète pour une période donnée, destinée à être utilisée par les agents IA. Agrège les transactions, compare avec la période précédente et inclut le profil financier de l''utilisateur.';