-- MIGRATION: Crée un déclencheur pour générer automatiquement les livraisons.
-- Problème: Aucune livraison n'est créée dans la table `deliveries` lorsqu'une commande est passée.
-- Solution: Créer une fonction et un déclencheur (trigger) qui s'exécutent après chaque insertion dans `orders` pour créer la livraison si nécessaire.

-- 1. Créer la fonction qui sera appelée par le déclencheur.
CREATE OR REPLACE FUNCTION public.create_delivery_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Important pour avoir les permissions d'écrire dans la table 'deliveries'
AS $$
BEGIN
  -- Vérifier si la nouvelle commande (représentée par NEW) demande une livraison.
  IF NEW.delivery_requested = TRUE THEN
    -- Insérer une nouvelle ligne dans la table 'deliveries'.
    INSERT INTO public.deliveries (order_id, status, delivery_location, pickup_location)
    VALUES (
      NEW.id,
      'pending',
      NEW.delivery_address, -- Utiliser l'adresse de la commande pour la livraison.
      NEW.delivery_address  -- Simplification : l'adresse de retrait est la même que celle de livraison.
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Créer le déclencheur qui appellera la fonction après chaque nouvelle commande.
-- Supprimer l'ancien déclencheur s'il existe pour éviter les erreurs.
DROP TRIGGER IF EXISTS trigger_create_delivery_on_new_order ON public.orders;

CREATE TRIGGER trigger_create_delivery_on_new_order
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.create_delivery_for_order();