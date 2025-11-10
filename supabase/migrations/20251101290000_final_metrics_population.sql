-- Migration finale pour peupler les métriques - seulement les données
-- Les tables existent déjà, on ne fait que les remplir

-- Calculer et insérer les métriques d'engagement pour les 7 derniers jours
DO $$
DECLARE
  target_date DATE;
  i INTEGER;
BEGIN
  -- Pour chaque jour des 7 derniers jours
  FOR i IN 0..6 LOOP
    target_date := CURRENT_DATE - INTERVAL '1 day' * i;

    -- Calculer les métriques pour ce jour
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

-- Peupler predictions avec des données existantes si elles existent
-- (Cette partie dépend des données existantes dans ai_recommendations)

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

-- Créer une fonction pour recalculer les métriques manuellement si nécessaire
CREATE OR REPLACE FUNCTION public.recalculate_engagement_metrics(target_date date DEFAULT CURRENT_DATE)
RETURNS text AS $$
DECLARE
  processed_count integer := 0;
BEGIN
  -- Recalculer pour la date donnée
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

  GET DIAGNOSTICS processed_count = ROW_COUNT;

  RETURN format('Recalculated metrics for %s users on %s', processed_count, target_date);
END;
$$ LANGUAGE plpgsql;

-- Afficher un résumé des données insérées
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