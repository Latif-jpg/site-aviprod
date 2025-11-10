-- Add sponsored fields to marketplace_products table
ALTER TABLE marketplace_products
ADD COLUMN is_sponsored boolean DEFAULT false,
ADD COLUMN boost_level integer DEFAULT 0,
ADD COLUMN sponsor_end_date timestamptz;