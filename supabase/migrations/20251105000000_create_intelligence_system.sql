-- Migration: Create Intelligence System Database Schema
-- Date: 2025-11-05
-- Description: Complete intelligence system with alerts, recommendations, activity logs, and patterns

-- =====================================================
-- TABLE: alerts - Système d'alertes intelligentes
-- =====================================================

CREATE TABLE IF NOT EXISTS public.alerts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id uuid NOT NULL,
    alert_type text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('info', 'warning', 'urgent', 'critical')),
    title text NOT NULL,
    message text NOT NULL,
    recommendations jsonb DEFAULT '[]'::jsonb,
    context jsonb DEFAULT '{}'::jsonb,
    related_entity_type text,
    related_entity_id text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'viewed', 'dismissed', 'resolved', 'expired')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    viewed_at timestamp with time zone,
    dismissed_at timestamp with time zone,
    action_taken_at timestamp with time zone,
    action_taken text,
    time_to_action interval,
    expires_at timestamp with time zone,
    user_feedback integer CHECK (user_feedback >= 1 AND user_feedback <= 5)
);

-- =====================================================
-- TABLE: ai_recommendations - Recommandations IA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id uuid NOT NULL,
    recommendation_type text NOT NULL,
    category text NOT NULL,
    priority integer NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
    title text NOT NULL,
    description text NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb,
    expected_impact jsonb DEFAULT '{}'::jsonb,
    context jsonb DEFAULT '{}'::jsonb,
    confidence_score decimal(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shown', 'accepted', 'rejected', 'expired')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    shown_at timestamp with time zone,
    accepted_at timestamp with time zone,
    rejected_at timestamp with time zone,
    rejection_reason text,
    expires_at timestamp with time zone
);

-- =====================================================
-- TABLE: activity_logs - Logs d'activité universels
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    farm_id uuid,
    priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    context jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    outcome text CHECK (outcome IN ('success', 'failure', 'partial')),
    error_message text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    session_id text,
    user_agent text,
    ip_address inet,
    duration_ms integer,
    performance_score decimal(3,2)
);

-- =====================================================
-- TABLE: detected_patterns - Patterns détectés
-- =====================================================

CREATE TABLE IF NOT EXISTS public.detected_patterns (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id uuid NOT NULL,
    pattern_type text NOT NULL,
    pattern_name text NOT NULL,
    description text NOT NULL,
    confidence_score decimal(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    impact_category text NOT NULL,
    impact_severity text NOT NULL CHECK (impact_severity IN ('positive', 'neutral', 'negative')),
    occurrences_count integer NOT NULL DEFAULT 1,
    last_detected_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    first_detected_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- INDEXES POUR PERFORMANCES
-- =====================================================

-- Indexes pour alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user_farm ON public.alerts(user_id, farm_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON public.alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_expires ON public.alerts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_related_entity ON public.alerts(related_entity_type, related_entity_id);

-- Indexes pour ai_recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_user_farm ON public.ai_recommendations(user_id, farm_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON public.ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON public.ai_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON public.ai_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires ON public.ai_recommendations(expires_at) WHERE expires_at IS NOT NULL;

-- Indexes pour activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_priority ON public.activity_logs(priority);

-- Indexes pour detected_patterns
CREATE INDEX IF NOT EXISTS idx_patterns_user_farm ON public.detected_patterns(user_id, farm_id);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON public.detected_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_status ON public.detected_patterns(status);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON public.detected_patterns(confidence_score DESC);

-- =====================================================
-- POLITIQUES RLS (Row Level Security)
-- =====================================================

-- RLS pour alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts" ON public.alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON public.alerts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert alerts" ON public.alerts
    FOR INSERT WITH CHECK (true);

-- RLS pour ai_recommendations
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations" ON public.ai_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations" ON public.ai_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert recommendations" ON public.ai_recommendations
    FOR INSERT WITH CHECK (true);

-- RLS pour activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (true);

-- RLS pour detected_patterns
ALTER TABLE public.detected_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own patterns" ON public.detected_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert and update patterns" ON public.detected_patterns
    FOR ALL USING (true);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour obtenir les métriques de la ferme
CREATE OR REPLACE FUNCTION public.get_farm_metrics(p_farm_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    health_score decimal(5,2) := 85.0; -- Valeur par défaut
    active_lots_count integer := 0;
    total_birds integer := 0;
    avg_mortality_rate decimal(5,2) := 0;
    stock_alert_count integer := 0;
    financial_balance decimal(10,2) := 0;
    critical_alerts_count integer := 0;
BEGIN
    -- Compter les lots actifs
    SELECT COUNT(*) INTO active_lots_count
    FROM public.lots
    WHERE farm_id = p_farm_id AND status = 'active';

    -- Calculer le nombre total de volailles
    SELECT COALESCE(SUM(quantity), 0) INTO total_birds
    FROM public.lots
    WHERE farm_id = p_farm_id AND status = 'active';

    -- Calculer le taux de mortalité moyen
    SELECT COALESCE(AVG(
        CASE
            WHEN initial_quantity > 0 THEN (mortality::decimal / initial_quantity) * 100
            ELSE 0
        END
    ), 0) INTO avg_mortality_rate
    FROM public.lots
    WHERE farm_id = p_farm_id AND status = 'active';

    -- Compter les alertes de stock
    SELECT COUNT(*) INTO stock_alert_count
    FROM public.stock s
    WHERE s.user_id IN (
        SELECT user_id FROM public.profiles WHERE farm_id = p_farm_id
    ) AND s.quantity <= s.min_threshold;

    -- Calculer le solde financier (simplifié)
    SELECT COALESCE(SUM(
        CASE
            WHEN type = 'income' THEN amount
            WHEN type = 'expense' THEN -amount
            ELSE 0
        END
    ), 0) INTO financial_balance
    FROM public.financial_records
    WHERE user_id IN (
        SELECT user_id FROM public.profiles WHERE farm_id = p_farm_id
    );

    -- Compter les alertes critiques
    SELECT COUNT(*) INTO critical_alerts_count
    FROM public.alerts
    WHERE farm_id = p_farm_id AND severity = 'critical' AND status = 'active';

    -- Calcul du score de santé (simplifié)
    IF active_lots_count > 0 THEN
        health_score := GREATEST(0, LEAST(100,
            100 - (avg_mortality_rate * 2) - (stock_alert_count * 5) - (critical_alerts_count * 10)
        ));
    END IF;

    -- Construction du résultat
    result := jsonb_build_object(
        'health_score', health_score,
        'active_lots_count', active_lots_count,
        'total_birds', total_birds,
        'avg_mortality_rate', avg_mortality_rate,
        'stock_alert_count', stock_alert_count,
        'financial_balance', financial_balance,
        'critical_alerts_count', critical_alerts_count,
        'last_updated', extract(epoch from now())
    );

    RETURN result;
END;
$$;

-- Fonction pour nettoyer les alertes expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Supprimer les alertes expirées depuis plus de 30 jours
    DELETE FROM public.alerts
    WHERE status IN ('expired', 'dismissed', 'resolved')
    AND created_at < now() - interval '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Marquer comme expirées les alertes dont la date d'expiration est dépassée
    UPDATE public.alerts
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();

    RETURN deleted_count;
END;
$$;

-- Fonction pour nettoyer les recommandations expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_recommendations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Supprimer les recommandations rejetées ou expirées depuis plus de 7 jours
    DELETE FROM public.ai_recommendations
    WHERE status IN ('rejected', 'expired')
    AND created_at < now() - interval '7 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Marquer comme expirées les recommandations dont la date d'expiration est dépassée
    UPDATE public.ai_recommendations
    SET status = 'expired'
    WHERE status IN ('pending', 'shown')
    AND expires_at IS NOT NULL
    AND expires_at < now();

    RETURN deleted_count;
END;
$$;

-- =====================================================
-- TRIGGERS DE MAINTENANCE AUTOMATIQUE
-- =====================================================

-- Trigger pour nettoyer automatiquement les données anciennes
CREATE OR REPLACE FUNCTION public.maintenance_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Nettoyer les alertes expirées (toutes les heures)
    IF random() < 0.01 THEN -- 1% de chance par opération
        PERFORM public.cleanup_expired_alerts();
        PERFORM public.cleanup_expired_recommendations();
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Appliquer le trigger sur les tables principales
DROP TRIGGER IF EXISTS maintenance_on_alerts ON public.alerts;
CREATE TRIGGER maintenance_on_alerts
    AFTER INSERT OR UPDATE ON public.alerts
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.maintenance_trigger();

DROP TRIGGER IF EXISTS maintenance_on_recommendations ON public.ai_recommendations;
CREATE TRIGGER maintenance_on_recommendations
    AFTER INSERT OR UPDATE ON public.ai_recommendations
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.maintenance_trigger();

-- =====================================================
-- DONNÉES DE TEST (optionnel)
-- =====================================================

-- Insérer quelques alertes de test pour démonstration
-- Note: À supprimer en production

/*
INSERT INTO public.alerts (
    user_id, farm_id, alert_type, severity, title, message,
    recommendations, context, status, expires_at
) VALUES
(
    (SELECT id FROM auth.users LIMIT 1),
    '00000000-0000-0000-0000-000000000001',
    'health_mortality_high',
    'critical',
    'Mortalité Élevée Détectée',
    'Le lot "Lot A" présente un taux de mortalité de 8.5%, supérieur à la normale.',
    '[{"action": "Consulter un vétérinaire", "description": "Inspection immédiate requise", "priority": 1}]'::jsonb,
    '{"lot_name": "Lot A", "mortality_rate": 8.5, "threshold": 5}'::jsonb,
    'active',
    now() + interval '24 hours'
);
*/

-- =====================================================
-- COMMENTAIRES DE DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.alerts IS 'Système d''alertes intelligentes avec recommandations automatiques';
COMMENT ON TABLE public.ai_recommendations IS 'Recommandations générées par l''IA basées sur les données utilisateur';
COMMENT ON TABLE public.activity_logs IS 'Logs universels d''activité pour analyse et amélioration';
COMMENT ON TABLE public.detected_patterns IS 'Patterns comportementaux détectés pour insights prédictifs';

COMMENT ON COLUMN public.alerts.severity IS 'Niveau de sévérité: info, warning, urgent, critical';
COMMENT ON COLUMN public.alerts.recommendations IS 'Actions recommandées avec priorités et impacts';
COMMENT ON COLUMN public.ai_recommendations.confidence_score IS 'Score de confiance de la recommandation (0-1)';
COMMENT ON COLUMN public.detected_patterns.confidence_score IS 'Confiance dans la détection du pattern (0-1)';

-- =====================================================
-- GRANTS POUR L'APPLICATION
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON public.alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_recommendations TO authenticated;
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.detected_patterns TO authenticated;

-- Permissions pour les fonctions
GRANT EXECUTE ON FUNCTION public.get_farm_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_recommendations() TO authenticated;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

-- Log de la migration
DO $$
BEGIN
    RAISE NOTICE 'Migration Intelligence System completed successfully at %', now();
END $$;