-- =================================================================
-- MIGRATION: Corrige la contrainte de validation sur le statut des livreurs.
--
-- Problème: Une erreur "violates check constraint" se produit lors de la mise à jour
-- du statut dans `livreur_verifications`. La contrainte existante n'autorise pas
-- les valeurs 'pending', 'approved', 'rejected' utilisées par l'application.
--
-- Solution:
-- 1. Supprimer l'ancienne contrainte de validation (CHECK constraint).
-- 2. Recréer la contrainte avec les bonnes valeurs.
-- =================================================================

-- Étape 1: Supprimer l'ancienne contrainte.
ALTER TABLE public.livreur_verifications DROP CONSTRAINT IF EXISTS livreur_verifications_verification_status_check;

-- Étape 2: Recréer la contrainte avec les bonnes valeurs.
ALTER TABLE public.livreur_verifications ADD CONSTRAINT livreur_verifications_verification_status_check
CHECK (verification_status IN ('pending', 'approved', 'rejected'));