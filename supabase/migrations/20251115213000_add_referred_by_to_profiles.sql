-- Migration: Add referral code field to profiles table
-- Date: 2025-11-15
-- Description: Add field to store referral code used during signup

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by_code TEXT;
-- Note: referred_by field already exists in the table