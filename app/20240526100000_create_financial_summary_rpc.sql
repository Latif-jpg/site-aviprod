CREATE OR REPLACE FUNCTION get_dashboard_financial_summary(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    summary RECORD;
BEGIN
    -- Utiliser une seule requête avec des agrégations conditionnelles pour la performance
    SELECT
        -- Calculs mensuels
        COALESCE(SUM(CASE WHEN record_date >= date_trunc('month', now()) AND type = 'income' THEN amount ELSE 0 END), 0) AS current_month_revenue,
        COALESCE(SUM(CASE WHEN record_date >= date_trunc('month', now()) AND type = 'expense' THEN amount ELSE 0 END), 0) AS current_month_expenses, -- VIRGULE CORRIGÉE
        -- Calculs hebdomadaires
        COALESCE(SUM(CASE WHEN record_date >= date_trunc('week', now()) AND type = 'income' THEN amount ELSE 0 END), 0) AS weekly_revenue,
        COALESCE(SUM(CASE WHEN record_date >= date_trunc('week', now()) AND type = 'expense' THEN amount ELSE 0 END), 0) AS weekly_expenses,
        -- NOUVEAU : Calculs trimestriels
        COALESCE(SUM(CASE WHEN record_date >= date_trunc('quarter', now()) AND type = 'income' THEN amount ELSE 0 END), 0) AS quarterly_revenue,
        COALESCE(SUM(CASE WHEN record_date >= date_trunc('quarter', now()) AND type = 'expense' THEN amount ELSE 0 END), 0) AS quarterly_expenses,
        -- NOUVEAU : Calculs annuels
        COALESCE(SUM(CASE WHEN record_date >= date_trunc('year', now()) AND type = 'income' THEN amount ELSE 0 END), 0) AS yearly_revenue,
        COALESCE(SUM(CASE WHEN record_date >= date_trunc('year', now()) AND type = 'expense' THEN amount ELSE 0 END), 0) AS yearly_expenses
    INTO summary
    FROM public.financial_records
    WHERE user_id = p_user_id AND record_date >= date_trunc('year', now()); -- On filtre sur l'année en cours pour couvrir toutes les périodes.

    -- Construire l'objet JSON de résultat
    RETURN jsonb_build_object(
        'revenue', summary.current_month_revenue,
        'expenses', summary.current_month_expenses,
        'monthlyprofit', summary.current_month_revenue - summary.current_month_expenses, -- CORRECTION : Ajout du calcul de la marge
        'monthlyprofitmargin', CASE
            WHEN summary.current_month_revenue > 0 THEN ((summary.current_month_revenue - summary.current_month_expenses) / summary.current_month_revenue) * 100
            ELSE 0
        END,
        'weeklyrevenue', summary.weekly_revenue,
        'weeklyexpenses', summary.weekly_expenses,
        'weeklyprofit', summary.weekly_revenue - summary.weekly_expenses,
        'weeklyprofitmargin', CASE
            WHEN summary.weekly_revenue > 0 THEN ((summary.weekly_revenue - summary.weekly_expenses) / summary.weekly_revenue) * 100
            ELSE 0
        END,
        'quarterlyrevenue', summary.quarterly_revenue,
        'quarterlyexpenses', summary.quarterly_expenses,
        'quarterlyprofit', summary.quarterly_revenue - summary.quarterly_expenses,
        'quarterlyprofitmargin', CASE
            WHEN summary.quarterly_revenue > 0 THEN ((summary.quarterly_revenue - summary.quarterly_expenses) / summary.quarterly_revenue) * 100
            ELSE 0
        END,
        'yearlyrevenue', summary.yearly_revenue,
        'yearlyexpenses', summary.yearly_expenses,
        'yearlyprofit', summary.yearly_revenue - summary.yearly_expenses, -- CORRECTION : Ajout de la marge annuelle
        'yearlyprofitmargin', CASE
            WHEN summary.yearly_revenue > 0 THEN ((summary.yearly_revenue - summary.yearly_expenses) / summary.yearly_revenue) * 100
            ELSE 0
        END
    );
END;
$$;

-- Donner la permission d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_dashboard_financial_summary(UUID) TO authenticated;

-- Pour tester la fonction dans l'éditeur SQL de Supabase :
-- SELECT get_dashboard_financial_summary('VOTRE_USER_ID');

-- =================================================================
-- =================================================================
--
-- SCRIPT DE CORRECTION GLOBAL POUR LA CRÉATION DE LOTS (Version Définitive)
--
-- Ce script corrige toutes les erreurs liées à la création de lots en une seule fois.
-- 1. Ajoute les colonnes manquantes à la table `vaccinations`.
-- 2. Crée et peuple la table `default_vaccination_plans`.
-- 3. Remplace la fonction `create_default_vaccination_plan_for_lot` par une version stable.
--
-- =================================================================
-- =================================================================

-- ÉTAPE 1: Modification structurelle de la table `vaccinations`
-- Ajoute les colonnes manquantes pour éviter les erreurs "column ... does not exist".
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS administration_method TEXT;
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS notes TEXT;

-- ÉTAPE 2: Création et peuplement de la table des plans par défaut
CREATE TABLE IF NOT EXISTS public.default_vaccination_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bird_type TEXT NOT NULL, -- 'broilers', 'layers', 'local'
    vaccine_name TEXT NOT NULL,
    days_after_entry INTEGER NOT NULL,
    method TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.default_vaccination_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.default_vaccination_plans;

CREATE POLICY "Allow read access to all authenticated users"
ON public.default_vaccination_plans
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.default_vaccination_plans (bird_type, vaccine_name, days_after_entry, method) VALUES
('broilers', 'Maladie de Newcastle (Clone 30)', 7, 'Goutte oculaire'),
('broilers', 'Gumboro (IBD)', 14, 'Eau de boisson'),
('broilers', 'Rappel Gumboro (IBD)', 21, 'Eau de boisson'),
('broilers', 'Rappel Newcastle (LaSota)', 28, 'Eau de boisson'),
('layers', 'Maladie de Marek', 1, 'Injection'),
('layers', 'Maladie de Newcastle (Clone 30)', 7, 'Goutte oculaire'),
('layers', 'Gumboro (IBD)', 14, 'Eau de boisson'),
('layers', 'Rappel Gumboro (IBD)', 21, 'Eau de boisson'),
('layers', 'Rappel Newcastle (LaSota)', 28, 'Eau de boisson'),
('layers', 'Variole aviaire', 42, 'Transfixion alaire'),
('layers', 'Coryza infectieux', 56, 'Injection'),
('layers', 'Rappel Coryza infectieux', 84, 'Injection'),
('layers', 'Rappel Newcastle (LaSota)', 112, 'Eau de boisson'),
('local', 'Maladie de Newcastle (Clone 30)', 7, 'Goutte oculaire'),
('local', 'Gumboro (IBD)', 14, 'Eau de boisson'),
('local', 'Rappel Newcastle (LaSota)', 28, 'Eau de boisson'),
('local', 'Variole aviaire', 42, 'Transfixion alaire')
ON CONFLICT (id) DO NOTHING;

-- ÉTAPE 3: Remplacement de la fonction RPC par la version corrigée et stable
CREATE OR REPLACE FUNCTION create_default_vaccination_plan_for_lot(
    p_lot_id UUID,
    p_user_id UUID,
    p_entry_date DATE,
    p_bird_type TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    plan_record RECORD;
BEGIN
    FOR plan_record IN
        SELECT *
        FROM default_vaccination_plans
        WHERE bird_type = p_bird_type
    LOOP
        INSERT INTO public.vaccinations (
            user_id,
            lot_id,
            vaccine_name,
            description,
            age_range_days,
            due_date,
            status,
            administration_method,
            notes,
            priority,
            frequency -- NOUVEAU: Ajout de la colonne fréquence obligatoire
        )
        VALUES (
            p_user_id,
            p_lot_id,
            plan_record.vaccine_name,
            plan_record.vaccine_name, -- Utilise le nom du vaccin comme description par défaut
            jsonb_build_object('start', plan_record.days_after_entry, 'end', plan_record.days_after_entry), -- Construit un objet JSONB valide
            p_entry_date + plan_record.days_after_entry,
            'pending',
            plan_record.method,
            'Plan de prophylaxie généré automatiquement.',
            'medium', -- Fournir une priorité par défaut
            'once' -- CORRECTION FINALE: La valeur correcte est 'once'
        );
    END LOOP;
END;
$$;

-- ÉTAPE 4: Assigner les permissions à la fonction
GRANT EXECUTE ON FUNCTION public.create_default_vaccination_plan_for_lot(UUID, UUID, DATE, TEXT) TO authenticated;

-- =================================================================
-- =================================================================
--
-- SCRIPT DE CRÉATION DE LA FONCTION D'ANALYSE FINANCIÈRE COMPLÈTE (V3)
--
-- Problème: L'agent financier fait plusieurs appels à la DB, ce qui est
-- inefficace et source d'erreurs (profil non trouvé, etc.).
-- Solution: Créer une fonction RPC unique qui retourne un objet JSON
-- complet avec toutes les données nécessaires pour l'analyse.
--
-- =================================================================
-- =================================================================

CREATE OR REPLACE FUNCTION get_comprehensive_financial_analysis(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_current_period_revenue NUMERIC;
    v_current_period_expenses NUMERIC;
    v_previous_period_revenue NUMERIC;
    v_previous_period_expenses NUMERIC;
    v_transactions JSONB;
    v_expenses_by_category JSONB;
    v_user_profile JSONB;
    v_current_balance NUMERIC; -- NOUVEAU : Variable pour stocker la balance actuelle
    v_period_duration INT;
    v_previous_start_date DATE;
    v_previous_end_date DATE;
BEGIN
    -- 1. Calculs pour la période actuelle
    SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
    INTO v_current_period_revenue, v_current_period_expenses
    FROM public.financial_records -- CORRECTION : Utiliser auth.uid() car les transactions sont liées à l'utilisateur, pas à la ferme.
    WHERE user_id = auth.uid() AND record_date BETWEEN p_start_date AND p_end_date;

    -- 2. Calculs pour la période précédente (même durée)
    -- CORRECTION DÉFINITIVE de la logique de date
    v_period_duration := p_end_date - p_start_date; -- Durée en jours
    v_previous_start_date := p_start_date - (v_period_duration + 1) * INTERVAL '1 day';
    v_previous_end_date := p_start_date - INTERVAL '1 day';
    
    SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
    INTO v_previous_period_revenue, v_previous_period_expenses
    FROM public.financial_records -- CORRECTION : Utiliser auth.uid()
    WHERE user_id = auth.uid() AND record_date BETWEEN v_previous_start_date AND v_previous_end_date;

    -- 3. Récupérer les transactions de la période
    SELECT jsonb_agg(t) INTO v_transactions FROM (
        SELECT * FROM public.financial_records WHERE user_id = auth.uid() AND record_date BETWEEN p_start_date AND p_end_date
    ) t;

    -- 4. Récupérer les dépenses par catégorie
    SELECT jsonb_object_agg(category, total) INTO v_expenses_by_category FROM (
        SELECT category, SUM(amount) as total FROM public.financial_records WHERE user_id = auth.uid() AND type = 'expense' AND record_date BETWEEN p_start_date AND p_end_date GROUP BY category
    ) cat_totals;

    -- 5. Récupérer le profil financier de l'utilisateur (en s'assurant de n'en prendre qu'un)
    SELECT to_jsonb(p) INTO v_user_profile FROM public.user_financial_profiles p WHERE p.user_id = auth.uid() LIMIT 1;

    -- 6. NOUVEAU : Calculer la balance actuelle totale (tous les revenus - toutes les dépenses)
    SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
    INTO v_current_balance
    FROM public.financial_records
    WHERE user_id = auth.uid();

    -- 7. Construire l'objet JSON final
    result := jsonb_build_object(
        'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date),
        'current_period', jsonb_build_object(
            'revenue', v_current_period_revenue,
            'expenses', v_current_period_expenses,
            'profit', v_current_period_revenue - v_current_period_expenses,
            'profit_margin', CASE WHEN v_current_period_revenue > 0 THEN ((v_current_period_revenue - v_current_period_expenses) / v_current_period_revenue) * 100 ELSE 0 END,
            'expenses_by_category', v_expenses_by_category
        ),
        'previous_period', jsonb_build_object('revenue', v_previous_period_revenue, 'expenses', v_previous_period_expenses, 'profit', v_previous_period_revenue - v_previous_period_expenses),
        'transactions', v_transactions,
        'user_financial_profile', v_user_profile,
        'current_balance', v_current_balance -- NOUVEAU : Ajouter la balance à la réponse
    );

    RETURN result;
END;
$$;

-- Donner la permission d'exécution
GRANT EXECUTE ON FUNCTION public.get_comprehensive_financial_analysis(UUID, DATE, DATE) TO authenticated;