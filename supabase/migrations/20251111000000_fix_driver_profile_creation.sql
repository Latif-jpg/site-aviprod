-- Fix: Create delivery_drivers profile for existing approved drivers
-- This migration ensures all approved drivers have a corresponding profile in delivery_drivers

-- Insert missing delivery_drivers profiles for approved livreur_verifications
INSERT INTO public.delivery_drivers (
  user_id,
  vehicle_type,
  license_plate,
  city,
  verification_status,
  is_active,
  is_online,
  documents
)
SELECT
  lv.user_id,
  lv.vehicle_type,
  lv.license_plate,
  lv.delivery_zones[1] as city, -- Taking the first zone as the main city
  'approved',
  true,  -- Set as active by default
  lv.is_online, -- Use the current online status
  '{}'   -- Set documents to an empty JSONB object
FROM public.livreur_verifications lv
WHERE lv.verification_status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.delivery_drivers dd
    WHERE dd.user_id = lv.user_id
  )
ON CONFLICT (user_id) DO NOTHING;