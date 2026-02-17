-- Migration pour ajouter le tracking des récompenses publicitaires
-- Créé le: 2025-12-29

-- Créer la table ad_rewards pour tracker les publicités récompensées
CREATE TABLE IF NOT EXISTS ad_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_amount INTEGER NOT NULL DEFAULT 5,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour vérifier rapidement la dernière pub regardée par utilisateur
CREATE INDEX IF NOT EXISTS idx_ad_rewards_user_watched 
ON ad_rewards(user_id, watched_at DESC);

-- Activer RLS
ALTER TABLE ad_rewards ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres récompenses
CREATE POLICY "Users can view their own ad rewards"
ON ad_rewards FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent insérer leurs propres récompenses
CREATE POLICY "Users can insert their own ad rewards"
ON ad_rewards FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Commentaires
COMMENT ON TABLE ad_rewards IS 'Tracking des publicités récompensées visionnées par les utilisateurs';
COMMENT ON COLUMN ad_rewards.reward_amount IS 'Montant de la récompense en Avicoins (max 5)';
COMMENT ON COLUMN ad_rewards.watched_at IS 'Date et heure de visionnage de la publicité';
