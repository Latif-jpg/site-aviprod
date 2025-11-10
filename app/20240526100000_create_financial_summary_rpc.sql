-- MIGRATION: Crée une fonction RPC pour calculer le résumé financier mensuel.
-- Problème: Le tableau de bord effectue 4 requêtes pour obtenir les données financières.
-- Solution: Créer une fonction qui effectue tous les calculs côté serveur et renvoie un seul objet JSON.

CREATE OR REPLACE FUNCTION get_monthly_financial_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    -- Déclaration des variables pour stocker les résultats intermédiaires
    current_month_revenue NUMERIC;
    current_month_expenses NUMERIC;
    previous_month_revenue NUMERIC;
    previous_month_expenses NUMERIC;
    current_month_profit NUMERIC;
    previous_month_profit NUMERIC;
    monthly_profit_margin NUMERIC;
    result JSONB;
BEGIN
    -- Définir les plages de dates pour le mois en cours et le mois précédent
    -- date_trunc('month', now()) donne le premier jour du mois actuel
    -- L'intervalle '1 month' permet de naviguer entre les mois
    
    -- Calculer les revenus du mois en cours
    SELECT COALESCE(SUM(amount), 0) INTO current_month_revenue
    FROM public.financial_records
    WHERE user_id = p_user_id AND type = 'income' AND record_date >= date_trunc('month', now());

    -- Calculer les dépenses du mois en cours
    SELECT COALESCE(SUM(amount), 0) INTO current_month_expenses
    FROM public.financial_records
    WHERE user_id = p_user_id AND type = 'expense' AND record_date >= date_trunc('month', now());

    -- Calculer les revenus du mois précédent
    SELECT COALESCE(SUM(amount), 0) INTO previous_month_revenue
    FROM public.financial_records
    WHERE user_id = p_user_id AND type = 'income' 
      AND record_date >= date_trunc('month', now()) - INTERVAL '1 month'
      AND record_date < date_trunc('month', now());

    -- Calculer les dépenses du mois précédent
    SELECT COALESCE(SUM(amount), 0) INTO previous_month_expenses
    FROM public.financial_records
    WHERE user_id = p_user_id AND type = 'expense'
      AND record_date >= date_trunc('month', now()) - INTERVAL '1 month'
      AND record_date < date_trunc('month', now());

    -- Calculer les profits
    current_month_profit := current_month_revenue - current_month_expenses;
    previous_month_profit := previous_month_revenue - previous_month_expenses;

    -- Calculer la marge de profit mensuelle (en pourcentage)
    IF previous_month_profit <> 0 THEN
        monthly_profit_margin := ((current_month_profit - previous_month_profit) / ABS(previous_month_profit)) * 100;
    ELSIF current_month_profit > 0 THEN
        monthly_profit_margin := 100;
    ELSE
        monthly_profit_margin := 0;
    END IF;

    -- Construire l'objet JSON de résultat
    result := jsonb_build_object(
        'revenue', current_month_revenue,
        'expenses', current_month_expenses,
        'monthlyProfit', current_month_profit,
        'monthlyProfitMargin', monthly_profit_margin
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Pour tester la fonction dans l'éditeur SQL de Supabase :
-- SELECT get_monthly_financial_summary('VOTRE_USER_ID');