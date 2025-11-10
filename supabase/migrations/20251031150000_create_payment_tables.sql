-- Create payment-related tables for PayDunya integration

-- Table for storing payment transactions
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'XOF',
    payment_method VARCHAR(50), -- 'orange_money', 'moov_money', 'card', etc.
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
    transaction_id VARCHAR(255) UNIQUE, -- PayDunya transaction ID
    invoice_token VARCHAR(255), -- PayDunya invoice token
    payment_type VARCHAR(50) NOT NULL, -- 'subscription', 'marketplace', 'premium_feature'
    reference_type VARCHAR(50), -- 'subscription_plan', 'marketplace_product', etc.
    reference_id UUID, -- ID of the related entity
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for payment methods available
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    provider VARCHAR(50) DEFAULT 'paydunya',
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default payment methods for Burkina Faso
INSERT INTO payment_methods (name, code, provider) VALUES
('Orange Money', 'orange_money', 'paydunya'),
('Moov Money', 'moov_money', 'paydunya'),
('Carte Bancaire', 'card', 'paydunya')
ON CONFLICT (code) DO NOTHING;

-- Add payment_id to user_subscriptions table
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id),
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_payment_id ON user_subscriptions(payment_id);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
CREATE POLICY "Users can insert their own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all payments" ON payments;
CREATE POLICY "Service role can manage all payments" ON payments
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for payment_methods
DROP POLICY IF EXISTS "Everyone can view active payment methods" ON payment_methods;
CREATE POLICY "Everyone can view active payment methods" ON payment_methods
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role can manage payment methods" ON payment_methods;
CREATE POLICY "Service role can manage payment methods" ON payment_methods
    FOR ALL USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for payments table
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle subscription renewal
CREATE OR REPLACE FUNCTION process_subscription_renewal()
RETURNS void AS $$
DECLARE
    sub_record RECORD;
    new_payment_id UUID;
BEGIN
    -- Find subscriptions that need renewal (next_payment_date <= now and auto_renew = true)
    FOR sub_record IN
        SELECT * FROM user_subscriptions
        WHERE auto_renew = true
        AND next_payment_date <= NOW()
        AND status = 'active'
    LOOP
        -- Create a new payment record for renewal
        INSERT INTO payments (
            user_id,
            amount,
            payment_type,
            reference_type,
            reference_id,
            description,
            status
        )
        SELECT
            sub_record.user_id,
            sp.price_monthly,
            'subscription',
            'subscription_plan',
            sub_record.plan_id,
            'Renouvellement automatique - ' || sp.display_name,
            'pending'
        FROM subscription_plans sp
        WHERE sp.id = sub_record.plan_id
        RETURNING id INTO new_payment_id;

        -- Update subscription with new payment reference
        UPDATE user_subscriptions
        SET
            payment_id = new_payment_id,
            last_payment_date = NOW(),
            next_payment_date = NOW() + INTERVAL '1 month'
        WHERE id = sub_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update subscription status based on payment
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
        UPDATE user_subscriptions
        SET
            plan_id = NEW.reference_id,
            subscription_type = CASE WHEN plan_record.price_monthly > 0 THEN 'paid' ELSE 'free' END,
            status = 'active',
            current_period_start = NOW(),
            current_period_end = NOW() + INTERVAL '1 month', -- Assuming monthly subscription
            last_payment_date = NOW(),
            next_payment_date = NOW() + INTERVAL '1 month',
            payment_id = NEW.id,
            auto_renew = true
        WHERE user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger for payment status updates
CREATE TRIGGER trigger_update_subscription_on_payment
    AFTER UPDATE OF status ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_on_payment();