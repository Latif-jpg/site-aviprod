-- Migration: corrige les policies RLS pour permettre aux utilisateurs
-- d'insérer/mettre à jour/consulter leurs propres enregistrements.
-- Exécuter dans Supabase SQL Editor ou via votre pipeline de migrations.

-- === user_financial_profiles ===
ALTER TABLE IF EXISTS public.user_financial_profiles ENABLE ROW LEVEL SECURITY;

-- Supprime la policy existante si elle existe (évite les erreurs de duplication)
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_financial_profiles_owner' AND tablename = 'user_financial_profiles') THEN
      EXECUTE 'DROP POLICY user_financial_profiles_owner ON public.user_financial_profiles';
   END IF;
END$$;

CREATE POLICY user_financial_profiles_owner ON public.user_financial_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- === financial_records ===
-- Par précaution, on s'assure que la policy sur financial_records est correcte,
-- car elle est lue par l'agent.
ALTER TABLE IF EXISTS public.financial_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'financial_records_user_access' AND tablename = 'financial_records') THEN
      EXECUTE 'DROP POLICY financial_records_user_access ON public.financial_records';
   END IF;
END$$;

CREATE POLICY financial_records_user_access ON public.financial_records
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);