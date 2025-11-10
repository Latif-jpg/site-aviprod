-- Create ML models table for AI Evolution Dashboard
CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name TEXT UNIQUE NOT NULL,
  current_accuracy NUMERIC(5,2),
  target_accuracy NUMERIC(5,2) DEFAULT 90.00,
  samples_count INTEGER DEFAULT 0,
  last_training_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage ML models
CREATE POLICY "Admins can manage ML models" ON ml_models
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow read access for authenticated users
CREATE POLICY "Authenticated users can read ML models" ON ml_models
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ml_models_model_name ON ml_models(model_name);
CREATE INDEX IF NOT EXISTS idx_ml_models_accuracy ON ml_models(current_accuracy);

-- Insert some initial ML models
INSERT INTO ml_models (model_name, current_accuracy, target_accuracy, samples_count) VALUES
  ('health_prediction', 87.50, 90.00, 1250),
  ('stock_forecast', 82.30, 85.00, 890),
  ('financial_analysis', 91.20, 92.00, 2100),
  ('ration_optimizer', 88.70, 90.00, 1450)
ON CONFLICT (model_name) DO NOTHING;