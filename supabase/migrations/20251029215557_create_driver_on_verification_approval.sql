
-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_approved_driver()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the verification_status is updated to 'approved'
  -- and it wasn't 'approved' before.
  IF NEW.verification_status = 'approved' AND OLD.verification_status != 'approved' THEN
    -- Insert a new record into the delivery_drivers table,
    -- taking the first element of the delivery_zones array as the city.
    INSERT INTO public.delivery_drivers (
      user_id,
      vehicle_type,
      license_plate,
      city,
      verification_status,
      is_active,
      is_online,
      documents -- Assuming documents can be an empty JSONB
    )
    VALUES (
      NEW.user_id,
      NEW.vehicle_type,
      NEW.license_plate,
      NEW.delivery_zones[1], -- Taking the first zone as the main city
      'approved',
      true,  -- Set as active by default
      false, -- Set as offline by default
      '{}'   -- Set documents to an empty JSONB object
    )
    -- If a driver with this user_id already exists, do nothing to prevent duplicates.
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
-- Drop the trigger first if it exists to make this script idempotent
DROP TRIGGER IF EXISTS on_verification_approved_create_driver ON public.livreur_verifications;

CREATE TRIGGER on_verification_approved_create_driver
  AFTER UPDATE ON public.livreur_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_approved_driver();
