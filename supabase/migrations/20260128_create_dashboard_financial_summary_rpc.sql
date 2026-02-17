-- =================================================================
-- MIGRATION: Crée la fonction RPC get_dashboard_financial_summary
--
-- Problème: Le dashboard Finance appelle get_dashboard_financial_summary
-- mais cette fonction n'existe pas dans Supabase.
--
-- Solution: Créer la fonction RPC qui calcule les statistiques financières
-- pour différentes périodes (semaine, mois, trimestre, année).
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_financial_summary(p_user_id UUID)
RETURNS TABLE (
    weeklyrevenue NUMERIC,
    weeklyexpenses NUMERIC,
    weeklyprofit NUMERIC,
    weeklyprofitmargin NUMERIC,
    monthlyrevenue NUMERIC,
    monthlyexpenses NUMERIC,
    monthlyprofit NUMERIC,
    monthlyprofitmargin NUMERIC,
    quarterlyrevenue NUMERIC,
    quarterlyexpenses NUMERIC,
    quarterlyprofit NUMERIC,
    quarterlyprofitmargin NUMERIC,
    yearlyrevenue NUMERIC,
    yearlyexpenses NUMERIC,
    yearlyprofit NUMERIC,
    yearlyprofitmargin NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMP := NOW();
    v_week_ago TIMESTAMP := v_now - INTERVAL '7 days';
    v_month_ago TIMESTAMP := v_now - INTERVAL '1 month';
    v_quarter_ago TIMESTAMP := v_now - INTERVAL '3 months';
    v_year_ago TIMESTAMP := v_now - INTERVAL '1 year';
BEGIN
    RETURN QUERY
    WITH
    -- Calculs pour la semaine
    weekly_stats AS (
        SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
        FROM public.financial_records
        WHERE user_id = p_user_id AND record_date >= v_week_ago
    ),
    -- Calculs pour le mois
    monthly_stats AS (
        SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
        FROM public.financial_records
        WHERE user_id = p_user_id AND record_date >= v_month_ago
    ),
    -- Calculs pour le trimestre
    quarterly_stats AS (
        SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
        FROM public.financial_records
        WHERE user_id = p_user_id AND record_date >= v_quarter_ago
    ),
    -- Calculs pour l'année
    yearly_stats AS (
        SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
        FROM public.financial_records
        WHERE user_id = p_user_id AND record_date >= v_year_ago
    )
    SELECT
        -- Semaine
        w.revenue,
        w.expenses,
        w.revenue - w.expenses AS profit,
        CASE WHEN w.revenue > 0 THEN ((w.revenue - w.expenses) / w.revenue) * 100 ELSE 0 END AS profit_margin,
        -- Mois
        m.revenue,
        m.expenses,
        m.revenue - m.expenses AS profit,
        CASE WHEN m.revenue > 0 THEN ((m.revenue - m.expenses) / m.revenue) * 100 ELSE 0 END AS profit_margin,
        -- Trimestre
        q.revenue,
        q.expenses,
        q.revenue - q.expenses AS profit,
        CASE WHEN q.revenue > 0 THEN ((q.revenue - q.expenses) / q.revenue) * 100 ELSE 0 END AS profit_margin,
        -- Année
        y.revenue,
        y.expenses,
        y.revenue - y.expenses AS profit,
        CASE WHEN y.revenue > 0 THEN ((y.revenue - y.expenses) / y.revenue) * 100 ELSE 0 END AS profit_margin
    FROM weekly_stats w, monthly_stats m, quarterly_stats q, yearly_stats y;
END;
$$;

-- Donner les permissions d'exécution à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_dashboard_financial_summary(UUID) TO authenticated;

-- Commentaire pour la documentation
COMMENT ON FUNCTION public.get_dashboard_financial_summary(UUID) IS 'Calcule les statistiques financières (revenus, dépenses, profit, marge) pour différentes périodes (semaine, mois, trimestre, année) pour le dashboard Finance.';
