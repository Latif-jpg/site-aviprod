-- Création des tables manquantes pour le système d'intelligence

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

-- Politiques RLS pour les nouvelles tables
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- Politiques pour predictions
DROP POLICY IF EXISTS "Users can view predictions for their entities" ON public.predictions;
CREATE POLICY "Users can view predictions for their entities" ON public.predictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lots WHERE id = target_entity AND user_id = auth.uid()
      UNION
      SELECT 1 FROM marketplace_products WHERE id = target_entity AND seller_id = auth.uid()
    )
  );

-- Politiques pour alerts_effectiveness
DROP POLICY IF EXISTS "Users can view their own alerts effectiveness" ON public.alerts_effectiveness;
CREATE POLICY "Users can view their own alerts effectiveness" ON public.alerts_effectiveness
  FOR SELECT USING (auth.uid() = user_id);

-- Politiques pour user_engagement_metrics
DROP POLICY IF EXISTS "Users can view their own engagement metrics" ON public.user_engagement_metrics;
CREATE POLICY "Users can view their own engagement metrics" ON public.user_engagement_metrics
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own engagement metrics" ON public.user_engagement_metrics;
CREATE POLICY "Users can insert their own engagement metrics" ON public.user_engagement_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own engagement metrics" ON public.user_engagement_metrics;
CREATE POLICY "Users can update their own engagement metrics" ON public.user_engagement_metrics
  FOR UPDATE USING (auth.uid() = user_id);

-- Politiques pour ml_models (lecture seule pour tous les utilisateurs authentifiés)
DROP POLICY IF EXISTS "Authenticated users can view ML models" ON public.ml_models;
CREATE POLICY "Authenticated users can view ML models" ON public.ml_models
  FOR SELECT USING (auth.role() = 'authenticated');

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_predictions_type_entity ON predictions(type, target_entity);
CREATE INDEX IF NOT EXISTS idx_predictions_accuracy ON predictions(accuracy);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_effectiveness_user ON alerts_effectiveness(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_effectiveness_type ON alerts_effectiveness(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_effectiveness_action ON alerts_effectiveness(action_taken);

CREATE INDEX IF NOT EXISTS idx_ml_models_type_active ON ml_models(model_type, active);
CREATE INDEX IF NOT EXISTS idx_ml_models_version ON ml_models(version DESC);

CREATE INDEX IF NOT EXISTS idx_user_engagement_user_period ON user_engagement_metrics(user_id, period_start, period_end);

-- Commentaires pour documentation
COMMENT ON TABLE public.predictions IS 'Prédictions IA avec feedback utilisateur pour amélioration continue';
COMMENT ON TABLE public.alerts_effectiveness IS 'Mesure de l''efficacité des alertes et recommandations';
COMMENT ON TABLE public.ml_models IS 'Versioning des modèles de ML avec métriques de performance';
COMMENT ON TABLE public.user_engagement_metrics IS 'Métriques d''engagement et d''utilisation des fonctionnalités';