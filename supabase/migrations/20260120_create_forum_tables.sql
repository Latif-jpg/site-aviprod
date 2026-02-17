-- Migration: Création des tables du forum interne
-- Description: Tables pour catégories, topics, posts et likes

-- Table des catégories de forum
CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des topics/sujets
CREATE TABLE IF NOT EXISTS forum_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des posts/messages
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des likes sur les posts
CREATE TABLE IF NOT EXISTS forum_post_likes (
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- Table des abonnements aux topics (pour notifications futures)
CREATE TABLE IF NOT EXISTS forum_topic_subscriptions (
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (topic_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_forum_topics_category ON forum_topics(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_user ON forum_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_created ON forum_topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_topic ON forum_posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_forum_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_forum_topics_updated_at
  BEFORE UPDATE ON forum_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_forum_updated_at();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_forum_updated_at();

-- Fonction pour incrémenter le compteur de likes
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement likes_count
CREATE TRIGGER update_forum_post_likes_count
  AFTER INSERT OR DELETE ON forum_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

-- Vue pour les topics avec statistiques
CREATE OR REPLACE VIEW forum_topics_with_stats AS
SELECT 
  t.*,
  p.full_name as author_name,
  p.avatar_url as author_avatar,
  COUNT(DISTINCT fp.id) as posts_count,
  MAX(fp.created_at) as last_post_at
FROM forum_topics t
LEFT JOIN profiles p ON t.user_id = p.id
LEFT JOIN forum_posts fp ON t.id = fp.topic_id
GROUP BY t.id, p.full_name, p.avatar_url;

-- Vue pour les catégories avec statistiques
CREATE OR REPLACE VIEW forum_categories_with_stats AS
SELECT 
  c.*,
  COUNT(DISTINCT t.id) as topics_count,
  COUNT(DISTINCT p.id) as posts_count,
  MAX(t.created_at) as last_topic_at
FROM forum_categories c
LEFT JOIN forum_topics t ON c.id = t.category_id
LEFT JOIN forum_posts p ON t.id = p.topic_id
GROUP BY c.id;

-- Politiques RLS (Row Level Security)

-- Activer RLS sur toutes les tables
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topic_subscriptions ENABLE ROW LEVEL SECURITY;

-- Catégories : lecture publique
CREATE POLICY "Catégories visibles par tous"
  ON forum_categories FOR SELECT
  USING (true);

-- Topics : lecture publique
CREATE POLICY "Topics visibles par tous"
  ON forum_topics FOR SELECT
  USING (true);

-- Topics : création par utilisateurs authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent créer des topics"
  ON forum_topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Topics : modification par l'auteur uniquement
CREATE POLICY "Auteurs peuvent modifier leurs topics"
  ON forum_topics FOR UPDATE
  USING (auth.uid() = user_id);

-- Topics : suppression par l'auteur uniquement
CREATE POLICY "Auteurs peuvent supprimer leurs topics"
  ON forum_topics FOR DELETE
  USING (auth.uid() = user_id);

-- Posts : lecture publique
CREATE POLICY "Posts visibles par tous"
  ON forum_posts FOR SELECT
  USING (true);

-- Posts : création par utilisateurs authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent créer des posts"
  ON forum_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Posts : modification par l'auteur uniquement
CREATE POLICY "Auteurs peuvent modifier leurs posts"
  ON forum_posts FOR UPDATE
  USING (auth.uid() = user_id);

-- Posts : suppression par l'auteur uniquement
CREATE POLICY "Auteurs peuvent supprimer leurs posts"
  ON forum_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Likes : lecture publique
CREATE POLICY "Likes visibles par tous"
  ON forum_post_likes FOR SELECT
  USING (true);

-- Likes : création/suppression par utilisateurs authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent liker"
  ON forum_post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent retirer leurs likes"
  ON forum_post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Subscriptions : lecture par l'utilisateur uniquement
CREATE POLICY "Utilisateurs voient leurs abonnements"
  ON forum_topic_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Subscriptions : création/suppression par utilisateurs authentifiés
CREATE POLICY "Utilisateurs peuvent s'abonner"
  ON forum_topic_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent se désabonner"
  ON forum_topic_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Insertion des catégories par défaut
INSERT INTO forum_categories (name, description, icon, order_index) VALUES
  ('Poulets de chair', 'Discussions sur l''élevage de poulets de chair', 'chicken', 1),
  ('Pondeuses', 'Tout sur les poules pondeuses et la production d''œufs', 'egg', 2),
  ('Produits dérivés', 'Œufs, viande, fumier et autres produits de l''élevage', 'package', 3),
  ('Alimentation', 'Rations, formules alimentaires et nutrition animale', 'food', 4),
  ('Santé animale', 'Maladies, vaccinations et soins vétérinaires', 'health', 5),
  ('Gestion et finances', 'Gestion d''élevage, comptabilité et rentabilité', 'money', 6),
  ('Marché et vente', 'Commercialisation, prix et débouchés', 'market', 7),
  ('Général', 'Discussions générales et autres sujets', 'chat', 8)
ON CONFLICT DO NOTHING;

-- Commentaires sur les tables
COMMENT ON TABLE forum_categories IS 'Catégories thématiques du forum';
COMMENT ON TABLE forum_topics IS 'Sujets de discussion créés par les utilisateurs';
COMMENT ON TABLE forum_posts IS 'Messages/réponses dans les topics';
COMMENT ON TABLE forum_post_likes IS 'Likes sur les messages du forum';
COMMENT ON TABLE forum_topic_subscriptions IS 'Abonnements aux topics pour notifications';
