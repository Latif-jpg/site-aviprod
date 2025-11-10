-- =================================================================
-- MIGRATION: Corrige le trigger Realtime sur la table 'deliveries'.
--
-- Problème: Une erreur `function realtime.send(...) does not exist` (code 42883)
-- se produit lors de la mise à jour de la table `deliveries`. Cela est dû à une
-- désynchronisation entre la publication Realtime de la table et sa structure actuelle.
--
-- Solution:
-- 1. Désactiver temporairement la publication Realtime pour la table `deliveries`.
-- 2. Réactiver immédiatement la publication.
-- Cette action force Supabase à recréer les triggers associés avec la bonne
-- signature de fonction, résolvant ainsi le conflit.
-- =================================================================

-- Étape 1: Supprimer la table 'deliveries' de la publication Supabase Realtime.
-- Cela supprime les anciens triggers potentiellement corrompus.
ALTER PUBLICATION supabase_realtime DROP TABLE public.deliveries;

-- Étape 2: Rajouter la table 'deliveries' à la publication.
-- Cela recrée les triggers avec la signature de fonction correcte.
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;