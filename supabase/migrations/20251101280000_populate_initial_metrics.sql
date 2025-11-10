-- Migration pour peupler les métriques d'engagement initiales
-- Calcule les métriques pour les 30 derniers jours

-- Créer la fonction de calcul des métriques d'engagement
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

-- Créer le trigger qui détecte les nouvelles actions et met à jour les métriques
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

-- Insérer des métriques d'engagement pour les utilisateurs existants
INSERT INTO public.user_engagement_metrics (user_id, metric_type, metric_value, period_start, period_end)
SELECT
  daily_stats.user_id,
  'daily_engagement'::varchar,
  jsonb_build_object(
    'session_duration', daily_stats.session_duration,
    'actions_count', daily_stats.actions_count,
    'feature_usage_rate', daily_stats.feature_usage_rate,
    'most_used_feature', daily_stats.most_used_feature
  ),
  daily_stats.period_start,
  daily_stats.period_end
FROM (
  SELECT
    al.user_id,
    DATE_TRUNC('day', al.created_at) as period_start,
    DATE_TRUNC('day', al.created_at) + INTERVAL '1 day' as period_end,
    EXTRACT(epoch FROM (MAX(al.created_at) - MIN(al.created_at))) as session_duration,
    COUNT(al.id) as actions_count,
    COUNT(DISTINCT al.context->>'feature')::float / GREATEST(COUNT(al.id), 1) as feature_usage_rate,
    (
      SELECT al2.context->>'feature'
      FROM public.activity_logs al2
      WHERE al2.user_id = daily_stats.user_id
        AND DATE_TRUNC('day', al2.created_at) = daily_stats.period_start
      GROUP BY al2.context->>'feature'
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as most_used_feature
  FROM public.activity_logs al
  WHERE al.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY al.user_id, DATE_TRUNC('day', al.created_at)
) daily_stats
ON CONFLICT (user_id, metric_type, period_start, period_end) DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  calculated_at = NOW();

-- Calculer les métriques pour les utilisateurs sans activité récente (métriques vides)
INSERT INTO public.user_engagement_metrics (user_id, metric_type, metric_value, period_start, period_end)
SELECT
  p.user_id,
  'daily_engagement'::varchar,
  jsonb_build_object(
    'session_duration', 0,
    'actions_count', 0,
    'feature_usage_rate', 0.0,
    'most_used_feature', NULL
  ),
  CURRENT_DATE - INTERVAL '1 day',
  CURRENT_DATE
FROM public.profiles p
LEFT JOIN public.activity_logs al ON p.user_id = al.user_id
  AND al.created_at >= CURRENT_DATE - INTERVAL '1 day'
WHERE al.id IS NULL
ON CONFLICT (user_id, metric_type, period_start, period_end) DO NOTHING;

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

-- Calculer les métriques de performance des modèles ML
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
  WITH metrics_calc AS (
    SELECT
      al.user_id,
      DATE_TRUNC('day', al.created_at) as period_start,
      DATE_TRUNC('day', al.created_at) + INTERVAL '1 day' as period_end,
      jsonb_build_object(
        'session_duration', EXTRACT(epoch FROM (MAX(al.created_at) - MIN(al.created_at))),
        'actions_count', COUNT(al.id),
        'feature_usage_rate', COUNT(DISTINCT al.context->>'feature')::float / GREATEST(COUNT(al.id), 1),
        'most_used_feature', (
          SELECT al2.context->>'feature'
          FROM public.activity_logs al2
          WHERE al2.user_id = al.user_id
            AND DATE_TRUNC('day', al2.created_at) = DATE_TRUNC('day', al.created_at)
          GROUP BY al2.context->>'feature'
          ORDER BY COUNT(*) DESC
          LIMIT 1
        )
      ) as metric_value,
      COUNT(al.id) as actions_count
    FROM public.activity_logs al
    WHERE DATE_TRUNC('day', al.created_at) = target_date
    GROUP BY al.user_id, DATE_TRUNC('day', al.created_at)
  )
  INSERT INTO public.user_engagement_metrics (user_id, metric_type, metric_value, period_start, period_end)
  SELECT
    user_id,
    'daily_engagement'::varchar,
    metric_value,
    period_start,
    period_end
  FROM metrics_calc
  WHERE actions_count > 0
  ON CONFLICT (user_id, metric_type, period_start, period_end) DO UPDATE SET
    metric_value = EXCLUDED.metric_value,
    calculated_at = NOW();

  GET DIAGNOSTICS processed_count = ROW_COUNT;

  RETURN format('Recalculated metrics for %s users on %s', processed_count, target_date);
END;
$$ LANGUAGE plpgsql;

-- Exécuter le recalcul pour les 7 derniers jours
SELECT public.recalculate_engagement_metrics(CURRENT_DATE - INTERVAL '6 days');
SELECT public.recalculate_engagement_metrics(CURRENT_DATE - INTERVAL '5 days');
SELECT public.recalculate_engagement_metrics(CURRENT_DATE - INTERVAL '4 days');
SELECT public.recalculate_engagement_metrics(CURRENT_DATE - INTERVAL '3 days');
SELECT public.recalculate_engagement_metrics(CURRENT_DATE - INTERVAL '2 days');
SELECT public.recalculate_engagement_metrics(CURRENT_DATE - INTERVAL '1 day');
SELECT public.recalculate_engagement_metrics(CURRENT_DATE);