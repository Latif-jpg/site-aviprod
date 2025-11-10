-- Migration pour créer le système de gamification
-- Tables pour badges, achievements, niveaux et récompenses

-- Table des badges disponibles
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL, -- emoji ou nom d'icône
  category VARCHAR(50) NOT NULL, -- 'health', 'productivity', 'engagement', 'achievement'
  rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  points_value INTEGER DEFAULT 10,
  requirements JSONB NOT NULL, -- critères pour obtenir le badge
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des badges obtenus par les utilisateurs
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  progress JSONB DEFAULT '{}', -- progression vers le badge si applicable
  UNIQUE(user_id, badge_id)
);

-- Table des niveaux utilisateur
CREATE TABLE user_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_level INTEGER DEFAULT 1,
  total_points INTEGER DEFAULT 0,
  points_this_level INTEGER DEFAULT 0,
  level_up_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des récompenses disponibles
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'discount', 'feature_unlock', 'badge', 'points_multiplier'
  value JSONB NOT NULL, -- valeur spécifique selon le type
  cost_points INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des récompenses réclamées
CREATE TABLE user_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed BOOLEAN DEFAULT FALSE,
  redeemed_at TIMESTAMPTZ,
  UNIQUE(user_id, reward_id, claimed_at) -- éviter les doublons
);

-- Table des objectifs quotidiens/hebdomadaires
CREATE TABLE daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  category VARCHAR(50) NOT NULL,
  requirements JSONB NOT NULL,
  points_reward INTEGER DEFAULT 10,
  bonus_multiplier FLOAT DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des objectifs complétés par les utilisateurs
CREATE TABLE user_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES daily_challenges(id) ON DELETE CASCADE,
  progress JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id, DATE_TRUNC('day', created_at)) -- un défi par jour max
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX idx_user_levels_user ON user_levels(user_id);
CREATE INDEX idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX idx_user_challenges_completed ON user_challenges(completed, completed_at);
CREATE INDEX idx_daily_challenges_active ON daily_challenges(is_active, valid_until);

-- Politiques RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- Politiques pour badges (lecture publique)
CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges" ON badges FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Politiques pour user_badges
CREATE POLICY "Users can view their own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can earn badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques pour user_levels
CREATE POLICY "Users can view their own level" ON user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their level" ON user_levels FOR ALL USING (auth.uid() = user_id);

-- Politiques pour rewards (lecture publique)
CREATE POLICY "Anyone can view rewards" ON rewards FOR SELECT USING (true);
CREATE POLICY "Admins can manage rewards" ON rewards FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Politiques pour user_rewards
CREATE POLICY "Users can view their rewards" ON user_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can claim rewards" ON user_rewards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can redeem rewards" ON user_rewards FOR UPDATE USING (auth.uid() = user_id);

-- Politiques pour daily_challenges (lecture publique)
CREATE POLICY "Anyone can view challenges" ON daily_challenges FOR SELECT USING (true);
CREATE POLICY "Admins can manage challenges" ON daily_challenges FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Politiques pour user_challenges
CREATE POLICY "Users can view their challenges" ON user_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can complete challenges" ON user_challenges FOR ALL USING (auth.uid() = user_id);

-- Insérer des badges par défaut
INSERT INTO badges (name, description, icon, category, rarity, points_value, requirements) VALUES
('Premier Pas', 'Créer votre premier lot', '🌱', 'achievement', 'common', 25, '{"action": "create_lot", "count": 1}'),
('Éleveur Débutant', 'Avoir 5 volailles actives', '🐔', 'productivity', 'common', 50, '{"active_birds": 5}'),
('Santé Parfaite', 'Maintenir un score de santé > 90% pendant 7 jours', '❤️', 'health', 'rare', 100, '{"health_score": 90, "days": 7}'),
('Expert en Rations', 'Utiliser les rations automatiques 10 fois', '🍎', 'productivity', 'rare', 75, '{"auto_feed": 10}'),
('Commerçant Actif', 'Vendre 5 produits sur le marketplace', '🛒', 'engagement', 'rare', 80, '{"sales": 5}'),
('Maître de la Santé', 'Traiter 10 cas de maladie avec succès', '⚕️', 'health', 'epic', 150, '{"treatments": 10}'),
('Légende de l''Élevage', 'Atteindre le niveau 50', '👑', 'achievement', 'legendary', 500, '{"level": 50}');

-- Insérer des récompenses par défaut
INSERT INTO rewards (name, description, type, value, cost_points) VALUES
('Réduction Marketplace', '10% de réduction sur vos achats marketplace', 'discount', '{"percentage": 10, "type": "marketplace"}', 200),
('Déblocage IA Avancée', 'Accès anticipé aux fonctionnalités IA premium', 'feature_unlock', '{"feature": "advanced_ai"}', 500),
('Multiplicateur de Points', 'Double les points gagnés pendant 24h', 'points_multiplier', '{"multiplier": 2, "duration_hours": 24}', 300),
('Badge Spécial', 'Badge exclusif "VIP Éleveur"', 'badge', '{"badge_name": "VIP Breeder"}', 400);

-- Insérer des défis quotidiens
INSERT INTO daily_challenges (title, description, type, category, requirements, points_reward) VALUES
('Vérification Quotidienne', 'Vérifier la santé de vos volailles', 'daily', 'health', '{"action": "health_check"}', 10),
('Gestion des Stocks', 'Mettre à jour vos stocks d''alimentation', 'daily', 'productivity', '{"action": "update_stock"}', 15),
('Interaction Marketplace', 'Consulter ou publier sur le marketplace', 'daily', 'engagement', '{"action": "marketplace_interaction"}', 10),
('Objectif Hebdomadaire', 'Augmenter votre score de santé de 5%', 'weekly', 'health', '{"health_improvement": 5}', 50);

-- Fonction pour calculer les points d'expérience
CREATE OR REPLACE FUNCTION calculate_level_points(level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Formule: points requis = level * 100 + (level-1) * 50
  RETURN level * 100 + (level - 1) * 50;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le niveau d'un utilisateur
CREATE OR REPLACE FUNCTION update_user_level(target_user_id UUID)
RETURNS void AS $$
DECLARE
  user_total_points INTEGER;
  current_level INTEGER;
  points_needed INTEGER;
  new_level INTEGER;
BEGIN
  -- Récupérer les points totaux
  SELECT COALESCE(SUM(points_value), 0) INTO user_total_points
  FROM user_badges ub
  JOIN badges b ON ub.badge_id = b.id
  WHERE ub.user_id = target_user_id;

  -- Ajouter les points des défis
  SELECT user_total_points + COALESCE(SUM(points_earned), 0) INTO user_total_points
  FROM user_challenges
  WHERE user_id = target_user_id AND completed = TRUE;

  -- Récupérer le niveau actuel
  SELECT current_level INTO current_level
  FROM user_levels
  WHERE user_id = target_user_id;

  IF current_level IS NULL THEN
    -- Créer l'entrée niveau si elle n'existe pas
    INSERT INTO user_levels (user_id, total_points, current_level, points_this_level)
    VALUES (target_user_id, user_total_points, 1, user_total_points);
    RETURN;
  END IF;

  -- Calculer le nouveau niveau
  new_level := 1;
  points_needed := calculate_level_points(new_level);

  WHILE user_total_points >= points_needed LOOP
    new_level := new_level + 1;
    points_needed := calculate_level_points(new_level);
  END LOOP;

  -- Calculer les points dans le niveau actuel
  points_needed := calculate_level_points(current_level);
  points_this_level := user_total_points - points_needed + calculate_level_points(current_level);

  -- Mettre à jour ou insérer
  UPDATE user_levels
  SET
    total_points = user_total_points,
    current_level = new_level,
    points_this_level = points_this_level,
    level_up_at = CASE WHEN new_level > current_level THEN NOW() ELSE level_up_at END,
    updated_at = NOW()
  WHERE user_id = target_user_id;

END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le niveau quand un badge est gagné
CREATE OR REPLACE FUNCTION trigger_update_level_on_badge()
RETURNS trigger AS $$
BEGIN
  PERFORM update_user_level(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_level_update_badge
  AFTER INSERT ON user_badges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_level_on_badge();

-- Trigger pour mettre à jour le niveau quand un défi est complété
CREATE TRIGGER trigger_level_update_challenge
  AFTER UPDATE ON user_challenges
  FOR EACH ROW
  WHEN (NEW.completed = TRUE AND OLD.completed = FALSE)
  EXECUTE FUNCTION trigger_update_level_on_badge();

-- Fonction pour vérifier et attribuer les badges automatiquement
CREATE OR REPLACE FUNCTION check_and_award_badges(target_user_id UUID)
RETURNS void AS $$
DECLARE
  badge_record record;
  user_stats jsonb;
  meets_requirements BOOLEAN;
BEGIN
  -- Récupérer les statistiques de l'utilisateur
  SELECT jsonb_build_object(
    'active_lots', (SELECT COUNT(*) FROM lots WHERE user_id = target_user_id AND status = 'active'),
    'total_birds', (SELECT COALESCE(SUM(quantity), 0) FROM lots WHERE user_id = target_user_id AND status = 'active'),
    'health_score_avg', (SELECT AVG(health_score) FROM lots WHERE user_id = target_user_id AND status = 'active'),
    'badges_count', (SELECT COUNT(*) FROM user_badges WHERE user_id = target_user_id),
    'challenges_completed', (SELECT COUNT(*) FROM user_challenges WHERE user_id = target_user_id AND completed = TRUE),
    'sales_count', (SELECT COUNT(*) FROM orders WHERE seller_id = target_user_id AND status = 'completed')
  ) INTO user_stats;

  -- Vérifier chaque badge
  FOR badge_record IN SELECT * FROM badges WHERE is_active = TRUE LOOP
    -- Vérifier si l'utilisateur a déjà ce badge
    IF NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = target_user_id AND badge_id = badge_record.id) THEN
      -- Vérifier les critères selon le type de badge
      meets_requirements := FALSE;

      CASE badge_record.category
        WHEN 'achievement' THEN
          -- Critères spécifiques aux achievements
          IF badge_record.requirements->>'action' = 'create_lot' THEN
            meets_requirements := (user_stats->>'active_lots')::int >= (badge_record.requirements->>'count')::int;
          END IF;
        WHEN 'productivity' THEN
          IF badge_record.requirements->>'active_birds' IS NOT NULL THEN
            meets_requirements := (user_stats->>'total_birds')::int >= (badge_record.requirements->>'active_birds')::int;
          END IF;
        WHEN 'health' THEN
          -- Pour les badges de santé, vérifier l'historique
          IF badge_record.requirements->>'health_score' IS NOT NULL THEN
            -- Vérifier si le score de santé a été maintenu pendant X jours
            SELECT COUNT(*) >= (badge_record.requirements->>'days')::int INTO meets_requirements
            FROM user_engagement_metrics
            WHERE user_id = target_user_id
              AND metric_type = 'health_score'
              AND (metric_value->>'score')::float >= (badge_record.requirements->>'health_score')::float
              AND period_start >= NOW() - INTERVAL '7 days';
          END IF;
        WHEN 'engagement' THEN
          IF badge_record.requirements->>'sales' IS NOT NULL THEN
            meets_requirements := (user_stats->>'sales_count')::int >= (badge_record.requirements->>'sales')::int;
          END IF;
      END CASE;

      -- Attribuer le badge si les critères sont remplis
      IF meets_requirements THEN
        INSERT INTO user_badges (user_id, badge_id)
        VALUES (target_user_id, badge_record.id);
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Commentaires pour documentation
COMMENT ON TABLE badges IS 'Badges disponibles dans le système de gamification';
COMMENT ON TABLE user_badges IS 'Badges obtenus par les utilisateurs';
COMMENT ON TABLE user_levels IS 'Niveaux et progression des utilisateurs';
COMMENT ON TABLE rewards IS 'Récompenses disponibles à échanger contre des points';
COMMENT ON TABLE user_rewards IS 'Récompenses réclamées par les utilisateurs';
COMMENT ON TABLE daily_challenges IS 'Défis quotidiens/hebdomadaires disponibles';
COMMENT ON TABLE user_challenges IS 'Progression des utilisateurs sur les défis';
