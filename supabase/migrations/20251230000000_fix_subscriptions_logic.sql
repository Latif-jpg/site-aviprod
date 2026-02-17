-- Migration: Correct Subscription Logic and Expiry Management
-- Date: 2025-12-30

-- 1. Change default for auto_renew to false
ALTER TABLE public.user_subscriptions ALTER COLUMN auto_renew SET DEFAULT false;

-- 2. Update existing subscriptions to a sane state
-- For freemium/free accounts, auto_renew should be false
UPDATE public.user_subscriptions 
SET auto_renew = false 
WHERE subscription_type IN ('free', 'freemium');

-- Sync expires_at with current_period_end where missing
UPDATE public.user_subscriptions 
SET expires_at = current_period_end 
WHERE expires_at IS NULL AND current_period_end IS NOT NULL;

-- 3. Fix the default user entry function to use 'freemium' correctly
CREATE OR REPLACE FUNCTION public.create_user_default_entries()
RETURNS TRIGGER AS $$
DECLARE
    freemium_plan_id UUID;
BEGIN
    -- Corrected: Search for 'freemium' which is the actual plan name
    SELECT id INTO freemium_plan_id FROM public.subscription_plans WHERE name = 'freemium' LIMIT 1;

    -- Fallback search if 'freemium' is not found (just in case)
    IF freemium_plan_id IS NULL THEN
        SELECT id INTO freemium_plan_id FROM public.subscription_plans WHERE name = 'free' LIMIT 1;
    END IF;

    -- Insert a default entry into user_subscriptions if one doesn't exist
    INSERT INTO public.user_subscriptions (user_id, subscription_type, plan_id, status, auto_renew)
    VALUES (NEW.id, 'free', freemium_plan_id, 'active', false)
    ON CONFLICT (user_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id
        WHERE user_subscriptions.plan_id IS NULL;

    -- Insert a default entry into user_avicoins if one doesn't exist
    INSERT INTO public.user_avicoins (user_id, balance, total_earned, total_spent)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the payment processing function to handle expires_at
CREATE OR REPLACE FUNCTION update_subscription_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    plan_record RECORD;
BEGIN
    -- If payment is completed and it's a subscription payment
    IF NEW.status = 'completed' AND NEW.payment_type = 'subscription' THEN

        -- Get the details of the purchased plan
        SELECT * INTO plan_record FROM public.subscription_plans WHERE id = NEW.reference_id;

        IF plan_record IS NULL THEN
            RAISE WARNING 'Plan not found for reference_id: %', NEW.reference_id;
            RETURN NEW;
        END IF;

        -- Update the existing user subscription with the new plan details
        -- Now explicitly setting expires_at
        UPDATE user_subscriptions
        SET
            plan_id = NEW.reference_id,
            subscription_type = CASE WHEN plan_record.price_monthly > 0 THEN 'paid' ELSE 'free' END,
            status = 'active',
            current_period_start = NOW(),
            current_period_end = NOW() + INTERVAL '1 month',
            expires_at = NOW() + INTERVAL '1 month',
            last_payment_date = NOW(),
            next_payment_date = NOW() + INTERVAL '1 month',
            payment_id = NEW.id,
            auto_renew = false -- Safety: disable auto-renew by default on manual payment
        WHERE user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$;

-- 5. Add a maintenance function to mark expired subscriptions
CREATE OR REPLACE FUNCTION public.check_subscription_expirations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count integer;
BEGIN
    -- Switch status to 'expired' for all non-free subscriptions that passed their expires_at date
    -- and don't have auto_renew active
    UPDATE public.user_subscriptions
    SET status = 'expired'
    WHERE status = 'active'
    AND subscription_type != 'free'
    AND expires_at < NOW()
    AND (auto_renew = false OR auto_renew IS NULL);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- 6. Update manual payment validation to handle expires_at and auto_renew
CREATE OR REPLACE FUNCTION update_payment_proof_status(
    p_proof_id UUID,
    p_new_status TEXT,
    p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    proof_record RECORD;
BEGIN
    -- Check if admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    -- Validate status
    IF p_new_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be approved or rejected.';
    END IF;

    -- Get proof record
    SELECT * INTO proof_record
    FROM payment_proofs
    WHERE id = p_proof_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment proof not found or already processed.';
    END IF;

    -- Update proof status
    UPDATE payment_proofs
    SET
        status = p_new_status,
        validated_at = NOW(),
        validated_by = p_admin_id,
        updated_at = NOW()
    WHERE id = p_proof_id;

    -- If approved, update the corresponding record
    IF p_new_status = 'approved' THEN
        IF proof_record.order_id IS NOT NULL THEN
            -- Update order status
            UPDATE orders
            SET status = 'confirmed', updated_at = NOW()
            WHERE id = proof_record.order_id;
        ELSIF proof_record.subscription_plan_id IS NOT NULL THEN
            -- Create or update user subscription
            INSERT INTO user_subscriptions (
                user_id, plan_id, status, current_period_start, current_period_end,
                expires_at, last_payment_date, next_payment_date, auto_renew
            ) VALUES (
                proof_record.user_id,
                proof_record.subscription_plan_id,
                'active',
                NOW(),
                NOW() + INTERVAL '1 month',
                NOW() + INTERVAL '1 month', -- Set expires_at
                NOW(),
                NOW() + INTERVAL '1 month',
                false -- Disable auto-renew by default for manual payment
            ) ON CONFLICT (user_id) DO UPDATE SET
                plan_id = EXCLUDED.plan_id,
                status = 'active',
                current_period_start = NOW(),
                current_period_end = NOW() + INTERVAL '1 month',
                expires_at = NOW() + INTERVAL '1 month', -- Set expires_at
                last_payment_date = NOW(),
                next_payment_date = NOW() + INTERVAL '1 month',
                auto_renew = false, -- Safety for manual renewal
                updated_at = NOW();
        ELSIF proof_record.avicoins_plan_id IS NOT NULL THEN
            -- Add avicoins to user balance
            INSERT INTO user_avicoins (user_id, balance)
            VALUES (proof_record.user_id, (
                SELECT (features->>'avicoins_amount')::int
                FROM subscription_plans
                WHERE id = proof_record.avicoins_plan_id
            ))
            ON CONFLICT (user_id) DO UPDATE SET
                balance = user_avicoins.balance + EXCLUDED.balance,
                updated_at = NOW();
        END IF;
    END IF;
END;
$$;

-- Note: In a real Supabase environment, you would schedule this via pg_cron:
-- SELECT cron.schedule('check-subs-daily', '0 0 * * *', 'SELECT public.check_subscription_expirations()');
