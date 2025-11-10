-- ============================================
-- SCHÉMA STOCK INTELLIGENT - AVIPROD
-- ============================================

-- ============================================
-- 1. TABLE : SUIVI CONSOMMATION PAR LOT
-- ============================================
CREATE TABLE IF NOT EXISTS stock_consumption_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES stock(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Date de consommation
  date DATE NOT NULL,

  -- Quantités
  quantity_consumed FLOAT NOT NULL,           -- Quantité réellement consommée
  quantity_planned FLOAT NOT NULL,            -- Quantité prévue théoriquement
  deviation_percent FLOAT,                    -- Écart en %

  -- Type d'entrée
  entry_type VARCHAR(20) DEFAULT 'manual' CHECK (entry_type IN ('automatic', 'manual')),

  -- Métadonnées
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte unicité par jour
  UNIQUE(lot_id, stock_item_id, date)
);

-- Index
CREATE INDEX idx_consumption_lot ON stock_consumption_tracking(lot_id);
CREATE INDEX idx_consumption_stock ON stock_consumption_tracking(stock_item_id);
CREATE INDEX idx_consumption_date ON stock_consumption_tracking(date DESC);
CREATE INDEX idx_consumption_farm ON stock_consumption_tracking(user_id);

COMMENT ON TABLE stock_consumption_tracking IS 'Suivi consommation alimentaire par lot avec écarts';


-- ============================================
-- 2. AJOUTER COLONNES À stock
-- ============================================

-- Ajouter relation avec lots
ALTER TABLE stock ADD COLUMN IF NOT EXISTS assigned_lots UUID[];

-- Ajouter prédictions
ALTER TABLE stock ADD COLUMN IF NOT EXISTS daily_consumption FLOAT DEFAULT 0;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS days_remaining FLOAT DEFAULT 0;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS recommended_order_date DATE;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS recommended_order_quantity FLOAT;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS last_prediction_update TIMESTAMPTZ;

COMMENT ON COLUMN stock.assigned_lots IS 'IDs des lots utilisant ce stock';
COMMENT ON COLUMN stock.daily_consumption IS 'Consommation quotidienne calculée';
COMMENT ON COLUMN stock.days_remaining IS 'Jours restants avant rupture';


-- ============================================
-- 3. TABLE : PRÉDICTIONS DE STOCK
-- ============================================
CREATE TABLE IF NOT EXISTS stock_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES stock(id) ON DELETE CASCADE,

  -- Prédiction
  prediction_date DATE NOT NULL,
  predicted_consumption FLOAT NOT NULL,
  predicted_remaining FLOAT NOT NULL,
  predicted_runout_date DATE,

  -- Réel (pour feedback loop)
  actual_consumption FLOAT,
  actual_remaining FLOAT,
  accuracy_score FLOAT,

  -- Métadonnées
  model_version VARCHAR(50) DEFAULT 'heuristic_v1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,

  UNIQUE(stock_item_id, prediction_date)
);

CREATE INDEX idx_predictions_stock ON stock_predictions(stock_item_id);
CREATE INDEX idx_predictions_date ON stock_predictions(prediction_date DESC);
CREATE INDEX idx_predictions_farm ON stock_predictions(user_id);

COMMENT ON TABLE stock_predictions IS 'Prédictions de stock avec feedback pour amélioration';


-- ============================================
-- 4. TABLE : LIENS LOT-STOCK
-- ============================================
CREATE TABLE IF NOT EXISTS lot_stock_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES stock(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Configuration
  feed_type VARCHAR(50),                      -- Type d'aliment (démarrage, croissance, etc.)
  daily_quantity_per_bird FLOAT,             -- Quantité par oiseau par jour (kg)
  is_active BOOLEAN DEFAULT TRUE,

  -- Dates
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,

  -- Contrainte unicité
  UNIQUE(lot_id, stock_item_id)
);

CREATE INDEX idx_lot_stock_lot ON lot_stock_assignments(lot_id);
CREATE INDEX idx_lot_stock_stock ON lot_stock_assignments(stock_item_id);
CREATE INDEX idx_lot_stock_active ON lot_stock_assignments(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE lot_stock_assignments IS 'Association lots-stocks avec configuration alimentaire';


-- ============================================
-- 5. VUES UTILES
-- ============================================

-- Vue : Consommation par lot (30 derniers jours)
CREATE OR REPLACE VIEW v_lot_consumption_summary AS
SELECT
  l.id as lot_id,
  l.name as lot_name,
  l.age,
  l.quantity,
  COUNT(sct.id) as tracking_days,
  AVG(sct.quantity_consumed) as avg_daily_consumption,
  AVG(sct.quantity_planned) as avg_planned_consumption,
  AVG(sct.deviation_percent) as avg_deviation,
  SUM(sct.quantity_consumed) as total_consumed_30d
FROM lots l
LEFT JOIN stock_consumption_tracking sct ON l.id = sct.lot_id
WHERE sct.date > NOW() - INTERVAL '30 days'
  AND l.status = 'active'
GROUP BY l.id, l.name, l.age, l.quantity;

-- Vue : État des stocks avec prédictions
CREATE OR REPLACE VIEW v_stock_health AS
SELECT
  si.*,
  si.quantity / NULLIF(si.daily_consumption, 0) as days_remaining_calc,
  CASE
    WHEN si.quantity = 0 THEN 'rupture'
    WHEN si.days_remaining < 3 THEN 'critique'
    WHEN si.days_remaining < 7 THEN 'urgent'
    WHEN si.days_remaining < 14 THEN 'attention'
    ELSE 'ok'
  END as stock_status,
  (SELECT COUNT(*) FROM lot_stock_assignments lsa
   WHERE lsa.stock_item_id = si.id AND lsa.is_active = TRUE) as active_lots_count
FROM stock si
WHERE si.category = 'feed';

-- Vue : Analyse écarts consommation
CREATE OR REPLACE VIEW v_consumption_accuracy AS
SELECT
  l.id as lot_id,
  l.name,
  si.name as stock_name,
  COUNT(*) as total_entries,
  AVG(sct.deviation_percent) as avg_deviation,
  STDDEV(sct.deviation_percent) as deviation_stddev,
  COUNT(*) FILTER (WHERE ABS(sct.deviation_percent) > 20) as high_deviation_count,
  COUNT(*) FILTER (WHERE sct.entry_type = 'automatic') as automatic_entries,
  COUNT(*) FILTER (WHERE sct.entry_type = 'manual') as manual_entries
FROM stock_consumption_tracking sct
JOIN lots l ON sct.lot_id = l.id
JOIN stock si ON sct.stock_item_id = si.id
WHERE sct.date > NOW() - INTERVAL '30 days'
GROUP BY l.id, l.name, si.name;


-- ============================================
-- 6. FONCTIONS UTILITAIRES
-- ============================================

-- Fonction : Calculer consommation théorique par lot
CREATE OR REPLACE FUNCTION calculate_theoretical_consumption(
  p_lot_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS FLOAT AS $$
DECLARE
  v_age INTEGER;
  v_quantity INTEGER;
  v_race VARCHAR;
  v_consumption_per_bird FLOAT;
  v_total_consumption FLOAT;
BEGIN
  -- Récupérer infos du lot
  SELECT age, quantity, name
  INTO v_age, v_quantity, v_race
  FROM lots
  WHERE id = p_lot_id;

  -- Déterminer consommation par oiseau selon âge
  -- (Simplifié - idéalement utiliser courbe de croissance)
  IF v_age < 7 THEN
    v_consumption_per_bird := 0.015;
  ELSIF v_age < 14 THEN
    v_consumption_per_bird := 0.035;
  ELSIF v_age < 21 THEN
    v_consumption_per_bird := 0.055;
  ELSIF v_age < 28 THEN
    v_consumption_per_bird := 0.080;
  ELSIF v_age < 35 THEN
    v_consumption_per_bird := 0.110;
  ELSIF v_age < 42 THEN
    v_consumption_per_bird := 0.130;
  ELSE
    v_consumption_per_bird := 0.140;
  END IF;

  -- Calculer total
  v_total_consumption := v_consumption_per_bird * v_quantity;

  RETURN v_total_consumption;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Mettre à jour prédictions stock
CREATE OR REPLACE FUNCTION update_stock_predictions()
RETURNS void AS $$
BEGIN
  -- Pour chaque stock d'feed actif
  UPDATE stock si
  SET
    daily_consumption = (
      SELECT COALESCE(SUM(calculate_theoretical_consumption(lsa.lot_id)), 0)
      FROM lot_stock_assignments lsa
      WHERE lsa.stock_item_id = si.id
        AND lsa.is_active = TRUE
    ),
    days_remaining = CASE
      WHEN daily_consumption > 0 THEN quantity / daily_consumption
      ELSE 999
    END,
    recommended_order_date = CURRENT_DATE +
      CAST((days_remaining - 10) AS INTEGER),  -- Commander 10 jours avant
    recommended_order_quantity = daily_consumption * 37,  -- 30 jours + 7 sécurité
    last_prediction_update = NOW()
  WHERE category = 'feed';
END;
$$ LANGUAGE plpgsql;

-- Fonction : Auto-assigner lots aux stocks
CREATE OR REPLACE FUNCTION auto_assign_lots_to_stock()
RETURNS void AS $$
BEGIN
  -- Assigner lots actifs aux stocks d'aliment correspondants
  -- Démarrage (0-21 jours)
  INSERT INTO lot_stock_assignments (lot_id, stock_item_id, user_id, feed_type, is_active)
  SELECT
    l.id,
    si.id,
    l.user_id,
    'aliment_demarrage',
    TRUE
  FROM lots l
  CROSS JOIN stock si
  WHERE l.age <= 21
    AND l.status = 'active'
    AND si.category = 'feed'
    AND LOWER(si.name) LIKE '%démarrage%'
    AND NOT EXISTS (
      SELECT 1 FROM lot_stock_assignments lsa
      WHERE lsa.lot_id = l.id AND lsa.stock_item_id = si.id
    );

  -- Croissance (22-42 jours)
  INSERT INTO lot_stock_assignments (lot_id, stock_item_id, user_id, feed_type, is_active)
  SELECT
    l.id,
    si.id,
    l.user_id,
    'aliment_croissance',
    TRUE
  FROM lots l
  CROSS JOIN stock si
  WHERE l.age > 21 AND l.age <= 42
    AND l.status = 'active'
    AND si.category = 'feed'
    AND LOWER(si.name) LIKE '%croissance%'
    AND NOT EXISTS (
      SELECT 1 FROM lot_stock_assignments lsa
      WHERE lsa.lot_id = l.id AND lsa.stock_item_id = si.id
    );

  -- Finition (>42 jours)
  INSERT INTO lot_stock_assignments (lot_id, stock_item_id, user_id, feed_type, is_active)
  SELECT
    l.id,
    si.id,
    l.user_id,
    'aliment_finition',
    TRUE
  FROM lots l
  CROSS JOIN stock si
  WHERE l.age > 42
    AND l.status = 'active'
    AND si.category = 'feed'
    AND LOWER(si.name) LIKE '%finition%'
    AND NOT EXISTS (
      SELECT 1 FROM lot_stock_assignments lsa
      WHERE lsa.lot_id = l.id AND lsa.stock_item_id = si.id
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Trigger : Mettre à jour prédictions quand nouveau lot
CREATE OR REPLACE FUNCTION trigger_update_predictions_on_lot()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assigner aux stocks appropriés
  PERFORM auto_assign_lots_to_stock();

  -- Mettre à jour prédictions
  PERFORM update_stock_predictions();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_lot_created_update_predictions
  AFTER INSERT ON lots
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_predictions_on_lot();

-- Trigger : Mettre à jour quand consommation enregistrée
CREATE OR REPLACE FUNCTION trigger_update_on_consumption()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour quantité stock
  UPDATE stock
  SET quantity = quantity - NEW.quantity_consumed,
      last_prediction_update = NOW()
  WHERE id = NEW.stock_item_id;

  -- Recalculer prédictions
  PERFORM update_stock_predictions();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_consumption_tracked_update_stock
  AFTER INSERT ON stock_consumption_tracking
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_on_consumption();


-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE stock_consumption_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_stock_assignments ENABLE ROW LEVEL SECURITY;

-- Policies consumption tracking
CREATE POLICY "Users can view their consumption" ON stock_consumption_tracking
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "Users can insert consumption for their lots" ON stock_consumption_tracking
  FOR INSERT WITH CHECK (
    lot_id IN (SELECT id FROM lots WHERE user_id = auth.uid())
  );

-- Policies predictions
CREATE POLICY "Users can view their predictions" ON stock_predictions
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Policies assignments
CREATE POLICY "Users can manage their lot assignments" ON lot_stock_assignments
  FOR ALL USING (
    user_id = auth.uid()
  );


-- ============================================
-- 9. DONNÉES INITIALES (Optionnel)
-- ============================================

-- Job automatique : Mettre à jour prédictions quotidiennement
-- (À configurer dans Supabase Dashboard > Database > Cron Jobs si extension pg_cron installée)
/*
SELECT cron.schedule(
  'update-stock-predictions-daily',
  '0 2 * * *',  -- Tous les jours à 2h du matin
  $$SELECT update_stock_predictions();$$
);

SELECT cron.schedule(
  'auto-assign-lots-daily',
  '0 3 * * *',  -- Tous les jours à 3h du matin
  $$SELECT auto_assign_lots_to_stock();$$
);
*/


-- ============================================
-- FIN DU SCHÉMA
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Schéma Stock Intelligent créé avec succès!';
  RAISE NOTICE 'Tables: stock_consumption_tracking, stock_predictions, lot_stock_assignments';
  RAISE NOTICE 'Vues: v_lot_consumption_summary, v_stock_health, v_consumption_accuracy';
  RAISE NOTICE 'Fonctions: calculate_theoretical_consumption, update_stock_predictions, auto_assign_lots_to_stock';
END $$;