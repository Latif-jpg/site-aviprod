-- MIGRATION: Refonte de l'emplacement du statut du livreur.
-- Problème: Le statut 'is_online' et 'last_seen' est dans la table 'profiles', ce qui n'est pas logique.
-- Solution: Déplacer ces colonnes vers la table 'livreur_verifications' qui est spécifique aux livreurs.

-- Étape 1: Ajouter les colonnes à la table 'livreur_verifications'.
ALTER TABLE public.livreur_verifications
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

COMMENT ON COLUMN public.livreur_verifications.is_online IS 'Indique si le livreur est actuellement en ligne et disponible pour des livraisons.';
COMMENT ON COLUMN public.livreur_verifications.last_seen IS 'Dernière fois que le statut du livreur a été mis à jour ou qu''il a montré une activité.';

-- Étape 2: Migrer les données existantes de 'profiles' vers 'livreur_verifications'.
-- Cette requête met à jour chaque livreur dans 'livreur_verifications' avec les données de son profil correspondant.
UPDATE public.livreur_verifications lv
SET
    is_online = p.is_online,
    last_seen = p.last_seen
FROM public.profiles p
WHERE lv.user_id = p.user_id;

-- Étape 3: Supprimer les colonnes obsolètes de la table 'profiles'.
-- On vérifie d'abord si les colonnes existent avant de les supprimer pour éviter les erreurs.
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_online') THEN
        ALTER TABLE public.profiles DROP COLUMN is_online;
    END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_seen') THEN
        ALTER TABLE public.profiles DROP COLUMN last_seen;
    END IF;
END $$;