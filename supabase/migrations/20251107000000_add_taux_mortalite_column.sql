-- Migration: Add taux_mortalite column to lots table
-- Date: 2025-11-07
-- Description: Add a computed column for automatic mortality rate calculation

-- Add the taux_mortalite column as a generated column
ALTER TABLE lots
ADD COLUMN taux_mortalite DECIMAL(5,2) GENERATED ALWAYS AS (
  CASE
    WHEN initial_quantity > 0 THEN
      ROUND((mortality::DECIMAL / initial_quantity::DECIMAL) * 100, 2)
    ELSE 0
  END
) STORED;

-- Add comment to the column
COMMENT ON COLUMN lots.taux_mortalite IS 'Taux de mortalité calculé automatiquement en pourcentage (mortality/initial_quantity * 100)';

-- Create an index on taux_mortalite for better query performance
CREATE INDEX idx_lots_taux_mortalite ON lots(taux_mortalite);

-- Update existing records to populate the new column
-- This is done automatically by the GENERATED ALWAYS AS clause, but we can verify
UPDATE lots SET mortality = mortality WHERE mortality IS NOT NULL;