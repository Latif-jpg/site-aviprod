-- MIGRATION: Corrige la visibilité des livraisons pour les livreurs.
-- Problème: Les livreurs ne voient pas les livraisons en attente.
-- Solution: Créer une politique RLS qui autorise les livreurs à voir les livraisons avec le statut 'pending'.

-- 1. Activer la sécurité au niveau des lignes (Row Level Security) sur la table 'deliveries'.
-- C'est une sécurité indispensable qui garantit que les politiques seront appliquées.
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer l'ancienne politique si elle existe pour éviter les conflits.
-- Il est plus propre de la supprimer et de la recréer.
DROP POLICY IF EXISTS "Drivers can view pending deliveries" ON public.deliveries;

-- 3. Créer la nouvelle politique de sécurité.
-- Cette politique définit QUI peut voir QUOI.
CREATE POLICY "Drivers can view pending deliveries"
ON public.deliveries
FOR SELECT  -- La politique s'applique uniquement aux opérations de LECTURE (SELECT).
TO authenticated -- S'applique à n'importe quel utilisateur connecté.
USING (
  -- La condition pour voir une ligne de la table 'deliveries' :
  -- Condition A: L'utilisateur connecté doit avoir le rôle 'driver' dans son profil.
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'driver'
  AND
  -- Condition B: La livraison doit avoir le statut 'pending' (en attente).
  status = 'pending'
);

-- Fin de la migration.
-- Pour vérifier que la politique est bien appliquée, vous pouvez utiliser la commande suivante dans l'éditeur SQL de Supabase :
-- SELECT * FROM pg_policies WHERE tablename = 'deliveries';
