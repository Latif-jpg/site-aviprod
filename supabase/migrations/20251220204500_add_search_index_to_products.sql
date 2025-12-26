-- Migration: Ajouter un index de recherche plein texte sur marketplace_products
-- Date: 2025-12-20
-- Description: Crée une colonne générée tsvector et un index GIN pour des recherches ultra-rapides

-- 1. Ajouter une colonne pour le vecteur de recherche (si pas déjà présente)
ALTER TABLE public.marketplace_products 
ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('french', coalesce(name, '') || ' ' || coalesce(description, ''))
) STORED;

-- 2. Créer l'index GIN sur le vecteur de recherche
CREATE INDEX IF NOT EXISTS idx_marketplace_products_search ON public.marketplace_products USING GIN(search_vector);

-- 3. Ajouter également un index sur le nom seul pour les recherches avec LIKE
CREATE INDEX IF NOT EXISTS idx_marketplace_products_name ON public.marketplace_products (name);

-- Forcer le rafraîchissement du cache PostgREST
SELECT pg_notify('pgrst', 'reload schema');

COMMENT ON INDEX public.idx_marketplace_products_search IS 'Index GIN pour faciliter les recherches plein texte sur le nom et la description';
