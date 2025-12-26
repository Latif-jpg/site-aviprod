-- Migration: Create referral rewards system
-- Date: 2025-11-15
-- Description: Add 50 avicoins reward to referrer when someone uses their referral code

-- Function to reward referrer with 50 avicoins
CREATE OR REPLACE FUNCTION reward_referrer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only reward if referred_by was just set (changed from NULL to a value)
  IF OLD.referred_by IS NULL AND NEW.referred_by IS NOT NULL THEN
    -- Add 50 avicoins to the referrer's balance
    INSERT INTO public.user_avicoins (user_id, balance)
    VALUES (NEW.referred_by, 50)
    ON CONFLICT (user_id)
    DO UPDATE SET
      balance = user_avicoins.balance + 50,
      updated_at = NOW();

    -- Log the referral reward
    INSERT INTO public.activity_logs (
      user_id,
      action_type,
      context,
      outcome
    ) VALUES (
      NEW.referred_by,
      'referral_reward',
      jsonb_build_object(
        'new_user_id', NEW.id,
        'reward_amount', 50,
        'referral_code_used', NEW.referred_by_code
      ),
      'success'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (runs on UPDATE when referred_by is set)
DROP TRIGGER IF EXISTS reward_referrer_trigger ON public.profiles;
CREATE TRIGGER reward_referrer_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION reward_referrer();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION reward_referrer() TO authenticated;