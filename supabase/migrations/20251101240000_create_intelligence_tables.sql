-- Nouvelles tables Supabase pour Intelligence Avancée

-- Historique toutes actions (pour ML)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID, -- Peut être NULL pour utilisateurs sans ferme
  action_type VARCHAR(100) NOT NULL,
  context JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  outcome VARCHAR(50), -- 'success', 'error', 'cancelled', etc.
  session_id UUID, -- Pour grouper les actions d'une session
  device_info JSONB DEFAULT '{}',
  location_data JSONB DEFAULT '{}'
);

-- Index pour optimiser les requêtes ML
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX idx_activity_logs_user_timestamp ON activity_logs(user_id, timestamp DESC);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_outcome ON activity_logs(outcome);

-- Prédictions et résultats (feedback loop)
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(100) NOT NULL, -- 'health_risk', 'growth_prediction', 'stock_alert', etc.
  target_entity UUID NOT NULL, -- ID du lot, produit, etc.
  entity_type VARCHAR(50) NOT NULL, -- 'lot', 'product', 'farm', etc.
  predicted_value JSONB NOT NULL,
  actual_value JSONB,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  accuracy FLOAT CHECK (accuracy >= 0 AND accuracy <= 1),
  feedback_provided BOOLEAN DEFAULT FALSE,
  user_feedback JSONB DEFAULT '{}', -- 👍/👎 + commentaires
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  model_version VARCHAR(50)
);

-- Index pour les prédictions
CREATE INDEX idx_predictions_type_entity ON predictions(type, target_entity);
CREATE INDEX idx_predictions_accuracy ON predictions(accuracy);
CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC);

-- Alertes et actions (mesure efficacité)
CREATE TABLE IF NOT EXISTS alerts_effectiveness (
  alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  action_taken BOOLEAN DEFAULT FALSE,
  action_type VARCHAR(100), -- 'viewed', 'dismissed', 'acted_upon', etc.
  time_to_action INTERVAL,
  outcome JSONB DEFAULT '{}', -- Résultat de l'action
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acted_at TIMESTAMPTZ
);

-- Index pour mesurer l'efficacité
CREATE INDEX idx_alerts_effectiveness_user ON alerts_effectiveness(user_id);
CREATE INDEX idx_alerts_effectiveness_type ON alerts_effectiveness(alert_type);
CREATE INDEX idx_alerts_effectiveness_action ON alerts_effectiveness(action_taken);

-- Modèles ML versionnés
CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_type VARCHAR(100) NOT NULL, -- 'health_predictor', 'growth_forecaster', etc.
  version INTEGER NOT NULL,
  parameters JSONB NOT NULL,
  performance_metrics JSONB NOT NULL,
  training_data_stats JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_type, version)
);

-- Index pour les modèles
CREATE INDEX idx_ml_models_type_active ON ml_models(model_type, active);
CREATE INDEX idx_ml_models_version ON ml_models(version DESC);

-- Table pour les métriques d'engagement utilisateur
CREATE TABLE IF NOT EXISTS user_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type VARCHAR(100) NOT NULL, -- 'session_duration', 'feature_usage', 'conversion_rate', etc.
  metric_value JSONB NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les métriques
CREATE INDEX idx_user_engagement_user_period ON user_engagement_metrics(user_id, period_start, period_end);

-- Politiques RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- Politiques pour activity_logs
CREATE POLICY "Users can view their own activity logs" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Politiques pour predictions
CREATE POLICY "Users can view predictions for their entities" ON predictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lots WHERE id = target_entity AND user_id = auth.uid()
      UNION
      SELECT 1 FROM marketplace_products WHERE id = target_entity AND seller_id = auth.uid()
    )
  );

-- Politiques pour alerts_effectiveness
CREATE POLICY "Users can view their own alerts" ON alerts_effectiveness
  FOR SELECT USING (auth.uid() = user_id);

-- Politiques pour user_engagement_metrics
CREATE POLICY "Users can view their own metrics" ON user_engagement_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Commentaires pour documentation
COMMENT ON TABLE activity_logs IS 'Historique complet des actions utilisateur pour entraînement ML';
COMMENT ON TABLE predictions IS 'Prédictions IA avec feedback utilisateur pour amélioration continue';
COMMENT ON TABLE alerts_effectiveness IS 'Mesure de l''efficacité des alertes et recommandations';
COMMENT ON TABLE ml_models IS 'Versioning des modèles de ML avec métriques de performance';
COMMENT ON TABLE user_engagement_metrics IS 'Métriques d''engagement et d''utilisation des fonctionnalités';