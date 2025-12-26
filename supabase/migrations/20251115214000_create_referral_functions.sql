-- Migration: Create referral code generation function
-- Date: 2025-11-15
-- Description: Add function to generate unique referral codes

-- Function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN := TRUE;
BEGIN
  -- Keep generating codes until we find a unique one
  WHILE code_exists LOOP
    -- Generate a random 8-character code using uppercase letters and numbers
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

    -- Check if this code already exists
    SELECT EXISTS(
      SELECT 1 FROM public.profiles
      WHERE referral_code = new_code
    ) INTO code_exists;
  END LOOP;

  RETURN new_code;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_unique_referral_code() TO authenticated;