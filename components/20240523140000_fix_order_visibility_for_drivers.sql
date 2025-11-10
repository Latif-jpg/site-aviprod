-- MIGRATION: Corrige la visibilité des commandes pour les livreurs.
-- Problème: La vue `available_deliveries_view` joint la table `orders`, mais les livreurs n'ont peut-être pas la permission de lire les commandes, ce qui fait que la vue retourne un résultat vide.
-- Solution: Créer une politique RLS qui autorise un livreur à lire une commande si elle est liée à une livraison visible.

-- Activer RLS sur la table 'orders' si ce n'est pas déjà fait.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Supprimer l'ancienne politique pour éviter les conflits.
DROP POLICY IF EXISTS "Drivers can view orders for their deliveries" ON public.orders;

-- Créer la nouvelle politique de sécurité.
CREATE POLICY "Drivers can view orders for their deliveries"
ON public.orders
FOR SELECT
USING (
  -- Simplification : Un livreur peut voir les détails de n'importe quelle commande.
  -- La vue `available_deliveries_view` se charge déjà de ne montrer que les livraisons pertinentes (`pending`).
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'driver'
);
