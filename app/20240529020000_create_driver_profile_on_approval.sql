-- =================================================================
-- MIGRATION: Crée un profil dans `delivery_drivers` lors de l'approbation.
--
-- Problème: Une erreur de clé étrangère (code 23503) se produit lors de l'assignation
-- d'une livraison, car l'ID du livreur (de `livreur_verifications`) n'existe pas
-- dans la table `delivery_drivers` à laquelle `deliveries.driver_id` est liée.
--
-- Solution:
-- 1. Créer une fonction `handle_approved_driver()` qui insère une nouvelle ligne
--    dans `delivery_drivers` en utilisant les informations de `livreur_verifications`.
-- 2. Créer un trigger qui appelle cette fonction chaque fois qu'une ligne dans
--    `livreur_verifications` est mise à jour avec le statut 'approved'.
-- =================================================================

-- Étape 1: Créer la fonction qui sera appelée par le trigger.
CREATE OR REPLACE FUNCTION public.handle_approved_driver()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  -- Insérer une nouvelle ligne dans delivery_drivers si un livreur est approuvé.
  -- ON CONFLICT (user_id) DO NOTHING évite les erreurs si le profil existe déjà.
  INSERT INTO public.delivery_drivers (id, user_id, is_active)
  VALUES (NEW.id, NEW.user_id, TRUE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Étape 2: Créer le trigger qui s'exécute après une mise à jour.
CREATE TRIGGER on_verification_approved_create_driver
AFTER UPDATE OF verification_status ON public.livreur_verifications
FOR EACH ROW
WHEN (NEW.verification_status = 'approved' AND OLD.verification_status IS DISTINCT FROM 'approved')
EXECUTE FUNCTION public.handle_approved_driver();
