-- MIGRATION: Ajoute les colonnes de statut pour les livreurs dans la table 'profiles'.
-- Problème: Le statut "en ligne" du livreur n'est pas sauvegardé en base de données.
-- Solution: Ajouter les colonnes 'is_online' et 'last_seen' à la table 'profiles'.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.is_online IS 'Indique si le livreur est actuellement en ligne et disponible pour des livraisons.';
COMMENT ON COLUMN public.profiles.last_seen IS 'Dernière fois que le statut du livreur a été mis à jour ou qu''il a montré une activité.';