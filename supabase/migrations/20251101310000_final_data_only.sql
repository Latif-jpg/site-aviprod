-- Migration finale - seulement les données et contraintes

-- Ajouter la contrainte unique si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'user_engagement_metrics'
        AND constraint_name = 'user_engagement_metrics_unique_key'
    ) THEN
        ALTER TABLE public.user_engagement_metrics
        ADD CONSTRAINT user_engagement_metrics_unique_key
        UNIQUE (user_id, metric_type, period_start, period_end);
    END IF;
END $$;

-- Calculer et insérer les métriques d'engagement pour aujourd'hui et hier
DO $$
DECLARE
  target_date DATE;
  i INTEGER;
BEGIN
  -- Pour les 2 derniers jours
  FOR i IN 0..1 LOOP
    target_date := CURRENT_DATE - INTERVAL '1 day' * i;

    INSERT INTO public.user_engagement_metrics (user_id, metric_type, metric_value, period_start, period_end)
    SELECT
      al.user_id,
      'daily_engagement'::varchar,
      jsonb_build_object(
        'session_duration', EXTRACT(epoch FROM (MAX(al.created_at) - MIN(al.created_at))),
        'actions_count', COUNT(al.id),
        'feature_usage_rate', COUNT(DISTINCT al.context->>'feature')::float / GREATEST(COUNT(al.id), 1),
        'most_used_feature', (
          SELECT al2.context->>'feature'
          FROM public.activity_logs al2
          WHERE al2.user_id = al.user_id
            AND DATE_TRUNC('day', al2.created_at) = target_date
          GROUP BY al2.context->>'feature'
          ORDER BY COUNT(*) DESC
          LIMIT 1
        )
      ),
      target_date,
      target_date + INTERVAL '1 day'
    FROM public.activity_logs al
    WHERE DATE_TRUNC('day', al.created_at) = target_date
    GROUP BY al.user_id
    HAVING COUNT(al.id) > 0
    ON CONFLICT (user_id, metric_type, period_start, period_end) DO UPDATE SET
      metric_value = EXCLUDED.metric_value,
      calculated_at = NOW();

    RAISE NOTICE 'Processed metrics for date: %', target_date;
  END LOOP;
END $$;

-- Peupler alerts_effectiveness avec des données existantes
INSERT INTO public.alerts_effectiveness (
  alert_id, user_id, alert_type, severity, title, message,
  action_taken, time_to_action, outcome, created_at, acted_at
)
SELECT
  a.id,
  a.user_id,
  a.alert_type,
  a.severity,
  a.title,
  a.message,
  CASE WHEN a.action_taken_at IS NOT NULL THEN true ELSE false END,
  CASE WHEN a.action_taken_at IS NOT NULL THEN a.action_taken_at - a.created_at ELSE NULL END,
  jsonb_build_object(
    'action_taken', a.action_taken,
    'status', a.status,
    'user_feedback', a.user_feedback
  ),
  a.created_at,
  a.action_taken_at
FROM public.alerts a
WHERE a.status IN ('resolved', 'dismissed', 'viewed')
  AND NOT EXISTS (
    SELECT 1 FROM public.alerts_effectiveness ae WHERE ae.alert_id = a.id
  );

-- S'assurer que les modèles ML sont présents
INSERT INTO public.ml_models (model_type, version, parameters, performance_metrics, active)
VALUES
  ('health_predictor', 1,
   '{"algorithm": "random_forest", "features": ["mortality_rate", "symptoms_count", "feed_consumption"]}',
   '{"accuracy": 0.85, "precision": 0.82, "recall": 0.88}',
   true),
  ('growth_forecaster', 1,
   '{"algorithm": "linear_regression", "features": ["age", "feed_quality", "health_score"]}',
   '{"r2_score": 0.91, "mae": 0.15}',
   true),
  ('stock_optimizer', 1,
   '{"algorithm": "time_series", "features": ["consumption_history", "seasonal_patterns"]}',
   '{"accuracy": 0.78, "error_rate": 0.12}',
   true)
ON CONFLICT (model_type, version) DO NOTHING;

-- Créer les fonctions si elles n'existent pas
CREATE OR REPLACE FUNCTION public.calculate_daily_engagement_metrics(target_date date DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  day_start timestamptz := target_date::timestamptz;
  day_end timestamptz := (target_date + interval '1 day')::timestamptz;
  user_record record;
  engagement_data jsonb;
BEGIN
  -- Pour chaque utilisateur actif ce jour-là
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

-- Créer le trigger s'il n'existe pas
DROP TRIGGER IF EXISTS trigger_engagement_metrics ON public.activity_logs;
CREATE TRIGGER trigger_engagement_metrics
  AFTER INSERT ON public.activity_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calculate_engagement_metrics();

-- Afficher un résumé
DO $$
DECLARE
  metrics_count integer;
  alerts_count integer;
  models_count integer;
BEGIN
  SELECT COUNT(*) INTO metrics_count FROM public.user_engagement_metrics;
  SELECT COUNT(*) INTO alerts_count FROM public.alerts_effectiveness;
  SELECT COUNT(*) INTO models_count FROM public.ml_models;

  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'User engagement metrics: %', metrics_count;
  RAISE NOTICE 'Alerts effectiveness records: %', alerts_count;
  RAISE NOTICE 'ML models: %', models_count;
END $$;