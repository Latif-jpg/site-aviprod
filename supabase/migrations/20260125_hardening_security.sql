-- Durcissement de la sécurité globale Aviprod
-- Date: 2026-01-25
-- Description: Assurer que toutes les tables du marché et les catégories sont protégées par RLS.

-- 1. Forcer l'activation du RLS sur les tables du marché
ALTER TABLE IF EXISTS public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;

-- 2. Politiques pour marketplace_products
-- Tout le monde peut voir les produits en vente
DROP POLICY IF EXISTS "Produits visibles par tous" ON public.marketplace_products;
CREATE POLICY "Produits visibles par tous" 
ON public.marketplace_products FOR SELECT 
TO authenticated, anon
USING (true);

-- Seul le vendeur peut modifier ses produits
DROP POLICY IF EXISTS "Vendeurs peuvent gérer leurs produits" ON public.marketplace_products;
CREATE POLICY "Vendeurs peuvent gérer leurs produits" 
ON public.marketplace_products FOR ALL 
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- 3. Politiques pour categories
-- Tout le monde peut voir les catégories
DROP POLICY IF EXISTS "Catégories visibles par tous" ON public.categories;
CREATE POLICY "Catégories visibles par tous" 
ON public.categories FOR SELECT 
TO authenticated, anon
USING (true);

-- Seuls les Admins peuvent modifier les catégories
DROP POLICY IF EXISTS "Admins peuvent gérer les catégories" ON public.categories;
CREATE POLICY "Admins peuvent gérer les catégories" 
ON public.categories FOR ALL 
TO authenticated
USING ( (SELECT public.is_admin()) );

-- 4. Sécurité supplémentaire sur les analyses IA (Precaution)
ALTER TABLE IF EXISTS public.ai_health_analyses ENABLE ROW LEVEL SECURITY;
