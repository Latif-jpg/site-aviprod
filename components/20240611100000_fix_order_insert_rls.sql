-- =================================================================
-- MIGRATION: Corriger la politique de sécurité pour la création de commandes
--
-- Problème: L'appel RPC pour créer une commande échoue probablement à cause
-- d'une politique RLS (Row Level Security) trop restrictive sur la table `orders`.
-- Même si la fonction RPC utilise `SECURITY DEFINER`, les triggers qu'elle
-- déclenche peuvent s'exécuter avec les permissions de l'utilisateur, causant un échec.
--
-- Solution: Créer une politique `INSERT` explicite sur la table `orders` qui
-- autorise un utilisateur authentifié à créer une commande pour lui-même.
-- =================================================================

-- Activer RLS sur la table 'orders' si ce n'est pas déjà fait.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Supprimer l'ancienne politique d'insertion si elle existe pour éviter les conflits.
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;

-- Créer la nouvelle politique d'insertion.
CREATE POLICY "Users can insert their own orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);