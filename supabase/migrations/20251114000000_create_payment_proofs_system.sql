-- Create payment proofs table for manual payment validation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_proofs') THEN
        CREATE TABLE payment_proofs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            -- Pour les commandes marketplace
            order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
            -- Pour les abonnements
            subscription_plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
            -- Pour les achats d'avicoins
            avicoins_plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
            -- Informations communes
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            transaction_reference TEXT NOT NULL,
            payment_method TEXT NOT NULL DEFAULT 'orange_money',
            payment_type TEXT DEFAULT 'order' CHECK (payment_type IN ('order', 'subscription', 'avicoins_purchase')),
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            validated_at TIMESTAMP WITH TIME ZONE,
            validated_by UUID REFERENCES auth.users(id),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_proofs_order_id ON payment_proofs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_user_id ON payment_proofs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON payment_proofs(status);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_submitted_at ON payment_proofs(submitted_at DESC);

-- Enable RLS
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own payment proofs
CREATE POLICY "Users can view own payment proofs" ON payment_proofs
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own payment proofs
CREATE POLICY "Users can insert own payment proofs" ON payment_proofs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all payment proofs
CREATE POLICY "Admins can view all payment proofs" ON payment_proofs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can update payment proofs
CREATE POLICY "Admins can update payment proofs" ON payment_proofs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Function to get pending payment proofs for admin validation
DROP FUNCTION IF EXISTS get_pending_payment_proofs();
CREATE OR REPLACE FUNCTION get_pending_payment_proofs()
RETURNS TABLE (
    id UUID,
    order_id TEXT,
    user_id UUID,
    transaction_reference TEXT,
    payment_method TEXT,
    status TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    buyer_name TEXT,
    order_total INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    RETURN QUERY
    SELECT
        pp.id,
        COALESCE(pp.order_id::TEXT, pp.subscription_plan_id::TEXT, pp.avicoins_plan_id::TEXT) as order_id,
        pp.user_id,
        pp.transaction_reference,
        pp.payment_method,
        pp.status,
        pp.submitted_at,
        COALESCE(p.farm_name, 'Utilisateur') as buyer_name,
        CASE
            WHEN pp.order_id IS NOT NULL THEN COALESCE(o.total_amount, 0)
            WHEN pp.subscription_plan_id IS NOT NULL THEN COALESCE(sp.price_monthly, 0)
            WHEN pp.avicoins_plan_id IS NOT NULL THEN COALESCE(sp2.price_monthly, 0)
            ELSE 0
        END as order_total
    FROM payment_proofs pp
    LEFT JOIN profiles p ON pp.user_id = p.user_id
    LEFT JOIN orders o ON pp.order_id = o.id
    LEFT JOIN subscription_plans sp ON pp.subscription_plan_id = sp.id
    LEFT JOIN subscription_plans sp2 ON pp.avicoins_plan_id = sp2.id
    WHERE pp.status = 'pending'
    ORDER BY pp.submitted_at DESC;
END;
$$;

-- Function to update payment proof status
DROP FUNCTION IF EXISTS update_payment_proof_status(UUID, TEXT, UUID);
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
                payment_id, last_payment_date, next_payment_date, auto_renew
            ) VALUES (
                proof_record.user_id,
                proof_record.subscription_plan_id,
                'active',
                NOW(),
                NOW() + INTERVAL '1 month',
                NULL, -- Will be set when payment is processed
                NOW(),
                NOW() + INTERVAL '1 month',
                true
            ) ON CONFLICT (user_id) DO UPDATE SET
                plan_id = EXCLUDED.plan_id,
                status = 'active',
                current_period_start = NOW(),
                current_period_end = NOW() + INTERVAL '1 month',
                last_payment_date = NOW(),
                next_payment_date = NOW() + INTERVAL '1 month',
                updated_at = NOW();
        ELSIF proof_record.avicoins_plan_id IS NOT NULL THEN
            -- Add avicoins to user balance
            -- Get the avicoins amount from the plan
            INSERT INTO user_avicoins (user_id, balance)
            VALUES (proof_record.user_id, (
                SELECT features->>'avicoins_amount'::int
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

-- Trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_payment_proofs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_proofs_updated_at
    BEFORE UPDATE ON payment_proofs
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_proofs_updated_at();

-- Function to get pending payment proofs count for badge/notification
CREATE OR REPLACE FUNCTION get_pending_payment_proofs_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    count_result INTEGER;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*) INTO count_result
    FROM payment_proofs
    WHERE status = 'pending';

    RETURN count_result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_pending_payment_proofs() TO authenticated;
GRANT EXECUTE ON FUNCTION update_payment_proof_status(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_payment_proofs_count() TO authenticated;