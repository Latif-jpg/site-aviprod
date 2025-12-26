-- Migration pour ajouter la colonne initial_quantity à la table stock
-- Cette colonne stockera la quantité maximale ou de départ pour un article.

ALTER TABLE public.stock
ADD COLUMN IF NOT EXISTS initial_quantity NUMERIC;

-- Pour les articles existants, on peut initialiser initial_quantity
-- avec la quantité actuelle. Ce n'est pas parfait, mais c'est un point de départ.
-- Idéalement, l'utilisateur devrait pouvoir l'ajuster.
UPDATE public.stock
SET initial_quantity = quantity
WHERE initial_quantity IS NULL;

COMMENT ON COLUMN public.stock.initial_quantity IS 'Stocke la quantité initiale ou maximale de l''article pour le calcul du pourcentage de stock restant.';
