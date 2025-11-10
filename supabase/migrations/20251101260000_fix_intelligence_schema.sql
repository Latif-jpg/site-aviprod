-- Correction du schéma intelligence - colonne "timestamp" vs "created_at"

-- Vérifier et corriger la table activity_logs
DO $$
BEGIN
    -- Si la colonne "timestamp" n'existe pas mais "created_at" existe, on renomme
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activity_logs' AND column_name = 'timestamp'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activity_logs' AND column_name = 'created_at'
    ) THEN
        -- La colonne s'appelle "created_at", pas "timestamp"
        -- Les index utilisent déjà "created_at", c'est correct
        NULL;
    END IF;
END $$;

-- S'assurer que les colonnes existent avec les bons noms
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS session_id uuid,
ADD COLUMN IF NOT EXISTS device_info jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS location_data jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS duration_ms integer,
ADD COLUMN IF NOT EXISTS performance_score numeric;

-- Créer les index manquants (en utilisant les bons noms de colonnes)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created_at ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_outcome ON activity_logs(outcome);

-- S'assurer que les autres tables ont les bonnes colonnes
ALTER TABLE public.predictions
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
ADD COLUMN IF NOT EXISTS model_version varchar(50);

ALTER TABLE public.alerts_effectiveness
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS acted_at timestamptz;

ALTER TABLE public.ml_models
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS deployed_at timestamptz,
ADD COLUMN IF NOT EXISTS retired_at timestamptz;

ALTER TABLE public.user_engagement_metrics
ADD COLUMN IF NOT EXISTS calculated_at timestamptz DEFAULT NOW();

-- Créer les index pour les autres tables
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_effectiveness_created_at ON alerts_effectiveness(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_models_created_at ON ml_models(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_engagement_calculated_at ON user_engagement_metrics(calculated_at DESC);

-- Fonction pour calculer les métriques d'engagement quotidiennes (corrigée)
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
    WHERE created_at >= day_start AND created_at < day_end
  LOOP
    -- Calculer les métriques d'engagement
    SELECT jsonb_build_object(
      'session_duration', EXTRACT(epoch FROM (MAX(created_at) - MIN(created_at))),
      'actions_count', COUNT(*),
      'feature_usage_rate', COUNT(DISTINCT context->>'feature')::float / GREATEST(COUNT(*), 1),
      'most_used_feature', (
        SELECT context->>'feature'
        FROM public.activity_logs
        WHERE user_id = user_record.user_id
          AND created_at >= day_start AND created_at < day_end
        GROUP BY context->>'feature'
        ORDER BY COUNT(*) DESC
        LIMIT 1
      )
    ) INTO engagement_data
    FROM public.activity_logs
    WHERE user_id = user_record.user_id
      AND created_at >= day_start AND created_at < day_end;

    -- Insérer ou mettre à jour les métriques
    INSERT INTO public.user_engagement_metrics (user_id, metric_type, metric_value, period_start, period_end)
    VALUES (user_record.user_id, 'daily_engagement', engagement_data, day_start, day_end)
    ON CONFLICT (user_id, metric_type, period_start, period_end) DO UPDATE SET
      metric_value = EXCLUDED.metric_value,
      calculated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer automatiquement les métriques d'engagement (corrigé)
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

-- Créer le trigger sur activity_logs (re-créer si nécessaire)
DROP TRIGGER IF EXISTS trigger_engagement_metrics ON public.activity_logs;
CREATE TRIGGER trigger_engagement_metrics
  AFTER INSERT ON public.activity_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calculate_engagement_metrics();

-- Vue pour les métriques d'engagement agrégées (corrigée)
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

-- Insertion de données initiales pour les modèles ML (si pas déjà présentes)
INSERT INTO public.ml_models (model_type, version, parameters, performance_metrics, active)
VALUES
  ('health_predictor', 1, '{"algorithm": "random_forest", "features": ["mortality_rate", "symptoms_count", "feed_consumption"]}', '{"accuracy": 0.85, "precision": 0.82, "recall": 0.88}', true),
  ('growth_forecaster', 1, '{"algorithm": "linear_regression", "features": ["age", "feed_quality", "health_score"]}', '{"r2_score": 0.91, "mae": 0.15}', true),
  ('stock_optimizer', 1, '{"algorithm": "time_series", "features": ["consumption_history", "seasonal_patterns"]}', '{"accuracy": 0.78, "error_rate": 0.12}', true)
ON CONFLICT (model_type, version) DO NOTHING;