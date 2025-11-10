-- Create subscription plans table and populate with default plans

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create avicoins table for token-based usage
CREATE TABLE IF NOT EXISTS user_avicoins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    total_spent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create avicoins transactions table
CREATE TABLE IF NOT EXISTS avicoins_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'earned', 'spent'
    description TEXT,
    reference_type VARCHAR(50), -- 'payment', 'ai_analysis', 'auto_feeding', etc.
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_avicoins ENABLE ROW LEVEL SECURITY;
ALTER TABLE avicoins_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (with IF NOT EXISTS)
DROP POLICY IF EXISTS "Everyone can view active subscription plans" ON subscription_plans;
CREATE POLICY "Everyone can view active subscription plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role can manage subscription plans" ON subscription_plans;
CREATE POLICY "Service role can manage subscription plans" ON subscription_plans
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_avicoins
DROP POLICY IF EXISTS "Users can view their own avicoins" ON user_avicoins;
CREATE POLICY "Users can view their own avicoins" ON user_avicoins
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own avicoins" ON user_avicoins;
CREATE POLICY "Users can update their own avicoins" ON user_avicoins
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all avicoins" ON user_avicoins;
CREATE POLICY "Service role can manage all avicoins" ON user_avicoins
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for avicoins_transactions
DROP POLICY IF EXISTS "Users can view their own avicoins transactions" ON avicoins_transactions;
CREATE POLICY "Users can view their own avicoins transactions" ON avicoins_transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own avicoins transactions" ON avicoins_transactions;
CREATE POLICY "Users can insert their own avicoins transactions" ON avicoins_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all avicoins transactions" ON avicoins_transactions;
CREATE POLICY "Service role can manage all avicoins transactions" ON avicoins_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features) VALUES
('freemium', 'Le Découvreur', 'Plan gratuit avec fonctionnalités de base', 0, 0, '{
    "ai_analyses_per_month": 2,
    "max_lots": 2,
    "auto_feeding": false,
    "advanced_feeding": false,
    "optimized_feeding": false,
    "product_recommendations": false,
    "full_history": false,
    "sell_on_marketplace": 2,
    "export_reports": false,
    "advanced_alerts": false,
    "delivery_discount": 0,
    "delivery_free": false,
    "product_discount": 0,
    "priority_support": false,
    "dedicated_support": false
}'::jsonb),
('premium', 'L''Optimiseur', 'Plan intermédiaire avec analyses IA avancées', 5000, 50000, '{
    "ai_analyses_per_month": 15,
    "max_lots": 10,
    "auto_feeding": true,
    "advanced_feeding": false,
    "optimized_feeding": false,
    "product_recommendations": 2,
    "full_history": true,
    "sell_on_marketplace": true,
    "export_reports": false,
    "advanced_alerts": true,
    "delivery_discount": 0,
    "delivery_free": false,
    "product_discount": 0,
    "priority_support": false,
    "dedicated_support": false
}'::jsonb),
('pro', 'L''Expert', 'Plan complet avec toutes les fonctionnalités', 15000, 150000, '{
    "ai_analyses_per_month": -1,
    "max_lots": -1,
    "auto_feeding": true,
    "advanced_feeding": false,
    "optimized_feeding": true,
    "product_recommendations": false,
    "full_history": true,
    "sell_on_marketplace": true,
    "export_reports": true,
    "advanced_alerts": true,
    "delivery_discount": 0,
    "delivery_free": false,
    "product_discount": 0,
    "priority_support": false,
    "dedicated_support": true
}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Insert avicoins packages
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features) VALUES
('avicoins_25', '25 Avicoins', 'Pack de 25 Avicoins pour utilisation à la demande', 500, 0, '{
    "avicoins_amount": 25,
    "ai_analysis_cost": 5,
    "auto_feeding_cost": 5,
    "premium_feature_cost": 5,
    "pro_feature_cost": 5
}'::jsonb),
('avicoins_50', '50 Avicoins', 'Pack de 50 Avicoins pour utilisation intensive', 900, 0, '{
    "avicoins_amount": 50,
    "ai_analysis_cost": 5,
    "auto_feeding_cost": 5,
    "premium_feature_cost": 5,
    "pro_feature_cost": 5
}'::jsonb),
('avicoins_100', '100 Avicoins', 'Pack de 100 Avicoins avec réduction', 1700, 0, '{
    "avicoins_amount": 100,
    "ai_analysis_cost": 5,
    "auto_feeding_cost": 5,
    "premium_feature_cost": 5,
    "pro_feature_cost": 5
}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Add missing columns to user_subscriptions table if they don't exist
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS usage_limits JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id),
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable RLS for user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions (with IF NOT EXISTS)
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON user_subscriptions;
CREATE POLICY "Service role can manage all subscriptions" ON user_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_user_avicoins_user_id ON user_avicoins(user_id);
CREATE INDEX IF NOT EXISTS idx_avicoins_transactions_user_id ON avicoins_transactions(user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_avicoins_updated_at ON user_avicoins;
CREATE TRIGGER update_user_avicoins_updated_at
    BEFORE UPDATE ON user_avicoins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update avicoins balance (only create if not exists)
CREATE OR REPLACE FUNCTION update_avicoins_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update user_avicoins record
    INSERT INTO user_avicoins (user_id, balance, total_earned, total_spent)
    VALUES (NEW.user_id, NEW.amount, NEW.amount, 0)
    ON CONFLICT (user_id) DO UPDATE SET
        balance = user_avicoins.balance + NEW.amount,
        total_earned = user_avicoins.total_earned + CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
        total_spent = user_avicoins.total_spent + CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update avicoins balance on transaction
DROP TRIGGER IF EXISTS trigger_update_avicoins_balance ON avicoins_transactions;
CREATE TRIGGER trigger_update_avicoins_balance
    AFTER INSERT ON avicoins_transactions
    FOR EACH ROW EXECUTE FUNCTION update_avicoins_balance();