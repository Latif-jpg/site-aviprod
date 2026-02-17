-- Ajout de la colonne description à la table stock
ALTER TABLE public.stock ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.stock.description IS 'Description optionnelle ou métadonnées (ex: généré par IA)';
