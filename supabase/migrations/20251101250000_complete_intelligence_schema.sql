-- Migration complète pour le système d'intelligence Aviprod
-- Ajoute seulement les tables manquantes (certaines existent déjà)

-- Table predictions (manquante)
CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  type varchar(100) NOT NULL,
  target_entity uuid NOT NULL,
  entity_type varchar(50) NOT NULL,
  predicted_value jsonb NOT NULL,
  actual_value jsonb,
  confidence_score float CHECK (confidence_score >= 0 AND confidence_score <= 1),
  accuracy float CHECK (accuracy >= 0 AND accuracy <= 1),
  feedback_provided boolean DEFAULT FALSE,
  user_feedback jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),
  resolved_at timestamptz,
  model_version varchar(50),
  CONSTRAINT predictions_pkey PRIMARY KEY (id)
);

-- Table alerts_effectiveness (manquante)
CREATE TABLE IF NOT EXISTS public.alerts_effectiveness (
  alert_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type varchar(100) NOT NULL,
  severity varchar(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title varchar(255) NOT NULL,
  message text,
  action_taken boolean DEFAULT FALSE,
  action_type varchar(100),
  time_to_action interval,
  outcome jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),
  acted_at timestamptz,
  CONSTRAINT alerts_effectiveness_pkey PRIMARY KEY (alert_id)
);

-- Table ml_models (manquante)
CREATE TABLE IF NOT EXISTS public.ml_models (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  model_type varchar(100) NOT NULL,
  version integer NOT NULL,
  parameters jsonb NOT NULL,
  performance_metrics jsonb NOT NULL,
  training_data_stats jsonb DEFAULT '{}',
  active boolean DEFAULT FALSE,
  deployed_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  CONSTRAINT ml_models_pkey PRIMARY KEY (id),
  CONSTRAINT ml_models_type_version UNIQUE(model_type, version)
);

-- Table user_engagement_metrics (manquante)
CREATE TABLE IF NOT EXISTS public.user_engagement_metrics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type varchar(100) NOT NULL,
  metric_value jsonb NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  calculated_at timestamptz DEFAULT NOW(),
  CONSTRAINT user_engagement_metrics_pkey PRIMARY KEY (id)
);

-- Table detected_patterns (existe déjà, on l'enrichit si nécessaire)
-- La table existe déjà, on ajoute juste des colonnes si elles manquent
ALTER TABLE public.detected_patterns
ADD COLUMN IF NOT EXISTS impact_category text,
ADD COLUMN IF NOT EXISTS impact_severity text CHECK (impact_severity IN ('positive', 'neutral', 'negative'));

-- Table ai_recommendations (existe déjà, on l'enrichit)
ALTER TABLE public.ai_recommendations
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Table alerts (existe déjà, on l'enrichit)
ALTER TABLE public.alerts
ADD COLUMN IF NOT EXISTS user_feedback integer CHECK (user_feedback >= 1 AND user_feedback <= 5),
ADD COLUMN IF NOT EXISTS time_to_action interval;

-- Table activity_logs (existe déjà, on l'enrichit)
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS session_id uuid,
ADD COLUMN IF NOT EXISTS device_info jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS location_data jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS duration_ms integer,
ADD COLUMN IF NOT EXISTS performance_score numeric;

-- Création des index pour optimiser les requêtes ML
CREATE INDEX IF NOT EXISTS idx_predictions_type_entity ON predictions(type, target_entity);
CREATE INDEX IF NOT EXISTS idx_predictions_accuracy ON predictions(accuracy);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_effectiveness_user ON alerts_effectiveness(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_effectiveness_type ON alerts_effectiveness(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_effectiveness_action ON alerts_effectiveness(action_taken);

CREATE INDEX IF NOT EXISTS idx_ml_models_type_active ON ml_models(model_type, active);
CREATE INDEX IF NOT EXISTS idx_ml_models_version ON ml_models(version DESC);

CREATE INDEX IF NOT EXISTS idx_user_engagement_user_period ON user_engagement_metrics(user_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_timestamp ON activity_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_outcome ON activity_logs(outcome);

-- Politiques RLS pour les nouvelles tables
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- Politiques pour predictions
CREATE POLICY "Users can view predictions for their entities" ON public.predictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lots WHERE id = target_entity AND user_id = auth.uid()
      UNION
      SELECT 1 FROM marketplace_products WHERE id = target_entity AND seller_id = auth.uid()
    )
  );

-- Politiques pour alerts_effectiveness
CREATE POLICY "Users can view their own alerts effectiveness" ON public.alerts_effectiveness
  FOR SELECT USING (auth.uid() = user_id);

-- Politiques pour user_engagement_metrics
CREATE POLICY "Users can view their own engagement metrics" ON public.user_engagement_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Politiques pour ml_models (lecture seule pour tous les utilisateurs authentifiés)
CREATE POLICY "Authenticated users can view ML models" ON public.ml_models
  FOR SELECT USING (auth.role() = 'authenticated');

-- Commentaires pour documentation
COMMENT ON TABLE public.predictions IS 'Prédictions IA avec feedback utilisateur pour amélioration continue';
COMMENT ON TABLE public.alerts_effectiveness IS 'Mesure de l''efficacité des alertes et recommandations';
COMMENT ON TABLE public.ml_models IS 'Versioning des modèles de ML avec métriques de performance';
COMMENT ON TABLE public.user_engagement_metrics IS 'Métriques d''engagement et d''utilisation des fonctionnalités';

-- Insertion de données initiales pour les modèles ML
INSERT INTO public.ml_models (model_type, version, parameters, performance_metrics, active)
VALUES
  ('health_predictor', 1, '{"algorithm": "random_forest", "features": ["mortality_rate", "symptoms_count", "feed_consumption"]}', '{"accuracy": 0.85, "precision": 0.82, "recall": 0.88}', true),
  ('growth_forecaster', 1, '{"algorithm": "linear_regression", "features": ["age", "feed_quality", "health_score"]}', '{"r2_score": 0.91, "mae": 0.15}', true),
  ('stock_optimizer', 1, '{"algorithm": "time_series", "features": ["consumption_history", "seasonal_patterns"]}', '{"accuracy": 0.78, "error_rate": 0.12}', true)
ON CONFLICT (model_type, version) DO NOTHING;

-- Vue pour les métriques d'engagement agrégées (pour les admins)
CREATE OR REPLACE VIEW public.engagement_summary AS
SELECT
  DATE_TRUNC('day', period_start) as date,
  COUNT(DISTINCT user_id) as active_users,
  AVG((metric_value->>'session_duration')::float) as avg_session_duration,
  SUM((metric_value->>'actions_count')::int) as total_actions,
  AVG((metric_value->>'feature_usage_rate')::float) as avg_feature_usage
FROM public.user_engagement_metrics
WHERE metric_type = 'daily_engagement'
GROUP BY DATE_TRUNC('day', period_start)
ORDER BY date DESC;

-- Fonction pour calculer les métriques d'engagement quotidiennes
CREATE OR REPLACE FUNCTION public.calculate_daily_engagement_metrics(target_date date DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  day_start timestamptz := target_date::timestamptz;
  day_end timestamptz := (target_date + interval '1 day')::timestamptz;
  user_record record;
  engagement_data jsonb;
BEGIN
  -- Pour chaque utilisateur actif
  FOR user_record IN
    SELECT DISTINCT user_id
    FROM public.activity_logs
    WHERE timestamp >= day_start AND timestamp < day_end
  LOOP
    -- Calculer les métriques d'engagement
    SELECT jsonb_build_object(
      'session_duration', EXTRACT(epoch FROM (MAX(timestamp) - MIN(timestamp))),
      'actions_count', COUNT(*),
      'feature_usage_rate', COUNT(DISTINCT context->>'feature')::float / GREATEST(COUNT(*), 1),
      'most_used_feature', (
        SELECT context->>'feature'
        FROM public.activity_logs
        WHERE user_id = user_record.user_id
          AND timestamp >= day_start AND timestamp < day_end
        GROUP BY context->>'feature'
        ORDER BY COUNT(*) DESC
        LIMIT 1
      )
    ) INTO engagement_data
    FROM public.activity_logs
    WHERE user_id = user_record.user_id
      AND timestamp >= day_start AND timestamp < day_end;

    -- Insérer ou mettre à jour les métriques
    INSERT INTO public.user_engagement_metrics (user_id, metric_type, metric_value, period_start, period_end)
    VALUES (user_record.user_id, 'daily_engagement', engagement_data, day_start, day_end)
    ON CONFLICT (user_id, metric_type, period_start, period_end) DO UPDATE SET
      metric_value = EXCLUDED.metric_value,
      calculated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer automatiquement les métriques d'engagement
CREATE OR REPLACE FUNCTION public.trigger_calculate_engagement_metrics()
RETURNS trigger AS $$
BEGIN
  -- Calculer les métriques pour la journée en cours
  PERFORM public.calculate_daily_engagement_metrics(CURRENT_DATE);

  -- Calculer aussi pour la veille (au cas où c'est la première action de la journée)
  PERFORM public.calculate_daily_engagement_metrics(CURRENT_DATE - interval '1 day');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur activity_logs
DROP TRIGGER IF EXISTS trigger_engagement_metrics ON public.activity_logs;
CREATE TRIGGER trigger_engagement_metrics
  AFTER INSERT ON public.activity_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calculate_engagement_metrics();