-- Migration: Fix reward_referrer function column name
-- Date: 2025-12-21
-- Description: Update the reward_referrer function to use 'event_type' instead of 'action_type' 
-- to match the current activity_logs table schema.

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

    -- Log the referral reward (Corrected column name: event_type)
    INSERT INTO public.activity_logs (
      user_id,
      event_type, -- Corrected from action_type
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

-- The trigger and permissions are already set by the original migration, 
-- but we re-apply the grant for safety.
GRANT EXECUTE ON FUNCTION reward_referrer() TO authenticated;
