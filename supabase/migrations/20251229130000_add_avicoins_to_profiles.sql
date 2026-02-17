-- Migration pour ajouter la colonne avicoins à la table profiles
-- Créé le: 2025-12-29

-- Ajouter la colonne avicoins si elle n'existe pas
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='avicoins') THEN
    ALTER TABLE public.profiles ADD COLUMN avicoins INTEGER DEFAULT 0;
  END IF;
END $$;

-- Commentaire
COMMENT ON COLUMN public.profiles.avicoins IS 'Solde de la monnaie virtuelle Avicoins';
