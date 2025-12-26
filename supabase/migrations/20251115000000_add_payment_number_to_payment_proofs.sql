-- Add payment_number column to payment_proofs table
ALTER TABLE payment_proofs ADD COLUMN payment_number TEXT;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_payment_proofs_payment_number ON payment_proofs(payment_number);

-- Update RLS policies if needed (the existing policies should cover this new column)
