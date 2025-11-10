-- MIGRATION: Crée une vue pour l'administration des vérifications des livreurs.
-- Problème: Les informations des livreurs (photos, etc.) ne sont pas facilement accessibles pour l'admin.
-- Solution: Créer une vue qui joint les tables `livreur_verifications` et `profiles`.

CREATE OR REPLACE VIEW public.admin_driver_verifications_view AS
SELECT
    lv.id,
    lv.user_id,
    lv.verification_status,
    lv.submitted_at,
    lv.reviewed_at,
    lv.full_name,
    lv.phone_number,
    lv.full_address AS location, -- Utiliser full_address comme 'location'
    u.email,
    lv.profile_photo_url,
    lv.id_document_url,
    lv.selfie_with_id_url,
    lv.vehicle_photo_url,
    lv.insurance_document_url
FROM public.livreur_verifications lv
JOIN auth.users u ON lv.user_id = u.id;