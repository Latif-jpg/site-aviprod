-- Migration: Ajouter le support pour plusieurs images par produit
-- Date: 2025-12-20
-- Description: Ajoute une colonne 'images' de type tableau de texte à la table marketplace_products

ALTER TABLE public.marketplace_products
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- Index pour optimiser les recherches si nécessaire
CREATE INDEX IF NOT EXISTS idx_marketplace_products_images ON marketplace_products USING gin(images);

-- Forcer le rafraîchissement du cache PostgREST
SELECT pg_notify('pgrst', 'reload schema');

COMMENT ON COLUMN public.marketplace_products.images IS 'Tableau contenant les chemins des images supplémentaires du produit';
