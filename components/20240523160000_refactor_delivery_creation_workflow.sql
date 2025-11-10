-- MIGRATION: Refonte du flux de création de livraison selon la proposition utilisateur.
-- Problème: L'adresse de retrait est statique et la livraison est créée trop tôt.
-- Solution:
-- 1. Ajouter une colonne `pickup_address` à la table `orders`.
-- 2. Modifier le déclencheur pour qu'il crée la livraison APRÈS la confirmation du vendeur et la saisie de l'adresse de retrait.

-- 1. Ajouter la colonne pour l'adresse de retrait à la table 'orders'.
-- Séparer en deux commandes pour une meilleure compatibilité.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_address JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_phone TEXT;

COMMENT ON COLUMN public.orders.pickup_address IS 'Adresse de retrait du colis, spécifiée par le vendeur lors de la confirmation de la commande.';
COMMENT ON COLUMN public.orders.pickup_phone IS 'Numéro de téléphone du vendeur pour le retrait, à communiquer au livreur.';


-- 2. Mettre à jour la fonction du déclencheur.
CREATE OR REPLACE FUNCTION public.create_delivery_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
-- SECURITY DEFINER est déplacé après AS $$ pour une meilleure compatibilité.
BEGIN
  IF NEW.delivery_requested = TRUE THEN
    INSERT INTO public.deliveries (order_id, status, delivery_location, pickup_location, delivery_fee)
    VALUES (
      NEW.id,
      'pending',
      NEW.delivery_address,
      NEW.pickup_address,
      NEW.delivery_fee
    );
  END IF;
  RETURN NEW;
END;
$$ SECURITY DEFINER;

-- 3. Modifier le déclencheur pour qu'il s'exécute APRÈS UNE MISE À JOUR (UPDATE) et non plus après une insertion.
DROP TRIGGER IF EXISTS trigger_create_delivery_on_new_order ON public.orders;
DROP TRIGGER IF EXISTS trigger_create_delivery_on_update_order ON public.orders;
CREATE TRIGGER trigger_create_delivery_on_update_order
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (NEW.delivery_requested = TRUE AND NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed')
EXECUTE FUNCTION public.create_delivery_for_order();