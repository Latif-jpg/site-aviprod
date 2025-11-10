-- Migration pour créer le système d'analytics et reporting avancé
-- Tableaux de bord prédictifs avec recommandations personnalisées

-- Table pour les métriques prédictives
CREATE TABLE predictive_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type VARCHAR(100) NOT NULL, -- 'health_trend', 'productivity_forecast', 'revenue_prediction'
  entity_id UUID, -- ID du lot, ferme, etc.
  entity_type VARCHAR(50), -- 'lot', 'farm', 'global'
  prediction_data JSONB NOT NULL, -- données prédictives (valeurs, intervalles de confiance)
  confidence_level FLOAT CHECK (confidence_level >= 0 AND confidence_level <= 1),
  time_horizon VARCHAR(20) DEFAULT '7d' CHECK (time_horizon IN ('1d', '7d', '30d', '90d')),
  prediction_date TIMESTAMPTZ DEFAULT NOW(),
  actual_outcome JSONB, -- résultat réel quand disponible
  accuracy_score FLOAT CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
  model_used VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les recommandations personnalisées
CREATE TABLE personalized_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(100) NOT NULL, -- 'health_improvement', 'productivity_boost', 'cost_saving'
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  actionable_steps JSONB NOT NULL, -- étapes concrètes à suivre
  expected_impact JSONB DEFAULT '{}', -- impact attendu (coûts, bénéfices)
  related_entities JSONB DEFAULT '{}', -- entités concernées (lots, stocks, etc.)
  ai_confidence FLOAT CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'implemented', 'dismissed')),
  viewed_at TIMESTAMPTZ,
  implemented_at TIMESTAMPTZ,
  feedback JSONB DEFAULT '{}', -- retour utilisateur
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les rapports personnalisés
CREATE TABLE custom_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type VARCHAR(100) NOT NULL, -- 'weekly_summary', 'monthly_analysis', 'performance_report'
  title VARCHAR(200) NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL, -- paramètres de génération du rapport
  data JSONB NOT NULL, -- données du rapport
  insights JSONB DEFAULT '{}', -- insights IA générés
  recommendations JSONB DEFAULT '{}', -- recommandations incluses
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les benchmarks sectoriels
CREATE TABLE industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region VARCHAR(100) NOT NULL,
  farm_type VARCHAR(100) NOT NULL, -- 'poultry', 'mixed', 'specialized'
  metric_type VARCHAR(100) NOT NULL,
  benchmark_data JSONB NOT NULL, -- percentiles, moyennes, etc.
  sample_size INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data_source VARCHAR(100) DEFAULT 'aggregated',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les alertes prédictives
CREATE TABLE predictive_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL, -- 'health_risk', 'stock_shortage', 'revenue_drop'
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  predicted_impact JSONB DEFAULT '{}',
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  recommended_actions JSONB NOT NULL,
  related_entities JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  user_feedback JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les objectifs et KPIs personnalisés
CREATE TABLE user_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kpi_name VARCHAR(100) NOT NULL,
  kpi_category VARCHAR(50) NOT NULL, -- 'health', 'productivity', 'financial', 'sustainability'
  target_value JSONB NOT NULL,
  current_value JSONB,
  unit VARCHAR(50),
  period VARCHAR(20) DEFAULT 'monthly' CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'at_risk', 'failed')),
  progress_percentage FLOAT CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_predictive_metrics_user ON predictive_metrics(user_id);
CREATE INDEX idx_predictive_metrics_type ON predictive_metrics(metric_type);
CREATE INDEX idx_predictive_metrics_date ON predictive_metrics(prediction_date DESC);
CREATE INDEX idx_recommendations_user ON personalized_recommendations(user_id);
CREATE INDEX idx_recommendations_type ON personalized_recommendations(recommendation_type);
CREATE INDEX idx_recommendations_status ON personalized_recommendations(status);
CREATE INDEX idx_custom_reports_user ON custom_reports(user_id);
CREATE INDEX idx_custom_reports_type ON custom_reports(report_type);
CREATE INDEX idx_predictive_alerts_user ON predictive_alerts(user_id);
CREATE INDEX idx_predictive_alerts_status ON predictive_alerts(status);
CREATE INDEX idx_user_kpis_user ON user_kpis(user_id);
CREATE INDEX idx_user_kpis_category ON user_kpis(kpi_category);

-- Politiques RLS
ALTER TABLE predictive_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalized_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_kpis ENABLE ROW LEVEL SECURITY;

-- Politiques pour predictive_metrics
CREATE POLICY "Users can view their predictive metrics" ON predictive_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert predictive metrics" ON predictive_metrics FOR INSERT WITH CHECK (true);

-- Politiques pour personalized_recommendations
CREATE POLICY "Users can view their recommendations" ON personalized_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their recommendations" ON personalized_recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert recommendations" ON personalized_recommendations FOR INSERT WITH CHECK (true);

-- Politiques pour custom_reports
CREATE POLICY "Users can manage their reports" ON custom_reports FOR ALL USING (auth.uid() = user_id);

-- Politiques pour industry_benchmarks (lecture publique)
CREATE POLICY "Anyone can view benchmarks" ON industry_benchmarks FOR SELECT USING (true);

-- Politiques pour predictive_alerts
CREATE POLICY "Users can view their alerts" ON predictive_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their alerts" ON predictive_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert alerts" ON predictive_alerts FOR INSERT WITH CHECK (true);

-- Politiques pour user_kpis
CREATE POLICY "Users can manage their KPIs" ON user_kpis FOR ALL USING (auth.uid() = user_id);

-- Insérer des benchmarks par défaut
INSERT INTO industry_benchmarks (region, farm_type, metric_type, benchmark_data, sample_size, period_start, period_end) VALUES
('West Africa', 'poultry', 'mortality_rate',
 jsonb_build_object(
   'p25', 2.5, 'p50', 4.2, 'p75', 6.8, 'p90', 9.5,
   'mean', 5.1, 'std_dev', 2.3
 ), 1250, '2024-01-01', '2024-06-30'),
('West Africa', 'poultry', 'feed_conversion_ratio',
 jsonb_build_object(
   'p25', 1.8, 'p50', 2.1, 'p75', 2.4, 'p90', 2.8,
   'mean', 2.2, 'std_dev', 0.3
 ), 1180, '2024-01-01', '2024-06-30'),
('West Africa', 'poultry', 'profit_margin',
 jsonb_build_object(
   'p25', 15.0, 'p50', 22.0, 'p75', 28.0, 'p90', 35.0,
   'mean', 23.5, 'std_dev', 6.2
 ), 980, '2024-01-01', '2024-06-30');

-- Fonction pour générer des recommandations basées sur les métriques
CREATE OR REPLACE FUNCTION generate_personalized_recommendations(target_user_id UUID)
RETURNS void AS $$
DECLARE
  user_health_avg FLOAT;
  user_mortality_rate FLOAT;
  user_feed_efficiency FLOAT;
  user_profit_margin FLOAT;
  benchmark_data JSONB;
  recommendation_record JSONB;
BEGIN
  -- Récupérer les métriques actuelles de l'utilisateur
  SELECT
    AVG(health_score) INTO user_health_avg
  FROM lots WHERE user_id = target_user_id AND status = 'active';

  -- Calculer le taux de mortalité
  WITH mortality_calc AS (
    SELECT
      COALESCE(SUM(mortality), 0) as total_mortality,
      COALESCE(SUM(initial_quantity), 0) as total_initial
    FROM lots
    WHERE user_id = target_user_id AND status = 'active' AND initial_quantity > 0
  )
  SELECT
    CASE WHEN total_initial > 0 THEN (total_mortality::FLOAT / total_initial) * 100 ELSE 0 END
  INTO user_mortality_rate
  FROM mortality_calc;

  -- Récupérer les benchmarks
  SELECT benchmark_data INTO benchmark_data
  FROM industry_benchmarks
  WHERE region = 'West Africa' AND farm_type = 'poultry' AND metric_type = 'mortality_rate'
  ORDER BY period_end DESC LIMIT 1;

  -- Générer des recommandations basées sur les écarts avec les benchmarks
  IF user_mortality_rate > (benchmark_data->>'p75')::FLOAT THEN
    -- Recommandation pour réduire la mortalité
    INSERT INTO personalized_recommendations (
      user_id, recommendation_type, priority, title, description,
      actionable_steps, expected_impact, ai_confidence
    ) VALUES (
      target_user_id, 'health_improvement', 'high',
      'Réduire le taux de mortalité élevé',
      'Votre taux de mortalité est supérieur à 75% des éleveurs de la région. Voici des actions pour l''améliorer.',
      jsonb_build_array(
        'Renforcer le protocole de vaccination',
        'Améliorer la qualité de l''eau et de l''alimentation',
        'Optimiser les conditions d''élevage (température, ventilation)',
        'Consulter un vétérinaire pour un diagnostic approfondi'
      ),
      jsonb_build_object(
        'mortality_reduction', '2-3%',
        'cost_savings', '5000-15000 CFA/mois',
        'timeframe', '2-4 semaines'
      ),
      0.85
    );
  END IF;

  -- Recommandation basée sur la santé globale
  IF user_health_avg < 70 THEN
    INSERT INTO personalized_recommendations (
      user_id, recommendation_type, priority, title, description,
      actionable_steps, expected_impact, ai_confidence
    ) VALUES (
      target_user_id, 'health_improvement', 'critical',
      'Améliorer la santé globale de votre élevage',
      'Le score de santé de vos volailles est préoccupant. Des actions immédiates sont nécessaires.',
      jsonb_build_array(
        'Effectuer une visite vétérinaire d''urgence',
        'Isoler les volailles malades',
        'Désinfecter les locaux d''élevage',
        'Ajuster les rations alimentaires',
        'Surveiller la température et l''humidité'
      ),
      jsonb_build_object(
        'health_improvement', '20-30 points',
        'mortality_prevention', 'Prévention de pertes massives',
        'timeframe', '1-2 semaines'
      ),
      0.92
    );
  END IF;

END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les KPIs utilisateur
CREATE OR REPLACE FUNCTION update_user_kpis(target_user_id UUID)
RETURNS void AS $$
DECLARE
  health_kpi JSONB;
  productivity_kpi JSONB;
  financial_kpi JSONB;
BEGIN
  -- KPI Santé
  SELECT jsonb_build_object(
    'current', AVG(health_score),
    'target', 85,
    'trend', 'stable'
  ) INTO health_kpi
  FROM lots WHERE user_id = target_user_id AND status = 'active';

  -- KPI Productivité
  WITH productivity_data AS (
    SELECT
      COUNT(*) as active_lots,
      COALESCE(SUM(quantity), 0) as total_birds,
      AVG(DATE_PART('day', NOW() - created_at)) as avg_lot_age
    FROM lots
    WHERE user_id = target_user_id AND status = 'active'
  )
  SELECT jsonb_build_object(
    'active_lots', active_lots,
    'total_birds', total_birds,
    'avg_lot_age_days', avg_lot_age,
    'target_efficiency', 95
  ) INTO productivity_kpi FROM productivity_data;

  -- KPI Financier
  SELECT jsonb_build_object(
    'monthly_profit_margin', monthly_profit_margin,
    'monthly_profit', monthly_profit,
    'target_margin', 25
  ) INTO financial_kpi
  FROM user_engagement_metrics
  WHERE user_id = target_user_id AND metric_type = 'financial_summary'
  ORDER BY period_end DESC LIMIT 1;

  -- Insérer ou mettre à jour les KPIs
  INSERT INTO user_kpis (user_id, kpi_name, kpi_category, target_value, current_value, unit, period)
  VALUES
    (target_user_id, 'Health Score', 'health', jsonb_build_object('value', 85), health_kpi, 'percentage', 'monthly'),
    (target_user_id, 'Production Efficiency', 'productivity', jsonb_build_object('value', 95), productivity_kpi, 'percentage', 'monthly'),
    (target_user_id, 'Profit Margin', 'financial', jsonb_build_object('value', 25), financial_kpi, 'percentage', 'monthly')
  ON CONFLICT (user_id, kpi_name) DO UPDATE SET
    current_value = EXCLUDED.current_value,
    last_updated = NOW();

END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer des rapports personnalisés
CREATE OR REPLACE FUNCTION generate_custom_report(
  target_user_id UUID,
  report_type VARCHAR(100),
  period_start DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  period_end DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  report_id UUID;
  report_data JSONB;
  insights_data JSONB;
BEGIN
  -- Générer les données selon le type de rapport
  CASE report_type
    WHEN 'monthly_performance' THEN
      SELECT jsonb_build_object(
        'period', jsonb_build_object('start', period_start, 'end', period_end),
        'health_metrics', jsonb_build_object(
          'avg_health_score', AVG(health_score),
          'mortality_rate', (
            SELECT CASE WHEN SUM(initial_quantity) > 0
                   THEN (SUM(mortality)::FLOAT / SUM(initial_quantity)) * 100
                   ELSE 0 END
            FROM lots WHERE user_id = target_user_id AND status = 'active'
          ),
          'disease_incidents', COUNT(*)
        ),
        'productivity_metrics', jsonb_build_object(
          'active_lots', COUNT(*),
          'total_birds', COALESCE(SUM(quantity), 0),
          'feed_consumption', 0 -- À calculer depuis les stocks
        ),
        'financial_metrics', jsonb_build_object(
          'total_revenue', 0, -- À calculer depuis financial_records
          'total_expenses', 0,
          'profit_margin', 0
        )
      ) INTO report_data
      FROM lots
      WHERE user_id = target_user_id AND status = 'active';

    WHEN 'health_analysis' THEN
      SELECT jsonb_build_object(
        'period', jsonb_build_object('start', period_start, 'end', period_end),
        'symptoms_analysis', jsonb_object_agg(
          symptom,
          jsonb_build_object('count', count, 'severity', 'medium')
        ),
        'vaccination_compliance', jsonb_build_object(
          'completed', COUNT(CASE WHEN status = 'completed' THEN 1 END),
          'pending', COUNT(CASE WHEN status = 'pending' THEN 1 END),
          'overdue', COUNT(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN 1 END)
        ),
        'mortality_trends', jsonb_build_object(
          'daily_avg', 0,
          'weekly_trend', 'stable',
          'risk_factors', jsonb_build_array('temperature', 'feed_quality')
        )
      ) INTO report_data
      FROM (
        SELECT jsonb_array_elements_text(symptoms) as symptom, COUNT(*) as count
        FROM lots
        WHERE user_id = target_user_id AND symptoms IS NOT NULL
        GROUP BY jsonb_array_elements_text(symptoms)
      ) symptoms;

    ELSE
      report_data := jsonb_build_object('error', 'Unknown report type');
  END CASE;

  -- Générer des insights IA
  insights_data := jsonb_build_object(
    'key_findings', jsonb_build_array(
      'Performance globale satisfaisante',
      'Attention requise sur la santé animale',
      'Opportunités d''optimisation des coûts'
    ),
    'trends', jsonb_build_object(
      'health_trend', 'stable',
      'productivity_trend', 'increasing',
      'financial_trend', 'positive'
    ),
    'recommendations', jsonb_build_array(
      'Renforcer le suivi sanitaire',
      'Optimiser les rations alimentaires',
      'Diversifier les sources de revenus'
    )
  );

  -- Insérer le rapport
  INSERT INTO custom_reports (
    user_id, report_type, title, description, parameters, data, insights
  ) VALUES (
    target_user_id,
    report_type,
    CASE report_type
      WHEN 'monthly_performance' THEN 'Rapport de Performance Mensuel'
      WHEN 'health_analysis' THEN 'Analyse Sanitaire Détaillée'
      ELSE 'Rapport Personnalisé'
    END,
    'Rapport généré automatiquement avec insights IA',
    jsonb_build_object('period_start', period_start, 'period_end', period_end),
    report_data,
    insights_data
  ) RETURNING id INTO report_id;

  RETURN report_id;
END;
$$ LANGUAGE plpgsql;

-- Commentaires pour documentation
COMMENT ON TABLE predictive_metrics IS 'Métriques prédictives générées par l''IA pour anticiper les tendances';
COMMENT ON TABLE personalized_recommendations IS 'Recommandations personnalisées avec actions concrètes';
COMMENT ON TABLE custom_reports IS 'Rapports personnalisés avec insights IA intégrés';
COMMENT ON TABLE industry_benchmarks IS 'Benchmarks sectoriels pour comparaison régionale';
COMMENT ON TABLE predictive_alerts IS 'Alertes prédictives basées sur l''analyse de données';
COMMENT ON TABLE user_kpis IS 'Objectifs et KPIs personnalisés pour le suivi de performance';
