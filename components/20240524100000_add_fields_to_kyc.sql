-- MIGRATION: Ajoute les champs nom, prénom et numéro WhatsApp au KYC.
-- Problème: Le formulaire KYC ne collecte pas le nom complet et le numéro WhatsApp.
-- Solution: Ajouter les colonnes 'full_name' et 'whatsapp_number' à la table 'seller_verifications'.

ALTER TABLE public.seller_verifications
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

COMMENT ON COLUMN public.seller_verifications.full_name IS 'Nom complet de l''utilisateur au moment de la soumission KYC.';
COMMENT ON COLUMN public.seller_verifications.whatsapp_number IS 'Numéro WhatsApp de l''utilisateur au moment de la soumission KYC.';
COMMENT ON COLUMN public.seller_verifications.location IS 'Localisation (ville, quartier) de l''utilisateur au moment de la soumission KYC.';