-- =================================================================
-- MIGRATION: Fix Payment Validation (Reference ID Bug)
-- =================================================================

-- Redefine update_payment_proof_status to use the correct columns
-- columns 'subscription_plan_id' and 'avicoins_plan_id' do not exist
-- we must use 'reference_id' and check 'payment_type'

CREATE OR REPLACE FUNCTION public.update_payment_proof_status(
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
        
        -- CASE 1: ORDERS
        IF proof_record.order_id IS NOT NULL THEN
            UPDATE orders
            SET status = 'confirmed', updated_at = NOW()
            WHERE id = proof_record.order_id;

        -- CASE 2: SUBSCRIPTIONS
        ELSIF proof_record.payment_type = 'subscription' THEN
            -- Create or update user subscription
            -- Uses reference_id as plan_id
            INSERT INTO user_subscriptions (
                user_id, plan_id, status, current_period_start, current_period_end,
                expires_at, last_payment_date, next_payment_date, auto_renew
            ) VALUES (
                proof_record.user_id,
                proof_record.reference_id, -- CORRECTED: use reference_id
                'active',
                NOW(),
                NOW() + INTERVAL '1 month',
                NOW() + INTERVAL '1 month',
                NOW(),
                NOW() + INTERVAL '1 month',
                false
            ) ON CONFLICT (user_id) DO UPDATE SET
                plan_id = EXCLUDED.plan_id,
                status = 'active',
                current_period_start = NOW(),
                current_period_end = NOW() + INTERVAL '1 month',
                expires_at = NOW() + INTERVAL '1 month',
                last_payment_date = NOW(),
                next_payment_date = NOW() + INTERVAL '1 month',
                auto_renew = false,
                updated_at = NOW();

        -- CASE 3: AVICOINS
        ELSIF proof_record.payment_type = 'avicoins' THEN
            -- Add avicoins to user balance
            -- Uses reference_id to look up the avicoins plan amount
            INSERT INTO user_avicoins (user_id, balance)
            VALUES (proof_record.user_id, (
                SELECT (features->>'avicoins_amount')::int
                FROM subscription_plans
                WHERE id = proof_record.reference_id -- CORRECTED: use reference_id
            ))
            ON CONFLICT (user_id) DO UPDATE SET
                balance = user_avicoins.balance + EXCLUDED.balance,
                updated_at = NOW();
        END IF;

    END IF;
END;
$$;
