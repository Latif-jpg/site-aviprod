-- Migration: Ajouter les champs pour les produits sponsorisés
-- Date: 2024
-- Description: Permet aux vendeurs de booster la visibilité de leurs produits

-- 1. Ajouter les colonnes de sponsoring à la table marketplace_products
ALTER TABLE marketplace_products
ADD COLUMN IF NOT EXISTS is_sponsored boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS boost_level integer DEFAULT 0 CHECK (boost_level >= 0 AND boost_level <= 2),
ADD COLUMN IF NOT EXISTS sponsor_end_date timestamptz,
ADD COLUMN IF NOT EXISTS sponsor_start_date timestamptz;

-- 2. Ajouter des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_sponsored_products ON marketplace_products(is_sponsored, sponsor_end_date)
WHERE is_sponsored = true;

CREATE INDEX IF NOT EXISTS idx_boost_level ON marketplace_products(boost_level)
WHERE boost_level > 0;

-- 3. Créer une table pour suivre les statistiques de sponsoring
CREATE TABLE IF NOT EXISTS sponsorship_stats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  views integer DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  revenue numeric(10, 2) DEFAULT 0,
  cost numeric(10, 2) DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, date)
);

-- Index pour les statistiques
CREATE INDEX IF NOT EXISTS idx_sponsorship_stats_product ON sponsorship_stats(product_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_stats_user ON sponsorship_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_stats_date ON sponsorship_stats(date DESC);

-- 4. Créer une table pour l'historique des paiements de sponsoring
CREATE TABLE IF NOT EXISTS sponsorship_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  boost_level integer NOT NULL CHECK (boost_level >= 0 AND boost_level <= 2),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  payment_method text NOT NULL, -- 'mobile_money', 'card', 'cash'
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour les paiements
CREATE INDEX IF NOT EXISTS idx_sponsorship_payments_product ON sponsorship_payments(product_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_payments_user ON sponsorship_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_payments_status ON sponsorship_payments(payment_status);

-- 5. Fonction pour activer automatiquement le sponsoring après paiement
CREATE OR REPLACE FUNCTION activate_sponsorship_after_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND OLD.payment_status = 'pending' THEN
    UPDATE marketplace_products
    SET
      is_sponsored = true,
      boost_level = NEW.boost_level,
      sponsor_start_date = NEW.start_date,
      sponsor_end_date = NEW.end_date
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_activate_sponsorship ON sponsorship_payments;
CREATE TRIGGER trigger_activate_sponsorship
  AFTER UPDATE ON sponsorship_payments
  FOR EACH ROW
  EXECUTE FUNCTION activate_sponsorship_after_payment();

-- 6. Fonction pour désactiver automatiquement les sponsorings expirés
CREATE OR REPLACE FUNCTION deactivate_expired_sponsorships()
RETURNS void AS $$
BEGIN
  UPDATE marketplace_products
  SET
    is_sponsored = false,
    boost_level = 0
  WHERE
    is_sponsored = true
    AND sponsor_end_date IS NOT NULL
    AND sponsor_end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Créer une vue pour les produits sponsorisés actifs
CREATE OR REPLACE VIEW active_sponsored_products AS
SELECT
  p.*,
  sp.views,
  sp.clicks,
  sp.conversions,
  CASE
    WHEN sp.views > 0 THEN ROUND((sp.clicks::numeric / sp.views::numeric) * 100, 2)
    ELSE 0
  END as ctr,
  CASE
    WHEN sp.clicks > 0 THEN ROUND((sp.conversions::numeric / sp.clicks::numeric) * 100, 2)
    ELSE 0
  END as conversion_rate
FROM marketplace_products p
LEFT JOIN LATERAL (
  SELECT
    product_id,
    SUM(views) as views,
    SUM(clicks) as clicks,
    SUM(conversions) as conversions
  FROM sponsorship_stats
  WHERE product_id = p.id
  GROUP BY product_id
) sp ON true
WHERE
  p.is_sponsored = true
  AND (p.sponsor_end_date IS NULL OR p.sponsor_end_date > NOW());

-- 8. Politique de sécurité RLS (Row Level Security)
ALTER TABLE sponsorship_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsorship_payments ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres statistiques
CREATE POLICY "Users can view own sponsorship stats" ON sponsorship_stats
  FOR SELECT USING (auth.uid() = user_id);

-- Les utilisateurs peuvent voir leurs propres paiements
CREATE POLICY "Users can view own sponsorship payments" ON sponsorship_payments
  FOR SELECT USING (auth.uid() = user_id);

-- Les utilisateurs peuvent créer des paiements
CREATE POLICY "Users can create sponsorship payments" ON sponsorship_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Commentaires pour la documentation
COMMENT ON COLUMN marketplace_products.is_sponsored IS 'Indique si le produit est actuellement sponsorisé';
COMMENT ON COLUMN marketplace_products.boost_level IS 'Niveau de boost: 0=normal, 1=prioritaire, 2=ultra';
COMMENT ON COLUMN marketplace_products.sponsor_end_date IS 'Date de fin du sponsoring (NULL = permanent)';
COMMENT ON TABLE sponsorship_stats IS 'Statistiques de performance des produits sponsorisés';
COMMENT ON TABLE sponsorship_payments IS 'Historique des paiements de sponsoring';

-- 10. Données de test (optionnel - commenter en production)
-- Exemple: Sponsoriser un produit pour 7 jours au niveau 1
/*
INSERT INTO sponsorship_payments (
  product_id,
  user_id,
  amount,
  boost_level,
  duration_days,
  payment_method,
  payment_status,
  start_date,
  end_date
) VALUES (
  '<product_id>',
  '<user_id>',
  5250, -- 7 jours * 500 FCFA * 1.5
  1,
  7,
  'mobile_money',
  'completed',
  NOW(),
  NOW() + INTERVAL '7 days'
);
*/